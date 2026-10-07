import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';

// Bons de réduction : liste.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ coupons: [] });

  const coupons = await db.coupon.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ coupons });
}

// Générer un bon : code unique AVIS-XXXXXX, valeur (% ou €), expiration, quota.
const genSchema = z.object({
  kind: z.enum(['percent', 'amount']).default('percent'),
  value: z.number().positive(),
  expiresAt: z.string().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
});

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = genSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Valeur invalide.' }, { status: 400 });
  const d = parsed.data;

  let code;
  do { code = `AVIS-${randomBytes(3).toString('hex').toUpperCase()}`; }
  while (await db.coupon.findUnique({ where: { code } }));

  const coupon = await db.coupon.create({
    data: {
      companyId,
      code,
      kind: d.kind,
      value: d.value,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      maxUses: d.maxUses || null,
    },
  });
  await logAction(guard.admin.id, 'coupon_created', 'Coupon', coupon.id);
  return NextResponse.json({ ok: true, coupon });
}

// Valider / marquer utilisé (caisse) : PATCH { code } -> incrémente si valide.
const patchSchema = z.object({ code: z.string().trim().min(4) });

export async function PATCH(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Code requis.' }, { status: 400 });
  const code = parsed.data.code.toUpperCase();

  const coupon = await db.coupon.findFirst({ where: { code, companyId } });
  if (!coupon || !coupon.active) return NextResponse.json({ error: 'Code inconnu.' }, { status: 404 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: 'Code expiré.' }, { status: 400 });
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ error: 'Quota d’utilisation atteint.' }, { status: 400 });

  const updated = await db.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });
  await logAction(guard.admin.id, 'coupon_used', 'Coupon', coupon.id);
  return NextResponse.json({
    ok: true,
    coupon: updated,
    remaining: updated.maxUses != null ? updated.maxUses - updated.usedCount : null,
  });
}
