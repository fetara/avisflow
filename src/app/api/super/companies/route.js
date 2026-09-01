import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { slugify } from '@/lib/utils';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  adminEmail: z.string().email().toLowerCase(),
  adminPassword: z.string().min(8).max(72),
});

// Liste des entreprises avec compteurs et comptes admin rattachés.
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const companies = await db.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      admins: { select: { id: true, email: true, emailVerifiedAt: true, permissions: true, role: true } },
      _count: { select: { qrCodes: true, prizes: true, customers: true } },
    },
  });

  // Parties jouées par entreprise (via le client rattaché)
  const spins = await db.spin.findMany({ select: { customer: { select: { companyId: true } } } });
  const spinsPerCompany = {};
  for (const s of spins) {
    const cid = s.customer.companyId || 'null';
    spinsPerCompany[cid] = (spinsPerCompany[cid] || 0) + 1;
  }

  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      createdAt: c.createdAt,
      admins: c.admins.filter((a) => a.role === 'COMPANY_ADMIN'),
      counts: {
        qrCodes: c._count.qrCodes,
        prizes: c._count.prizes,
        customers: c._count.customers,
        spins: spinsPerCompany[c.id] || 0,
      },
    })),
    availablePermissions: ALL_PERMISSIONS,
  });
}

// Création d'une entreprise + son compte COMPANY_ADMIN.
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides (mot de passe : 8 caractères min).' }, { status: 400 });
  const { name, adminEmail, adminPassword } = parsed.data;

  let slug = slugify(name);
  if (await db.company.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  if (await db.admin.findUnique({ where: { email: adminEmail } })) {
    return NextResponse.json({ error: 'Un compte avec cet e-mail existe déjà.' }, { status: 409 });
  }

  const company = await db.company.create({
    data: {
      name,
      slug,
      admins: {
        create: {
          email: adminEmail,
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: 'COMPANY_ADMIN',
          permissions: JSON.stringify(ALL_PERMISSIONS),
          emailVerifiedAt: new Date(),
        },
      },
    },
  });
  await logAction(guard.admin.id, 'company.create', 'Company', company.id);
  return NextResponse.json({ ok: true, company });
}
