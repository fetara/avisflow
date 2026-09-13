import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req) {
  // Redirection RELATIVE à la requête (jamais localhost) : fonctionne sur mobile/Vercel
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}

export async function GET(req) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
