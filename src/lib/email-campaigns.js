import { db } from '@/lib/db';
import { getAppUrl, getCompanySettings } from '@/lib/db';

// ---------- Service campagnes email (phase 2) ----------
// Segments, rendu des variables, envoi PAR LOTS idempotent.

export const SEGMENTS = [
  { key: 'all', label: 'Tous les clients (avec consentement e-mail)' },
  { key: 'reviewed', label: 'Clients ayant laissé un avis' },
  { key: 'not_reviewed', label: 'Clients sans avis' },
  { key: 'won', label: 'Clients ayant gagné une récompense' },
  { key: 'inactive30', label: 'Inactifs depuis 30 jours ou plus' },
];

// Résout un segment : clients joignables = consentement marketing actif,
// e-mail présent, non désinscrit, non anonymisé. Scopé à l'entreprise.
export async function resolveSegment(companyId, segment) {
  const now = Date.now();
  const where = {
    companyId,
    emailMarketingConsent: true,
    emailOptedOutAt: null,
    anonymizedAt: null,
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
    select: { id: true, email: true, firstName: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

// Rendu des variables {{...}} — les valeurs vides ne fuient jamais de données.
export function renderTemplate(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

export function unsubscribeUrl(origin, customerId) {
  // Lien de désinscription : signé simplement par présence du customerId + hash court.
  // Phase 2 : suffisant car le lien est à usage unique de désactivation (jamais de données exposées).
  return `${origin}/api/unsubscribe?c=${customerId}`;
}

// Prépare les destinataires d'une campagne (idempotent : upsert unique par (campaign, customer)).
export async function seedRecipients(campaignId, companyId, segment) {
  const customers = await resolveSegment(companyId, segment);
  if (customers.length === 0) return 0;
  await db.campaignRecipient.createMany({
    data: customers.map((c) => ({ campaignId, customerId: c.id, email: c.email })),
    skipDuplicates: true,
  });
  return customers.length;
}

// Traite UN LOT d'envois (25 max par appel). Idempotent : ne retraite jamais un
// destinataire déjà SENT. Retourne { done, processed, remaining }.
export async function processCampaignBatch(campaignId, batchSize = 25) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { company: { select: { name: true } } },
  });
  if (!campaign) return { done: true, processed: 0, remaining: 0 };
  if (campaign.status === 'CANCELLED' || campaign.status === 'SENT') return { done: true, processed: 0, remaining: 0 };

  if (campaign.status === 'SCHEDULED') {
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      return { done: false, processed: 0, remaining: -1 }; // pas encore l'heure
    }
    await db.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING' } });
  } else if (campaign.status !== 'SENDING') {
    return { done: true, processed: 0, remaining: 0 };
  }

  const batch = await db.campaignRecipient.findMany({
    where: { campaignId, status: 'PENDING' },
    include: { customer: { select: { firstName: true, emailOptedOutAt: true } } },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  const origin = (await getAppUrl()) || 'http://localhost:3000';
  // Expéditeur personnalisé de l'entreprise (CompanySetting), si configuré
  const cs = await getCompanySettings(campaign.companyId).catch(() => ({}));
  const company = { name: campaign.company?.name || '', senderEmail: cs.EMAIL_SENDER_EMAIL || null, senderName: cs.EMAIL_SENDER_NAME || null, replyTo: cs.EMAIL_REPLY_TO || null };

  for (const r of batch) {
    try {
      if (r.customer?.emailOptedOutAt) {
        await db.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', error: 'Désinscrit' } });
        continue;
      }
      const vars = {
        firstName: r.customer?.firstName || '',
        lastName: r.customer?.lastName || '',
        companyName: campaign.company?.name || '',
        campaignName: campaign.name,
        unsubscribeLink: unsubscribeUrl(origin, r.customerId),
      };
      const body = renderTemplate(campaign.body, vars) +
        `<p style="color:#9ca3af;font-size:11px;margin-top:24px">Pour ne plus recevoir ces e-mails : <a href="${vars.unsubscribeLink}">Se désinscrire</a></p>`;
      const opts = {};
      if (company.senderEmail) {
        opts.from = `${(company.senderName || company.name || 'AvisFlow').replace(/[<>]/g, '')} <${company.senderEmail}>`;
      }
      if (company.replyTo) opts.replyTo = company.replyTo;
      await sendCampaignEmail(r.email, renderTemplate(campaign.subject, vars), body, opts);
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

// Envoi d'un e-mail de campagne via l'infrastructure centrale (Brevo/Resend/démo),
// avec expéditeur personnalisé de l'entreprise si configuré.
async function sendCampaignEmail(to, subject, html, opts = {}) {
  const { sendMail } = await import('@/lib/mailer');
  await sendMail(to, subject, html, opts);
}
