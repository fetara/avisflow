import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, companyScope } from '@/lib/admin-guard';

// Tableau de bord : entonnoir global + par QR code + répartition notes + lots distribués.
export async function GET(req) {
  const guard = await requirePermission(req, 'view_stats');
  if (guard.error) return guard.error;
  const companyId = companyScope(guard);

  const customerWhere = { companyId };
  const prizeWhere = { companyId };
  const qrWhere = { companyId };
  const spinWhere = { customer: { companyId } };
  const reviewWhere = { customer: { companyId } };
  const scanWhere = { qrCode: { companyId } };

  const [scanCount, customers, verified, spins, reviews, approvedReviews, googleClicks, ratingDist, prizes, qrs] =
    await Promise.all([
      db.qrScan.count({ where: scanWhere }),
      db.customer.count({ where: customerWhere }),
      db.customer.count({ where: { ...customerWhere, emailVerifiedAt: { not: null } } }),
      db.spin.count({ where: spinWhere }),
      db.review.count({ where: reviewWhere }),
      db.review.count({ where: { ...reviewWhere, status: 'approved' } }),
      db.review.count({ where: { ...reviewWhere, googleClick: true } }),
      db.review.groupBy({ by: ['rating'], _count: { _all: true }, where: reviewWhere, orderBy: { rating: 'asc' } }),
      db.prize.findMany({ where: prizeWhere, include: { _count: { select: { spins: true } } }, orderBy: { sortOrder: 'asc' } }),
      db.qrCode.findMany({ where: qrWhere, include: { _count: { select: { scans: true } } } }),
    ]);

  // Données par QR : clients avec source, parties jouées, avis, clics Google
  const spinRows = await db.spin.findMany({ where: spinWhere, select: { customer: { select: { sourceQrId: true } } } });
  const reviewRows = await db.review.findMany({
    where: reviewWhere,
    select: { googleClick: true, customer: { select: { sourceQrId: true } } },
  });

  const qrFunnel = qrs.map((q) => {
    const spinsQ = spinRows.filter((s) => s.customer.sourceQrId === q.id).length;
    const reviewsQ = reviewRows.filter((r) => r.customer.sourceQrId === q.id).length;
    const googleQ = reviewRows.filter((r) => r.googleClick && r.customer.sourceQrId === q.id).length;
    return { id: q.id, label: q.label, slug: q.slug, active: q.active, scans: q._count.scans, spins: spinsQ, reviews: reviewsQ, googleClicks: googleQ, customers: null };
  });

  // Nombre de clients par source (un groupBy direct)
  const customersByQr = await db.customer.groupBy({
    by: ['sourceQrId'],
    where: { ...customerWhere, sourceQrId: { not: null } },
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
