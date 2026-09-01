import { NextResponse } from 'next/server';
import { db, setSetting, getCompanySettings, setCompanySetting } from '@/lib/db';
import { requirePermission } from '@/lib/admin-guard';
import { ROLES } from '@/lib/permissions';
import { logAction } from '@/lib/admin-guard';

const ALLOWED_KEYS = [
  'GAME_HEADLINE',
  'GAME_SUB',
  'AUTO_APPROVE_MIN_RATING',
  'GOOGLE_REVIEW_URL',
];

export async function GET(req) {
  const guard = await requirePermission(req, 'configure_wheel');
  if (guard.error) return guard.error;

  // Super admin : réglages globaux de la plateforme ; entreprise : ses propres réglages
  if (guard.role === ROLES.SUPER_ADMIN && !guard.impersonatedBy) {
    const rows = await db.setting.findMany();
    return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])), global: true });
  }
  const settings = await getCompanySettings(guard.companyId);
  return NextResponse.json({ settings });
}

export async function PATCH(req) {
  const guard = await requirePermission(req, 'configure_wheel');
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key) || typeof value !== 'string') continue;
    if (guard.role === ROLES.SUPER_ADMIN && !guard.impersonatedBy) {
      await setSetting(key, value.slice(0, 500));
    } else {
      await setCompanySetting(guard.companyId, key, value.slice(0, 500));
    }
  }
  await logAction(guard.admin.id, 'settings.update', 'Setting', guard.companyId || 'global');
  return NextResponse.json({ ok: true });
}
