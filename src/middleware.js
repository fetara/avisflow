import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Middleware Edge :
// 1. /api/{companySlug}/... -> réécrit vers /api/admin/... APRÈS validation que
//    l'utilisateur authentifié appartient bien à l'entreprise du slug.
//    Le slug ne suffit JAMAIS : sans session valide => 401, mauvaise entreprise => 403.
//    Le scopage final des données reste assuré dans chaque handler (session -> companyId).
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

async function getSession(req) {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'admin'].includes(payload.role) ? payload : null;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Format attendu : /api/{slug}/{reste...} — les préfixes système passent tels quels
  const RESERVED = ['admin', 'super'];
  const m = pathname.match(/^\/api\/([a-z0-9-]+)\/(.+)$/);
  if (!m || RESERVED.includes(m[1])) return NextResponse.next();
  const [, slug, rest] = m;

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const isSuper = session.role === 'SUPER_ADMIN' || session.role === 'admin';
  // Un COMPANY_ADMIN (impersonation incluse) ne peut passer que par le slug de SA entreprise.
  if (!isSuper || session.impersonatedBy) {
    if (session.companySlug !== slug) {
      return NextResponse.json(
        { error: 'Accès interdit : cette URL ne correspond pas à votre entreprise.' },
        { status: 403 }
      );
    }
  }
  // Le super admin passe pour tous les slugs (sélection ou impersonation).

  // Réécriture transparente vers les handlers existants scopés par session.
  // Le slug voyage dans un header : permet aux handlers (ex. réglages) de résoudre
  // l'entreprise visitée quand c'est le SUPER ADMIN qui navigue dans un espace.
  const headers = new Headers(req.headers);
  headers.set('x-company-slug', slug);
  const url = req.nextUrl.clone();
  url.pathname = `/api/admin/${rest}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ['/api/:path*'],
};
