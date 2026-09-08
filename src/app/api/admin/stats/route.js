import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, companyScope } from '@/lib/admin-guard';

// Tableau de bord : entonnoir global + par QR code + répartition notes + lots distribués.
export async function GET(req) {
  const guard = await requirePermission(req, 'view_stats');
  if (guard.error) return guard.error;
  const companyId = companyScope(guard);
  const days = Math.min(90, Math.max(7, parseInt(new URL(req.url).searchParams.get('days') || '30', 10)));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const customerWhere = { companyId };
  const prizeWhere = { companyId };
  const qrWhere = { companyId };
  const spinWhere = { customer: { companyId } };
  const reviewWhere = { customer: { companyId } };
  const scanWhere = { qrCode: { companyId } };

  const [scanCount, customers, verified, spins, reviews, approvedReviews, googleClicks, ratingDist, prizes, qrs] =
    await Promise.all([
      db.qrScan.count({ where: { ...scanWhere, scannedAt: { gte: since } } }),
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

  // Série journalière (spins & nouveaux clients) + répartition mobile/desktop + feed récent
  const [recentSpinRows, recentCustomerRows, recentScanRows] = await Promise.all([
    db.spin.findMany({ where: { ...spinWhere, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.customer.findMany({ where: { ...customerWhere, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.qrScan.findMany({ where: { ...scanWhere, scannedAt: { gte: since } }, select: { userAgent: true, scannedAt: true } }),
  ]);

  const buckets = [];
  const index = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    index[key] = buckets.length;
    buckets.push({ key, label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), spins: 0, customers: 0 });
  }
  for (const r of recentSpinRows) buckets[index[r.createdAt.toISOString().slice(0, 10)]].spins++;
  for (const r of recentCustomerRows) buckets[index[r.createdAt.toISOString().slice(0, 10)]].customers++;
  const mobile = recentScanRows.filter((r) => /Mobile|Android|iPhone/i.test(r.userAgent || '')).length;

  const recentSpins = await db.spin.findMany({
    where: spinWhere,
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      prize: { select: { label: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });

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
    daily: buckets,
    devices: { mobile, desktop: recentScanRows.length - mobile },
    recentSpins: recentSpins.map((sp) => ({
      id: sp.id,
      prize: sp.prize.label,
      player: [sp.customer.firstName, sp.customer.lastName].filter(Boolean).join(' ') || sp.customer.email,
      at: sp.createdAt,
    })),
    ratingDist: ratingDist.map((r) => ({ rating: r.rating, count: r._count._all })),
    prizes: prizes.map((p) => ({ label: p.label, distributed: p._count.spins, stock: p.stock, active: p.active })),
    qrFunnel,
  });
}
