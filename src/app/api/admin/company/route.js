import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction, logCrossAttempt } from '@/lib/admin-guard';
import { ROLES } from '@/lib/permissions';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  website: z.string().trim().max(200).optional().or(z.literal('')),
});

// Entreprise cible : session entreprise, ou slug visité (super admin en navigation).
async function resolveCompanyId(req, guard) {
  if (guard.role !== ROLES.SUPER_ADMIN || guard.impersonatedBy) return guard.companyId;
  const slug = req.headers.get('x-company-slug');
  if (!slug) return null;
  const company = await db.company.findUnique({ where: { slug }, select: { id: true } });
  return company?.id ?? null;
}

// Fiche entreprise (Réglages -> Entreprise).
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, address: true, phone: true, website: true, slug: true },
  });
  return NextResponse.json({ company });
}

// Modification de la fiche : le companyId vient de la SESSION (jamais du navigateur).
export async function PATCH(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  // Un admin entreprise ne modifie que SA fiche
  if (guard.role !== ROLES.SUPER_ADMIN && guard.companyId !== companyId) {
    await logCrossAttempt(guard.admin.id, 'Company', companyId);
    return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  const { name, address, phone, website } = parsed.data;

  const company = await db.company.update({
    where: { id: companyId },
    data: { name, address: address || null, phone: phone || null, website: website || null },
  });
  await logAction(guard.admin.id, 'company.profile_update', 'Company', companyId);
  return NextResponse.json({ ok: true, company });
}
