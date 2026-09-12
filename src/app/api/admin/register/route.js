import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { sendAdminValidation } from '@/lib/mailer';
import { randomToken, sha256, getClientIp } from '@/lib/utils';
import { getAppUrl } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(100),
});

// Auto-inscription DÉSACTIVÉE : les comptes entreprises sont créés par le super admin
// (sinon n'importe qui pourrait créer un compte avec le rôle SUPER_ADMIN par défaut).
export async function POST(req) {
  return NextResponse.json(
    { error: 'Les comptes administrateurs sont créés par le super admin de la plateforme.' },
    { status: 403 }
  );
}

export async function disabled_POST(req) {
  const ip = getClientIp(req);
  if (!rateLimit(`register:${ip}`, 3, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail valide et mot de passe de 10 caractères minimum requis.' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet e-mail.' }, { status: 409 });

  const admin = await db.admin.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12) },
  });

  const token = randomToken(24);
  await db.emailToken.create({
    data: {
      adminId: admin.id,
      email,
      tokenHash: sha256(token),
      type: 'VALIDATE_EMAIL',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  const appUrl = (await getAppUrl()) || new URL(req.url).origin;
  try {
    await sendAdminValidation(email, `${appUrl}/api/admin/verify-email?token=${token}`);
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ ok: true, message: 'Compte créé. Vérifiez vos e-mails pour valider le compte (24h).' });
}
