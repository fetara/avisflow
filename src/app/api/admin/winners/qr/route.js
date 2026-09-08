import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { requirePermission, companyScope } from '@/lib/admin-guard';

// QR code PNG d'un code cadeau (validation en caisse) : ?code=XXXX
export async function GET(req) {
  const guard = await requirePermission(req, 'view_customers');
  if (guard.error) return guard.error;

  const code = new URL(req.url).searchParams.get('code') || '';
  if (!code) return new Response('code requis', { status: 400 });

  // Isolation : le code doit appartenir à un gain de l'entreprise (ou tout, super admin)
  const spin = await db.spin.findFirst({
    where: { giftCode: code.toUpperCase(), customer: { companyId: companyScope(guard) } },
  });
  if (!spin) return new Response('Code introuvable', { status: 404 });

  const png = await QRCode.toBuffer(code.toUpperCase(), { type: 'png', width: 280, margin: 2 });
  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="gain-${code}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
