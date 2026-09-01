import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin-guard';

// Journal d'audit global : actions des admins (super + entreprises).
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const logs = await db.auditLog.findMany({
    include: { admin: { select: { email: true, role: true, companyId: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 50,
    take: 50,
  });
  const total = await db.auditLog.count();
  return NextResponse.json({ logs, total, page });
}
