import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';
import { canSendSms, resolveSegmentForSms } from '@/lib/sms-service';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1000),
  segment: z.enum(['all', 'reviewed', 'not_reviewed', 'won', 'inactive30']).default('all'),
  confirm: z.boolean().default(false),
});

// Campagne SMS de masse : crée une Campaign channel='sms' avec les destinataires
// consentants, puis l'envoi est traité par lots (comme les campagnes e-mail).
export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  const { name, body, segment } = parsed.data;

  // Garde-fou : confirmation explicite du nombre de destinataires
  const preview = await resolveSegmentForSms(companyId, segment);
  if (!parsed.confirm) {
    return NextResponse.json({ needConfirm: true, recipients: preview.length });
  }

  const gate = await canSendSms(companyId);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  if (preview.length === 0) {
    return NextResponse.json({ error: 'Aucun destinataire (clients avec consentement SMS uniquement).' }, { status: 400 });
  }

  const campaign = await db.campaign.create({
    data: { companyId, name, subject: 'SMS', body, segment, channel: 'sms', status: 'SCHEDULED', scheduledAt: new Date() },
  });
  // Destinataires : téléphone stocké dans le champ email du recipient (contact générique)
  await db.campaignRecipient.createMany({
    data: preview.map((c) => ({ campaignId: campaign.id, customerId: c.id, email: c.phone })),
    skipDuplicates: true,
  });
  await logAction(guard.admin.id, 'SMS_CAMPAIGN_CREATED', 'Campaign', campaign.id);

  return NextResponse.json({ ok: true, campaignId: campaign.id, recipients: preview.length });
}
