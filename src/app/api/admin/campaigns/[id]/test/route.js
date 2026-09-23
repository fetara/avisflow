import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';
import { processCampaignBatch } from '@/lib/email-campaigns';

const schema = z.object({ to: z.string().email() });

// Envoi d'un e-mail de TEST de la campagne à l'adresse choisie (variables rendues
// avec des valeurs d'exemple). N'affecte jamais les vrais destinataires.
export async function POST(req, { params }) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const companyId = await resolveCompanyId(req, guard);
  const campaign = await db.campaign.findFirst({ where: { id, companyId } });
  if (!campaign) return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Adresse de test invalide.' }, { status: 400 });

  const { sendMail } = await import('@/lib/mailer');
  const { getAppUrl } = await import('@/lib/db');
  try {
    const origin = (await getAppUrl()) || new URL(req.url).origin;
    const html = `${campaign.body}<p style="color:#9ca3af;font-size:11px">E-mail de test — campagne « ${campaign.name} »</p>`;
    await sendMail(parsed.data.to, `[TEST] ${campaign.subject}`, html);
    await logAction(guard.admin.id, 'campaign_test_sent', 'Campaign', id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Échec de l’envoi de test : ${String(e.message).slice(0, 200)}` }, { status: 502 });
  }
}
