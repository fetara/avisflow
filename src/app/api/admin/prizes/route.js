import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission, companyScope, logAction, logCrossAttempt } from '@/lib/admin-guard';

const prizeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  weight: z.number().int().min(0).max(100),
  stock: z.number().int().min(0).nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
  photo: z.string().max(3_000_000).nullable().optional(), // data URL de l'illustration
});

export async function GET(req) {
  const guard = await requirePermission(req, 'manage_prizes');
  if (guard.error) return guard.error;
  const prizes = await db.prize.findMany({
    where: { companyId: companyScope(guard) },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { spins: true } } },
  });
  return NextResponse.json({ prizes });
}

export async function POST(req) {
  const guard = await requirePermission(req, 'manage_prizes');
  if (guard.error) return guard.error;
  const parsed = prizeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Lot invalide.' }, { status: 400 });
  const prize = await db.prize.create({ data: { ...parsed.data, companyId: guard.companyId } });
  await logAction(guard.admin.id, 'prize.create', 'Prize', prize.id);
  return NextResponse.json({ ok: true, prize });
}

export async function PATCH(req) {
  const guard = await requirePermission(req, 'manage_prizes');
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = prizeSchema.extend({ id: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Lot invalide.' }, { status: 400 });
  const { id, ...data } = parsed.data;
  const prize = await db.prize.updateMany({ where: { id, companyId: companyScope(guard) }, data }).catch(() => null);
  if (!prize || prize.count === 0) {
    if (await db.prize.findUnique({ where: { id } })) await logCrossAttempt(guard.admin.id, 'Prize', id);
    return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 });
  }
  await logAction(guard.admin.id, 'prize.update', 'Prize', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const guard = await requirePermission(req, 'manage_prizes');
  if (guard.error) return guard.error;
  const id = new URL(req.url).searchParams.get('id');
  // deleteMany garantit l'isolation : on ne peut supprimer que dans sa propre entreprise
  const res = await db.prize.deleteMany({ where: { id, companyId: companyScope(guard) } }).catch(() => null);
  if (!res || res.count === 0) {
    if (await db.prize.findUnique({ where: { id } })) await logCrossAttempt(guard.admin.id, 'Prize', id);
    return NextResponse.json({ error: 'Lot introuvable ou déjà joué (désactivez-le plutôt).' }, { status: 400 });
  }
  await logAction(guard.admin.id, 'prize.delete', 'Prize', id);
  return NextResponse.json({ ok: true });
}
