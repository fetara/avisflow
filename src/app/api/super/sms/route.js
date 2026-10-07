import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { getSmsConfig, saveSmsConfig, maskConfig, sendSmsOvh } from '@/lib/sms';

// Configuration SMS plateforme (super admin) : clés OVH chiffrées en base.
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const cfg = await getSmsConfig();
  return NextResponse.json({ config: maskConfig(cfg) });
}

const patchSchema = z.object({
  SMS_OVH_APP_KEY: z.string().max(200).optional(),
  SMS_OVH_APP_SECRET: z.string().max(200).optional(),
  SMS_OVH_CONSUMER_KEY: z.string().max(200).optional(),
  SMS_OVH_SERVICE: z.string().max(100).optional(),
  SMS_SENDER: z.string().max(20).optional(),
  SMS_ENABLED: z.enum(['true', 'false']).optional(),
});

export async function PATCH(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  await saveSmsConfig(parsed.data);
  await logAction(guard.admin.id, 'sms_config.update', 'Setting');
  const cfg = await getSmsConfig();
  return NextResponse.json({ ok: true, config: maskConfig(cfg) });
}

// Envoi d'un SMS de test vers un numéro (format international, ex : +336…).
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const to = body?.to;
  if (!to || !/^\+\d{6,15}$/.test(to)) {
    return NextResponse.json({ error: 'Numéro invalide (format international, ex : +33612345678).' }, { status: 400 });
  }
  const cfg = await getSmsConfig();
  if (!cfg.configured) return NextResponse.json({ error: 'Configuration OVH incomplète.' }, { status: 400 });
  try {
    await sendSmsOvh(cfg, to, 'Test SMS AvisFlow — configuration opérationnelle.');
    await logAction(guard.admin.id, 'sms_config.test', 'Setting', to);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Échec OVH : ${String(e.message).slice(0, 200)}` }, { status: 502 });
  }
}
