
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Préfixes système qui ne doivent pas être réécrits.
const RESERVED_PREFIXES = new Set([
  'admin',
  'super',
]);

// Routes publiques exactes.
// Elles passent avant la détection du slug d'entreprise.
const PUBLIC_API_ROUTES = new Set([
  '/api/raffle/register',
]);

// N'ajouter ici que les préfixes dont TOUTES les routes
// sont publiques. Privilégier les chemins exacts ci-dessus.
const PUBLIC_API_PREFIXES = new Set([
  // Exemple : 'webhooks'
]);

function getJwtSecret() {
  const value = process.env.JWT_SECRET;

  // Aucun secret de secours connu en production.
  if (!value) {
    return null;
  }

  return new TextEncoder().encode(value);
}

async function getSession(req) {
  const token = req.cookies.get('admin_session')?.value;

  if (!token) {
    return null;
  }

  const jwtSecret = getJwtSecret();

  if (!jwtSecret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      algorithms: ['HS256'],
    });

    const allowedRoles = [
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'admin',
    ];

    if (
      typeof payload.role !== 'string' ||
      !allowedRoles.includes(payload.role)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1. Laisser passer les routes publiques exactes.
  // Exemple : /api/raffle/register
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // 2. Laisser passer les préfixes explicitement publics.
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[1];

  if (
    segments[0] === 'api' &&
    firstSegment &&
    PUBLIC_API_PREFIXES.has(firstSegment)
  ) {
    return NextResponse.next();
  }

  // 3. Détecter les routes de la forme :
  // /api/{companySlug}/{reste...}
  const match = pathname.match(
    /^\/api\/([a-z0-9-]+)\/(.+)$/
  );

  if (!match) {
    return NextResponse.next();
  }

  const [, slug, rest] = match;

  // 4. Les routes système passent sans réécriture.
  if (RESERVED_PREFIXES.has(slug)) {
    return NextResponse.next();
  }

  // 5. Vérifier la session pour les routes d'entreprise.
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 401 }
    );
  }

  const isSuperAdmin =
    session.role === 'SUPER_ADMIN' ||
    session.role === 'admin';

  const isImpersonating = Boolean(session.impersonatedBy);

  // 6. Vérifier le slug de l'entreprise dans la session.
  // Les sessions sans companySlug restent compatibles :
  // les handlers doivent alors vérifier le companyId en base.
  if (
    (!isSuperAdmin || isImpersonating) &&
    typeof session.companySlug === 'string' &&
    session.companySlug !== slug
  ) {
    return NextResponse.json(
      {
        error:
          "Accès interdit : cette URL ne correspond pas à votre entreprise.",
      },
      { status: 403 }
    );
  }

  // 7. Réécrire vers les handlers existants.
  // Le slug est transmis dans un header interne à la requête.
  const headers = new Headers(req.headers);
  headers.set('x-company-slug', slug);

  const url = req.nextUrl.clone();
  url.pathname = `/api/admin/${rest}`;

  return NextResponse.rewrite(url, {
    request: { headers },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};