import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission, companyScope, logAction, logCrossAttempt } from '@/lib/admin-guard';

// Liste des gagnants (spins) de l'entreprise, avec filtre statut / recherche par code.
export async function GET(req) {
  const guard = await requirePermission(req, 'view_customers');
  if (guard.error) return guard.error;

  const sp = new URL(req.url).searchParams;
  const where = { customer: { companyId: companyScope(guard) } };
  const status = sp.get('status');
  if (status === 'redeemed') where.redeemedAt = { not: null };
  if (status === 'pending') where.redeemedAt = null;
  const code = sp.get('code');
  if (code) where.giftCode = { contains: code.toUpperCase() };

  const winners = await db.spin.findMany({
    where,
    include: {
      prize: { select: { label: true, photo: true } },
      customer: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return NextResponse.json({ winners });
}

const patchSchema = z.object({ id: z.string(), redeemed: z.boolean() });

// Marquer un gain comme remis (ou annuler la remise) — horodaté et attribué.
export async function PATCH(req) {
  const guard = await requirePermission(req, 'view_customers');
  if (guard.error) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { id, redeemed } = parsed.data;

  const res = await db.spin.updateMany({
    where: { id, customer: { companyId: companyScope(guard) } },
    data: redeemed ? { redeemedAt: new Date(), redeemedBy: guard.admin.id } : { redeemedAt: null, redeemedBy: null },
  }).catch(() => null);

  if (!res || res.count === 0) {
    if (await db.spin.findUnique({ where: { id } })) await logCrossAttempt(guard.admin.id, 'Spin', id);
    return NextResponse.json({ error: 'Gain introuvable.' }, { status: 404 });
  }
  await logAction(guard.admin.id, redeemed ? 'spin.redeem' : 'spin.unredeem', 'Spin', id);
  return NextResponse.json({ ok: true });
}
