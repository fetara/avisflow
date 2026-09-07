import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  active: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(), // force/désactive la 2FA pour toute l'entreprise
  permissions: z.array(z.string()).optional(), // matrice de droits du/des COMPANY_ADMIN
  adminPassword: z.string().min(8).max(72).optional(), // réinitialisation du mot de passe entreprise
  newAdminEmail: z.string().email().toLowerCase().optional(),
  newAdminPassword: z.string().min(8).max(72).optional(),
});

async function loadCompany(id) {
  return db.company.findUnique({ where: { id }, include: { admins: true } });
}

// Modifier une entreprise : nom, activation, permissions, mots de passe admin.
export async function PATCH(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const company = await loadCompany(id);
  if (!company) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  const { name, active, permissions, adminPassword, newAdminEmail, newAdminPassword, twoFactorEnabled } = parsed.data;

  if (name) await db.company.update({ where: { id }, data: { name } });
  if (typeof active === 'boolean') await db.company.update({ where: { id }, data: { active } });
  if (typeof twoFactorEnabled === 'boolean') {
    await db.company.update({ where: { id }, data: { twoFactorEnabled } });
    await logAction(guard.admin.id, twoFactorEnabled ? 'company.2fa_enable' : 'company.2fa_disable', 'Company', id);
  }

  // Matrice de droits : appliquée à tous les COMPANY_ADMIN de l'entreprise
  if (permissions) {
    const valid = permissions.filter((k) => ALL_PERMISSIONS.includes(k));
    await db.admin.updateMany({
      where: { companyId: id, role: 'COMPANY_ADMIN' },
      data: { permissions: JSON.stringify(valid) },
    });
  }

  // Réinitialisation du mot de passe du premier admin entreprise
  if (adminPassword) {
    const admin = company.admins.find((a) => a.role === 'COMPANY_ADMIN');
    if (admin) {
      await db.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(adminPassword, 12) } });
    }
  }

  // Ajout d'un compte admin entreprise supplémentaire
  if (newAdminEmail && newAdminPassword) {
    if (await db.admin.findUnique({ where: { email: newAdminEmail } })) {
      return NextResponse.json({ error: 'Un compte avec cet e-mail existe déjà.' }, { status: 409 });
    }
    await db.admin.create({
      data: {
        email: newAdminEmail,
        passwordHash: await bcrypt.hash(newAdminPassword, 12),
        role: 'COMPANY_ADMIN',
        companyId: id,
        permissions: JSON.stringify(company.admins.find((a) => a.role === 'COMPANY_ADMIN')?.permissions || '[]'),
        emailVerifiedAt: new Date(),
      },
    });
  }

  await logAction(guard.admin.id, 'company.update', 'Company', id);
  return NextResponse.json({ ok: true });
}

// Suppression d'une entreprise (cascade : admins, lots, QR, clients, réglages).
export async function DELETE(req, { params }) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const { id } = await params;

  const res = await db.company.delete({ where: { id } }).catch(() => null);
  if (!res) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });
  await logAction(guard.admin.id, 'company.delete', 'Company', id);
  return NextResponse.json({ ok: true });
}
