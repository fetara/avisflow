import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';

const actionSchema = z.object({
  id: z.string(),
  action: z.enum(['approve', 'reject', 'hide', 'reply']),
  reply: z.string().max(1000).optional(),
});

// Liste des avis avec filtres (statut, note min, mot-clé, date, source QR).
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const sp = new URL(req.url).searchParams;
  const where = {};
  const status = sp.get('status');
  const minRating = parseInt(sp.get('minRating') || '0', 10);
  const keyword = sp.get('keyword');
  const source = sp.get('source');
  if (status && status !== 'all') where.status = status;
  if (minRating > 0) where.rating = { gte: minRating };
  if (keyword) {
    where.OR = [
      { comment: { contains: keyword, mode: 'insensitive' } },
      { customer: { firstName: { contains: keyword, mode: 'insensitive' } } },
      { customer: { lastName: { contains: keyword, mode: 'insensitive' } } },
    ];
  }
  if (source) where.customer = { ...where.customer, sourceQr: { slug: source } };

  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const reviews = await db.review.findMany({
    where,
    include: { customer: { include: { sourceQr: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 20,
    take: 20,
  });
  const total = await db.review.count({ where });
  return NextResponse.json({ reviews, total, page });
}

// Modération : approuver / rejeter / masquer / répondre.
export async function PATCH(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { id, action, reply } = parsed.data;

  const data = { moderatedBy: guard.admin.id, moderatedAt: new Date() };
  if (action === 'approve') data.status = 'approved';
  if (action === 'reject') data.status = 'rejected';
  if (action === 'hide') data.status = 'hidden';
  if (action === 'reply') data.reply = reply || '';

  const review = await db.review.update({ where: { id }, data }).catch(() => null);
  if (!review) return NextResponse.json({ error: 'Avis introuvable.' }, { status: 404 });
  await logAction(guard.admin.id, `review.${action}`, 'Review', id);
  return NextResponse.json({ ok: true, review });
}
