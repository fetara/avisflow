import { NextResponse } from 'next/server';
import { db, setSetting, getCompanySettings, setCompanySetting } from '@/lib/db';
import { requirePermission } from '@/lib/admin-guard';
import { logAction } from '@/lib/admin-guard';
import { ROLES } from '@/lib/permissions';

// Clés modifiables via l'API. WHEEL_* : apparence de la roue (couleurs, image de fond)
// — valeurs potentiellement volumineuses (data URLs), d'où des limites dédiées.
const ALLOWED_KEYS = [
  'GAME_HEADLINE',
  'GAME_SUB',
  'AUTO_APPROVE_MIN_RATING',
  'GOOGLE_REVIEW_URL',
  'WHEEL_COLORS',
  'WHEEL_BG_IMAGE',
];

const VALUE_LIMITS = {
  default: 500,
  WHEEL_COLORS: 4_000, // tableau JSON de couleurs hex
  WHEEL_BG_IMAGE: 3_000_000, // data URL de l'image de fond
};

// Entreprise cible des réglages :
// - COMPANY_ADMIN (ou impersonation) -> sa propre entreprise (session, jamais le client)
// - SUPER_ADMIN visitant /{slug}/reglages -> l'entreprise du slug (header posé par le middleware)
async function resolveCompanyId(req, guard) {
  if (guard.role !== ROLES.SUPER_ADMIN || guard.impersonatedBy) return guard.companyId;
  const slug = req.headers.get('x-company-slug');
  if (!slug) return null;
  const company = await db.company.findUnique({ where: { slug }, select: { id: true } });
  return company?.id ?? null;
}

export async function GET(req) {
  const guard = await requirePermission(req, 'configure_wheel');
  if (guard.error) return guard.error;

  const companyId = await resolveCompanyId(req, guard);
  // Sans entreprise résolue (super admin hors espace) : réglages globaux plateforme
  if (!companyId) {
    const rows = await db.setting.findMany();
    return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])), global: true });
  }
  const settings = await getCompanySettings(companyId);
  return NextResponse.json({ settings, global: false });
}

export async function PATCH(req) {
  const guard = await requirePermission(req, 'configure_wheel');
  if (guard.error) return guard.error;

  const companyId = await resolveCompanyId(req, guard);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key) || typeof value !== 'string') continue;
    const limit = VALUE_LIMITS[key] ?? VALUE_LIMITS.default;
    const safe = value.slice(0, limit);
    if (companyId) await setCompanySetting(companyId, key, safe);
    else await setSetting(key, safe);
  }
  await logAction(guard.admin.id, 'settings.update', 'Setting', companyId || 'global');
  return NextResponse.json({ ok: true });
}
