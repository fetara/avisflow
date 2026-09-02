import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';

const schema = z.object({
  action: z.enum(['enable', 'disable']),
  password: z.string().min(1),
  totp: z.string().optional().or(z.literal('')),
});

// État 2FA de l'admin connecté (pour l'affichage dans Réglages).
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const company = guard.admin.companyId
    ? await db.company.findUnique({ where: { id: guard.admin.companyId } })
    : null;
  const secretSet = Boolean(guard.admin.totpSecret);
  return NextResponse.json({
    secretSet,
    userEnabled: guard.admin.twoFactorEnabled !== false,
    companyEnabled: company ? company.twoFactorEnabled !== false : true,
    // Effectif : un secret existe ET il est activé chez l'utilisateur ET l'entreprise
    active: secretSet && guard.admin.twoFactorEnabled !== false && (!company || company.twoFactorEnabled !== false),
  });
}

// Désactivation/activation de SA PROPRE 2FA.
// Sécurité : mot de passe obligatoire + code TOTP courant si la 2FA est active.
export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { action, password, totp } = parsed.data;

  const valid = await bcrypt.compare(password, guard.admin.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 403 });

  const company = guard.admin.companyId
    ? await db.company.findUnique({ where: { id: guard.admin.companyId } })
    : null;
  const active = Boolean(guard.admin.totpSecret) && guard.admin.twoFactorEnabled !== false && company?.twoFactorEnabled !== false;

  if (action === 'disable') {
    if (active) {
      if (!totp || !authenticator.verify({ token: totp, secret: guard.admin.totpSecret })) {
        return NextResponse.json({ error: 'Code 2FA actuel requis pour désactiver la 2FA.', needTotp: true }, { status: 403 });
      }
    }
    await db.admin.update({ where: { id: guard.admin.id }, data: { twoFactorEnabled: false } });
    await logAction(guard.admin.id, '2fa.disable', 'Admin', guard.admin.id);
    return NextResponse.json({ ok: true, twoFactorEnabled: false });
  }

  // Réactivation : le secret est conservé (ou l'admin en génère un via son profil TOTP)
  await db.admin.update({ where: { id: guard.admin.id }, data: { twoFactorEnabled: true } });
  await logAction(guard.admin.id, '2fa.enable', 'Admin', guard.admin.id);
  return NextResponse.json({ ok: true, twoFactorEnabled: true });
}
