import { db } from '@/lib/db';
import { canSendSms } from '@/lib/sms';
import { renderTemplate } from '@/lib/email-campaigns';
import { sendSmsOvh, getSmsConfig } from '@/lib/sms';

// Résout un segment pour les SMS : consentement SMS actif, non désinscrit,
// avec numéro de téléphone, non anonymisé. Scopé à l'entreprise.
export async function resolveSegmentForSms(companyId, segment) {
  const now = Date.now();
  const where = {
    companyId,
    smsConsentAt: { not: null },
    smsOptedOutAt: null,
    anonymizedAt: null,
    phone: { not: null },
    emailVerifiedAt: { not: null },
  };
  if (segment === 'reviewed') where.reviews = { some: {} };
  if (segment === 'not_reviewed') where.reviews = { none: {} };
  if (segment === 'won') where.spins = { some: {} };
  if (segment === 'inactive30') {
    where.spins = { none: { createdAt: { gte: new Date(now - 30 * 864e5) } } };
    where.createdAt = { lt: new Date(now - 30 * 864e5) };
  }
  return db.customer.findMany({
    where,
    select: { id: true, phone: true, firstName: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

// Traite UN lot (25 max) d'une campagne SMS — idempotent, appelé par le cron
// ou après la création. Vérifie activation/quotas pour chaque envoi.
export async function processSmsCampaignBatch(campaignId, batchSize = 25) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { company: { select: { name: true } } },
  });
  if (!campaign || campaign.channel !== 'sms') return { done: true, processed: 0 };
  if (campaign.status === 'SENT' || campaign.status === 'CANCELLED') return { done: true, processed: 0 };

  if (campaign.status === 'SCHEDULED') {
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) return { done: false, processed: 0, remaining: -1 };
    await db.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING' } });
  } else if (campaign.status !== 'SENDING') {
    return { done: true, processed: 0 };
  }

  const gate = await canSendSms(campaign.companyId);
  const cfg = gate.ok ? gate.cfg : null;

  const batch = await db.campaignRecipient.findMany({
    where: { campaignId, status: 'PENDING' },
    include: { customer: { select: { firstName: true, smsOptedOutAt: true } } },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  for (const r of batch) {
    try {
      if (!gate.ok) throw new Error(gate.reason);
      if (r.customer?.smsOptedOutAt) throw new Error('Désinscrit');
      const vars = {
        prenom: r.customer?.firstName || '',
        nom: '',
        entreprise: campaign.company?.name || '',
        campaignName: campaign.name,
      };
      await sendSmsOvh(cfg, r.email, renderTemplate(campaign.body, vars));
      await db.campaignRecipient.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (e) {
      await db.campaignRecipient.update({
        where: { id: r.id },
        data: { status: 'FAILED', error: String(e.message).slice(0, 200) },
      });
    }
  }

  const remaining = await db.campaignRecipient.count({ where: { campaignId, status: 'PENDING' } });
  const sent = await db.campaignRecipient.count({ where: { campaignId, status: 'SENT' } });
  const failed = await db.campaignRecipient.count({ where: { campaignId, status: 'FAILED' } });
  const done = remaining === 0;
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: done ? 'SENT' : 'SENDING', sentCount: sent, failedCount: failed, sentAt: done ? new Date() : campaign.sentAt },
  });
  return { done, processed: batch.length, remaining };
}

// Cron : traite les campagnes SMS programmées / en cours.
export async function processDueSmsCampaigns() {
  const due = await db.campaign.findMany({
    where: {
      channel: 'sms',
      status: { in: ['SCHEDULED', 'SENDING'] },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    select: { id: true },
    take: 10,
  });
  for (const c of due) await processSmsCampaignBatch(c.id, 25);
  return due.length;
}
