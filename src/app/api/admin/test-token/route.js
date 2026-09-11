import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { requireAdmin, ROLES } from '@/lib/admin-guard';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

// Token de TEST signé (1 h) : autorise un admin à jouer à la roue de SON entreprise
// sans créer de client, de participation, ni consommer de stock.
// Le token est vérifié côté serveur à chaque tirage test — impossible à forger
// depuis le navigateur (pas de simple isAdmin=true en paramètre).
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  // Entreprise ciblée : session entreprise, ou slug visité pour un super admin
  let companyId = guard.companyId;
  const slug = req.nextUrl.searchParams.get('companySlug') || req.headers.get('x-company-slug');
  if (!companyId && slug) {
    const company = await db.company.findUnique({ where: { slug }, select: { id: true } });
    companyId = company?.id ?? null;
  }
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  // Contrôle d'accès : l'admin doit appartenir à l'entreprise (le super admin passe)
  if (guard.role !== ROLES.SUPER_ADMIN && guard.companyId !== companyId) {
    return NextResponse.json({ error: 'Accès interdit à cette entreprise.' }, { status: 403 });
  }

  const token = await new SignJWT({ test: true, adminId: guard.admin.id, companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret());

  return NextResponse.json({ token, expiresIn: 3600 });
}
