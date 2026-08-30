import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

// Tableau de bord : entonnoir global + par QR code + répartition notes + lots distribués.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const [scanCount, customers, verified, spins, reviews, approvedReviews, googleClicks, ratingDist, prizes, qrs] =
    await Promise.all([
      db.qrScan.count(),
      db.customer.count(),
      db.customer.count({ where: { emailVerifiedAt: { not: null } } }),
      db.spin.count(),
      db.review.count(),
      db.review.count({ where: { status: 'approved' } }),
      db.review.count({ where: { googleClick: true } }),
      db.review.groupBy({ by: ['rating'], _count: { _all: true }, orderBy: { rating: 'asc' } }),
      db.prize.findMany({ include: { _count: { select: { spins: true } } }, orderBy: { sortOrder: 'asc' } }),
      db.qrCode.findMany({ include: { _count: { select: { scans: true } } } }),
    ]);

  // Données par QR : clients avec source, parties jouées, avis, clics Google
  const spinRows = await db.spin.findMany({ select: { customer: { select: { sourceQrId: true } } } });
  const reviewRows = await db.review.findMany({
    select: { googleClick: true, customer: { select: { sourceQrId: true } } },
  });

  const qrFunnel = qrs.map((q) => {
    const spinsQ = spinRows.filter((s) => s.customer.sourceQrId === q.id).length;
    const reviewsQ = reviewRows.filter((r) => r.customer.sourceQrId === q.id).length;
    const googleQ = reviewRows.filter((r) => r.googleClick && r.customer.sourceQrId === q.id).length;
    const customersQ = customers === 0 ? 0 : null; // calculé ci-dessous
    return { id: q.id, label: q.label, slug: q.slug, active: q.active, scans: q._count.scans, spins: spinsQ, reviews: reviewsQ, googleClicks: googleQ, customers: customersQ };
  });

  // Nombre de clients par source (un groupBy direct)
  const customersByQr = await db.customer.groupBy({
    by: ['sourceQrId'],
    where: { sourceQrId: { not: null } },
    _count: { _all: true },
  });
  for (const row of customersByQr) {
    const entry = qrFunnel.find((q) => q.id === row.sourceQrId);
    if (entry) entry.customers = row._count._all;
  }

  return NextResponse.json({
    funnel: { scans: scanCount, customers, verified, spins, reviews, approvedReviews, googleClicks },
    ratingDist: ratingDist.map((r) => ({ rating: r.rating, count: r._count._all })),
    prizes: prizes.map((p) => ({ label: p.label, distributed: p._count.spins, stock: p.stock, active: p.active })),
    qrFunnel,
  });
}
