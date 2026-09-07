import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { db } from '@/lib/db';
import { getClientIp, sha256 } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';
import { sendLoginCode } from '@/lib/mailer';
import { signAdminSession, adminCookieOptions, ADMIN_COOKIE_NAME } from '@/lib/auth';

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  totp: z.string().optional().or(z.literal('')),
});

// Connexion admin : mot de passe + 2FA (TOTP si configuré, sinon code e-mail).
export async function POST(req) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { email, password, totp } = parsed.data;

  // Anti brute-force : 8 tentatives / 15 min par IP
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Trop de tentatives, réessayez dans 15 minutes.' }, { status: 429 });
  }

  const admin = await db.admin.findUnique({ where: { email } });

  // Comparaison toujours exécutée pour éviter les attaques temporelles
  const hash = admin?.passwordHash || '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7VTgxjrpU8k95Lxvtqk1PGCvXnLBDF6';
  const valid = await bcrypt.compare(password, hash);
  if (!admin || !valid) {
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
  }
  if (!admin.emailVerifiedAt) {
    return NextResponse.json({ error: 'Compte non validé : vérifiez vos e-mails.' }, { status: 403 });
  }

  // 2FA : si un secret TOTP existe, elle n'est exigée que si activée sur l'utilisateur
  // ET l'entreprise (une désactivation par le super admin la supprime entièrement,
  // y compris le repli par code e-mail). Sans secret TOTP -> 2FA e-mail historique.
  const company = admin.companyId ? await db.company.findUnique({ where: { id: admin.companyId } }) : null;
  const twoFactorActive = admin.totpSecret
    ? (admin.twoFactorEnabled !== false && company?.twoFactorEnabled !== false)
    : true;
  if (twoFactorActive) {
    if (!totp) return NextResponse.json({ twoFactor: 'totp' }, { status: 401 });
    if (!authenticator.verify({ token: totp, secret: admin.totpSecret })) {
      return NextResponse.json({ error: 'Code TOTP invalide.', twoFactor: 'totp' }, { status: 401 });
    }
  } else {
    // 2FA par code e-mail (à moins qu'elle soit explicitement désactivée)
    if (!totp) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await db.emailToken.create({
        data: {
          adminId: admin.id,
          email,
          tokenHash: sha256(code),
          type: 'LOGIN_2FA',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendLoginCode(email, code).catch((e) => console.error(e));
      return NextResponse.json({ twoFactor: 'email', message: 'Code envoyé par e-mail.' }, { status: 401 });
    }
    const row = await db.emailToken.findFirst({
      where: { adminId: admin.id, type: 'LOGIN_2FA', usedAt: null, expiresAt: { gt: new Date() }, tokenHash: sha256(totp.toUpperCase()) },
    });
    if (!row) return NextResponse.json({ error: 'Code invalide ou expiré.', twoFactor: 'email' }, { status: 401 });
    await db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  }

  const jwt = await signAdminSession({
    sub: admin.id,
    email: admin.email,
    role: admin.role || 'admin',
    companyId: admin.companyId || null,
    companySlug: company?.slug || null,
  });
  await db.loginSession.create({
    data: { adminId: admin.id, ip: sha256(ip).slice(0, 16), userAgent: (req.headers.get('user-agent') || '').slice(0, 255) },
  });

  const res = NextResponse.json({ ok: true, role: admin.role || 'admin', companySlug: company?.slug || null });
  res.cookies.set(ADMIN_COOKIE_NAME, jwt, adminCookieOptions());
  return res;
}
