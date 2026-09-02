import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/utils';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { slugify } from '@/lib/utils';

// Inscription libre (essai gratuit) : crée l'entreprise + son compte admin.
// Anti-abus : 3 créations / heure / IP. Les comptes créés ici sont COMPANY_ADMIN,
// jamais SUPER_ADMIN — le super admin ne peut être créé que par le seed.
const schema = z.object({
  companyName: z.string().trim().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

export async function POST(req) {
  const ip = getClientIp(req);
  if (!rateLimit(`inscription:${ip}`, 3, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Trop de créations depuis cette adresse, réessayez dans une heure.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Nom d’entreprise, e-mail valide et mot de passe de 8 caractères minimum requis.' }, { status: 400 });
  }
  const { companyName, email, password } = parsed.data;

  if (await db.admin.findUnique({ where: { email } })) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet e-mail.' }, { status: 409 });
  }

  // Slug unique généré depuis le nom : "Boulangerie Martin" -> boulangerie-martin
  let slug = slugify(companyName);
  if (!slug) return NextResponse.json({ error: 'Nom d’entreprise invalide.' }, { status: 400 });
  if (await db.company.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const company = await db.company.create({
    data: {
      name: companyName,
      slug,
      admins: {
        create: {
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: 'COMPANY_ADMIN',
          permissions: JSON.stringify(ALL_PERMISSIONS),
          // Essai gratuit : accès immédiat, sans validation e-mail préalable
          emailVerifiedAt: new Date(),
        },
      },
    },
  });

  await db.auditLog.create({
    data: { action: 'company.self_create', entity: 'Company', entityId: company.id },
  }).catch(() => {});

  return NextResponse.json({ ok: true, slug: company.slug, name: company.name });
}
