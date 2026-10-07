import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/admin-guard';
import { getAppUrl } from '@/lib/db';

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

  const APP_URL = (await getAppUrl()) || new URL(req.url).origin;
  // ?game=roulette|tirage -> QR ciblé sur le jeu demandé (deux écrans en boutique)
  const game = new URL(req.url).searchParams.get('game');
  const suffix = game === 'roulette' ? '/roulette' : game === 'tirage' ? '/tirage' : '';
  const url = `${APP_URL}/${slug}/play${suffix}`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 600, margin: 2 });
  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-jeu-${slug}.png"`,
    },
  });
}
