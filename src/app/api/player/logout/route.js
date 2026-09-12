import { NextResponse } from 'next/server';
import { PLAYER_COOKIE_NAME } from '@/lib/auth';

// Déconnexion joueur : efface le cookie de session pour permettre de participer
// avec un autre e-mail sur le même navigateur (la règle anti-abus par e-mail
// s'applique toujours côté serveur).
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLAYER_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}

export async function GET(req) {
  const back = new URL(req.url).searchParams.get('back') || '/';
  const res = NextResponse.redirect(new URL(back, req.url), 303);
  res.cookies.set(PLAYER_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
