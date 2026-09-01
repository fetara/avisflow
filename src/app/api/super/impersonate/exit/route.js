import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signAdminSession, adminCookieOptions, ADMIN_COOKIE_NAME, getAdminSession } from '@/lib/auth';

// Sortie d'impersonation : restitution de la session super admin d'origine.
export async function POST() {
  const session = await getAdminSession();
  if (!session?.impersonatedBy) return NextResponse.json({ error: 'Pas de session d\u2019impersonation.' }, { status: 400 });

  const admin = await db.admin.findUnique({ where: { id: session.impersonatedBy } });
  if (!admin) return NextResponse.json({ error: 'Compte super admin introuvable.' }, { status: 401 });

  const jwt = await signAdminSession({
    sub: admin.id,
    email: admin.email,
    role: admin.role || 'SUPER_ADMIN',
    companyId: admin.companyId || null,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, jwt, adminCookieOptions());
  return res;
}
