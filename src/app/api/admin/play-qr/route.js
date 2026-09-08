import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/admin-guard';

// QR code PNG menant à la page de jeu de l'entreprise : /{slug}/play
export async function GET(req) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;

  // Entreprise cible : celle de la session, sinon le slug visité (header du middleware)
  let companyId = guard.companyId;
  const slugHeader = req.headers.get('x-company-slug');
  let slug = null;
  if (companyId) {
    const company = await db.company.findUnique({ where: { id: companyId }, select: { slug: true } });
    slug = company?.slug;
  } else if (slugHeader) {
    const company = await db.company.findUnique({ where: { slug: slugHeader }, select: { slug: true } });
    slug = company?.slug || null;
  }
  if (!slug) return new NextResponse('Entreprise introuvable', { status: 404 });

  const APP_URL = process.env.APP_URL || new URL(req.url).origin;
  const url = `${APP_URL}/${slug}/play`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 600, margin: 2 });
  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-jeu-${slug}.png"`,
    },
  });
}
