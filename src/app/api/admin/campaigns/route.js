import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';
import { SEGMENTS, resolveSegment, seedRecipients, processCampaignBatch } from '@/lib/email-campaigns';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(20000),
  segment: z.enum(['all', 'reviewed', 'not_reviewed', 'won', 'inactive30']),
  scheduledAt: z.string().optional().nullable(),
});

// Liste des campagnes de l'entreprise.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ campaigns: [], segments: SEGMENTS });

  const campaigns = await db.campaign.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ campaigns, segments: SEGMENTS });
}

// Création d'une campagne : prépare les destinataires du segment puis
// statut SCHEDULED (envoi maintenant -> scheduledAt = maintenant, traitement par lots).
export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données de campagne invalides.' }, { status: 400 });
  const { name, subject, body, segment, scheduledAt } = parsed.data;

  // Nombre de destinataires pour confirmation côté UI
  const recipients = await resolveSegment(companyId, segment);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun destinataire dans ce segment (clients avec consentement e-mail uniquement).' }, { status: 400 });
  }

  const campaign = await db.campaign.create({
    data: {
      companyId,
      name,
      subject,
      body,
      segment,
      status: 'SCHEDULED',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    },
  });
  await seedRecipients(campaign.id, companyId, segment);
  await logAction(guard.admin.id, 'CAMPAIGN_CREATED', 'Campaign', campaign.id);

  // Hobby (pas de cron 5 min) : on traite jusqu'à 10 lots (~250 e-mails) immédiatement.
  // Au-delà, le cron quotidien ou un déclencheur externe termine l'envoi.
  let sentNow = 0;
  for (let i = 0; i < 10; i++) {
    const r = await processCampaignBatch(campaign.id, 25);
    sentNow += r.processed;
    if (r.done) break;
  }
  const remaining = await db.campaignRecipient.count({ where: { campaignId: campaign.id, status: 'PENDING' } });

  return NextResponse.json({
    ok: true,
    campaign,
    recipients: recipients.length,
    sentNow,
    remaining,
    note: remaining > 0
      ? `${sentNow} e-mails envoyés maintenant ; ${remaining} restants seront traités par le cron quotidien ou un déclencheur externe.`
      : `Campaign envoyée (${sentNow} e-mails).`,
  });
}
