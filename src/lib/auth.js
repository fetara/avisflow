import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'admin_session';
const PLAYER_COOKIE = 'player_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export const ADMIN_COOKIE_NAME = ADMIN_COOKIE;
export const PLAYER_COOKIE_NAME = PLAYER_COOKIE;

export async function signAdminSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function signPlayerSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const store = cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.role === 'admin' ? payload : null;
}

export async function getPlayerSession() {
  const store = cookies();
  const token = store.get(PLAYER_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 3600,
  };
}

export function playerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 3600,
  };
}
