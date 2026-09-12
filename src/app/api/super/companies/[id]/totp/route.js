import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { getAppName } from '@/lib/db';



// URL otpauth:// lisible par Google Authenticator & co.
async function otpauthUrl(email, secret) {
  return authenticator.keyuri(email, await getAppName(), secret);
}

// Premier compte COMPANY_ADMIN de l'entreprise (porte le secret TOTP).
async function companyAdmin(companyId) {
  return db.admin.findFirst({ where: { companyId, role: 'COMPANY_ADMIN' } });
}

// GET : QR code PNG du secret TOTP de l'entreprise (?json=1 pour l'URL et le secret).
export async function GET(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const admin = await companyAdmin(id);
  if (!admin?.totpSecret) {
    return NextResponse.json({ error: 'Aucun secret TOTP pour cette entreprise. Utilisez POST pour en générer un.' }, { status: 404 });
  }

  const url = await otpauthUrl(admin.email, admin.totpSecret);
  if (new URL(req.url).searchParams.get('json') === '1') {
    return NextResponse.json({ otpauthUrl: url, secret: admin.totpSecret, email: admin.email });
  }

  const png = await QRCode.toBuffer(url, { type: 'png', width: 320, margin: 2 });
  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="totp-${id}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}

// POST : (re)génère le secret TOTP de l'entreprise (invalide les appareils configurés).
export async function POST(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const admin = await companyAdmin(id);
  if (!admin) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const secret = authenticator.generateSecret();
  await db.admin.update({ where: { id: admin.id }, data: { totpSecret: secret } });
  await logAction(guard.admin.id, 'company.totp_regen', 'Company', id);

  return NextResponse.json({ ok: true, otpauthUrl: await otpauthUrl(admin.email, secret), secret });
}
