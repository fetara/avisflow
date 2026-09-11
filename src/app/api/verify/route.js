import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/utils';
import { signPlayerSession, PLAYER_COOKIE_NAME, playerCookieOptions } from '@/lib/auth';

// Clic sur le lien de validation e-mail : crée/valide le client puis redirige vers la roue.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/jeu?err=token', req.url), 302);

  const row = await db.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.type !== 'CUSTOMER_VERIFY') {
    return NextResponse.redirect(new URL('/jeu?err=expired', req.url), 302);
  }

  const data = JSON.parse(row.payload);
  // Recherche PAR entreprise : le même e-mail peut exister chez plusieurs commerces
  const companyId = data.companyId || null;
  let customer = await db.customer.findFirst({ where: { email: data.email, companyId } });
  if (customer) {
    customer = await db.customer.update({
      where: { id: customer.id },
      data: { emailVerifiedAt: new Date() },
    });
  } else {
    customer = await db.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        consentAt: new Date(data.consentAt),
        emailVerifiedAt: new Date(),
        sourceQrId: data.sourceQrId,
        companyId,
      },
    });
  }

  await db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const jwt = await signPlayerSession({ sub: customer.id, email: customer.email });

  // Redirection vers la page de jeu DE l'entreprise (le jeu n'existe plus de façon
  // générique) : /{slug}/play — la session fraîchement posée y affiche la roue.
  let companySlug = null;
  if (customer.companyId) {
    const company = await db.company.findUnique({ where: { id: customer.companyId }, select: { slug: true } });
    companySlug = company?.slug || null;
  }
  const target = companySlug ? `/${companySlug}/play` : '/';
  const res = NextResponse.redirect(new URL(target, req.url), 302);
  res.cookies.set(PLAYER_COOKIE_NAME, jwt, playerCookieOptions());
  return res;
}
