import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashIp, getClientIp, randomToken } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

// URL publique lisible d'un QR code : /p/{companySlug}/{qrSlug}
// -> traque le scan puis redirige vers la page de jeu de l'entreprise.
// Le QR est systématiquement cherché DANS le contexte de l'entreprise du slug.
export async function GET(req, { params }) {
  const { companySlug, qrSlug } = await params;
  const ip = getClientIp(req);

  // Anti-bot : 30 scans / 5 min par IP
  const rl = rateLimit(`scan:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.ok) return NextResponse.redirect(new URL('/operation-terminee', req.url), 302);

  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.active) {
    return NextResponse.redirect(new URL('/operation-terminee', req.url), 302);
  }

  // Recherche SCOPÉE à l'entreprise : jamais findUnique sur le slug seul
  const qr = await db.qrCode.findFirst({
    where: { slug: qrSlug, companyId: company.id },
  });

  const now = new Date();
  if (!qr || !qr.active || (qr.expiresAt && qr.expiresAt < now)) {
    return NextResponse.redirect(new URL('/operation-terminee', req.url), 302);
  }

  await db.qrScan.create({
    data: {
      qrCodeId: qr.id,
      sessionId: randomToken(16),
      userAgent: (req.headers.get('user-agent') || '').slice(0, 255),
      ipHash: hashIp(ip),
    },
  });

  const dest = new URL(qr.destination || `/${company.slug}/play`, req.url);
  dest.searchParams.set('src', qr.slug);
  const res = NextResponse.redirect(dest, 302);
  res.cookies.set('qr_source', qr.slug, { httpOnly: false, sameSite: 'lax', maxAge: 24 * 3600, path: '/' });
  return res;
}
