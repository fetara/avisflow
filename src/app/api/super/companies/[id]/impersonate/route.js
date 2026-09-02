import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { signAdminSession, adminCookieOptions, ADMIN_COOKIE_NAME } from '@/lib/auth';

// Impersonation : le super admin ouvre une session vue "entreprise" pour du support.
export async function POST(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const company = await db.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const jwt = await signAdminSession({
    sub: guard.admin.id,
    email: guard.admin.email,
    role: 'COMPANY_ADMIN',
    companyId: company.id,
    companySlug: company.slug,
    impersonatedBy: guard.admin.id,
  });
  await logAction(guard.admin.id, 'company.impersonate', 'Company', id);

  const res = NextResponse.json({ ok: true, company: { id: company.id, name: company.name } });
  res.cookies.set(ADMIN_COOKIE_NAME, jwt, adminCookieOptions());
  return res;
}
