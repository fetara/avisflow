import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function requireAdmin(req) {
  const session = await getAdminSession();
  if (!session) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  const admin = await db.admin.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.emailVerifiedAt) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  return { admin };
}

export async function logAction(adminId, action, entity, entityId = null) {
  await db.auditLog.create({ data: { adminId, action, entity, entityId } }).catch(() => {});
}
