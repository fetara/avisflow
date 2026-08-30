import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.redirect(new URL('/admin/login', process.env.APP_URL || 'http://localhost:3000'), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}

export async function GET(req) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
