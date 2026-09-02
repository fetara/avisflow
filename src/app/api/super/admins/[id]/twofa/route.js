import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';

const schema = z.object({ enabled: z.boolean() });

// Toggle 2FA par le super admin pour UN utilisateur spécifique (utile au support).
export async function PATCH(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  const admin = await db.admin.findUnique({ where: { id } });
  if (!admin) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });

  await db.admin.update({ where: { id }, data: { twoFactorEnabled: parsed.data.enabled } });
  await logAction(guard.admin.id, parsed.data.enabled ? 'user.2fa_enable' : 'user.2fa_disable', 'Admin', id);
  return NextResponse.json({ ok: true, twoFactorEnabled: parsed.data.enabled });
}
