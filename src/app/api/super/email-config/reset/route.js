import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';

// Réinitialisation de la configuration e-mail : supprime TOUTES les clés MAIL_*
// enregistrées en base. Les variables d'environnement du serveur redeviennent
// immédiatement la source de configuration (RESEND_API_KEY, SMTP_*, DEMO_MODE…).
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const res = await db.setting.deleteMany({ where: { key: { startsWith: 'MAIL_' } } });
  await logAction(guard.admin.id, 'email_config.reset', 'Setting', `${res.count} clés supprimées`);

  return NextResponse.json({ ok: true, deleted: res.count });
}
