import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin-guard';

// Vue globale super admin : compteurs plateforme + tendances par entreprise.
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const [companies, activeCompanies, admins, customers, spins, reviews, pendingReviews, recentLogs] =
    await Promise.all([
      db.company.count(),
      db.company.count({ where: { active: true } }),
      db.admin.count({ where: { role: 'COMPANY_ADMIN' } }),
      db.customer.count(),
      db.spin.count(),
      db.review.count(),
      db.review.count({ where: { status: 'pending' } }),
      db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { admin: { select: { email: true } } },
      }),
    ]);

  return NextResponse.json({
    totals: { companies, activeCompanies, admins, customers, spins, reviews, pendingReviews },
    recentLogs: recentLogs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, entityId: l.entityId,
      adminEmail: l.admin?.email || '?', createdAt: l.createdAt,
    })),
  });
}
