import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signAdminSession, adminCookieOptions, ADMIN_COOKIE_NAME, getAdminSession } from '@/lib/auth';

// Sortie d'impersonation : restitution de la session super admin d'origine.
// Accessible en GET et POST : appelé depuis le bandeau (form method=post), la réponse
// est TOUJOURS une redirection 303 vers /super (jamais de JSON affiché dans le navigateur).
async function exitHandler(req) {
  const session = await getAdminSession();
  if (!session?.impersonatedBy) {
    // Pas d'impersonation en cours : retour simple à l'espace super admin
    return NextResponse.redirect(new URL('/super', req.url), 303);
  }

  const admin = await db.admin.findUnique({ where: { id: session.impersonatedBy } });
  if (!admin) return NextResponse.redirect(new URL('/admin/login', req.url), 303);

  const jwt = await signAdminSession({
    sub: admin.id,
    email: admin.email,
    role: admin.role || 'SUPER_ADMIN',
    companyId: admin.companyId || null,
    companySlug: null,
  });

  const res = NextResponse.redirect(new URL('/super', req.url), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, jwt, adminCookieOptions());
  return res;
}

export async function POST(req) {
  return exitHandler(req);
}

export async function GET(req) {
  return exitHandler(req);
}
