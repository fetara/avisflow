import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';
import { canSendSms } from '@/lib/sms';
import { renderTemplate } from '@/lib/email-campaigns';
import { processSmsCampaignBatch } from '@/lib/sms-service';

// Envoi UNITAIRE : message individuel à un client depuis sa fiche ( Clients).
// Seuls les clients avec consentement SMS peuvent être ciblés.
const schema = z.object({
  customerId: z.string(),
  body: z.string().trim().min(1).max(1000),
});

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId },
    select: { id: true, phone: true, firstName: true, smsConsentAt: true, smsOptedOutAt: true },
  });
  if (!customer) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
  if (!customer.phone) return NextResponse.json({ error: 'Ce client n’a pas de numéro de téléphone.' }, { status: 400 });
  if (!customer.smsConsentAt || customer.smsOptedOutAt) {
    return NextResponse.json({ error: 'Ce client n’a pas consenti aux SMS (RGPD).' }, { status: 403 });
  }

  const gate = await canSendSms(companyId);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const company = await db.company.findUnique({ where: { id: companyId }, select: { name: true } });
  const body = renderTemplate(parsed.data.body, {
    prenom: customer.firstName || '',
    entreprise: company?.name || '',
  });

  // Campagne mono-destinataire : traçabilité identique aux envois massifs
  const campaign = await db.campaign.create({
    data: {
      companyId, name: `SMS — ${customer.firstName || customer.phone}`,
      subject: 'SMS unitaire', body: parsed.data.body, segment: 'unitaire',
      channel: 'sms', status: 'SCHEDULED', scheduledAt: new Date(),
    },
  });
  await db.campaignRecipient.create({
    data: { campaignId: campaign.id, customerId: customer.id, email: customer.phone },
  });

  // Envoi immédiat (un seul destinataire)
  await processSmsCampaignBatch(campaign.id, 1);
  await logAction(guard.admin.id, 'SMS_SENT', 'Customer', customer.id);

  const done = await db.campaignRecipient.findFirst({ where: { campaignId: campaign.id } });
  if (done?.status === 'FAILED') {
    return NextResponse.json({ error: `Échec d’envoi : ${done.error}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
