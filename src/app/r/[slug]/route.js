import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashIp, getClientIp, randomToken } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

// Redirection dynamique du QR code : /r/{slug} -> destination, avec tracking du scan.
export async function GET(req, { params }) {
  const { slug } = params;
  const ip = getClientIp(req);

  // Rate limiting anti-bot : 30 scans / 5 min par IP
  const rl = rateLimit(`scan:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.redirect(new URL('/operation-terminee', req.url), 302);
  }

  const qr = await db.qrCode.findUnique({ where: { slug } });

  // QR inexistant, désactivé ou expiré -> page "opération terminée" propre
  const now = new Date();
  if (!qr || !qr.active || (qr.expiresAt && qr.expiresAt < now)) {
    return NextResponse.redirect(new URL('/operation-terminee', req.url), 302);
  }

  // Tracking du scan
  await db.qrScan.create({
    data: {
      qrCodeId: qr.id,
      sessionId: randomToken(16),
      userAgent: (req.headers.get('user-agent') || '').slice(0, 255),
      ipHash: hashIp(ip),
    },
  });

  const dest = new URL(qr.destination || '/jeu', req.url);
  dest.searchParams.set('src', qr.slug);
  const res = NextResponse.redirect(dest, 302);
  res.cookies.set('qr_source', qr.slug, {
    httpOnly: false, sameSite: 'lax', maxAge: 24 * 3600, path: '/',
  });
  return res;
}
