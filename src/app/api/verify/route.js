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
  const customer = await db.customer.upsert({
    where: { email: data.email },
    update: { emailVerifiedAt: new Date() },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      consentAt: new Date(data.consentAt),
      emailVerifiedAt: new Date(),
      sourceQrId: data.sourceQrId,
    },
  });

  await db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const jwt = await signPlayerSession({ sub: customer.id, email: customer.email });
  const res = NextResponse.redirect(new URL('/jeu?step=wheel', req.url), 302);
  res.cookies.set(PLAYER_COOKIE_NAME, jwt, playerCookieOptions());
  return res;
}
