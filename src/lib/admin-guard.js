import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePermissions, ROLES } from '@/lib/permissions';

async function loadAdmin(session) {
  const admin = await db.admin.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.emailVerifiedAt) return null;
  // Rôle effectif : la session (impersonation incluse) prime ; legacy "admin" = SUPER_ADMIN
  const role = session.role === ROLES.COMPANY_ADMIN ? ROLES.COMPANY_ADMIN : ROLES.SUPER_ADMIN;
  const companyId = session.companyId ?? (role === ROLES.COMPANY_ADMIN ? admin.companyId : null);
  const permissions = role === ROLES.COMPANY_ADMIN
    ? (session.impersonatedBy ? ['*'] : parsePermissions(admin.permissions))
    : ['*'];
  return { admin, role, companyId, permissions, impersonatedBy: session.impersonatedBy || null };
}

function hasPerm(perms, perm) {
  return perms.includes('*') || perms.includes(perm);
}

// Garde de base : tout admin connecté (super ou entreprise).
export async function requireAdmin(req) {
  const session = await getAdminSession();
  if (!session) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  const ctx = await loadAdmin(session);
  if (!ctx) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  return ctx;
}

// Garde super admin uniquement (impersonation exclue).
export async function requireSuperAdmin(req) {
  const ctx = await requireAdmin(req);
  if (ctx.error) return ctx;
  if (ctx.role !== ROLES.SUPER_ADMIN || ctx.impersonatedBy) {
    return { error: NextResponse.json({ error: 'Accès réservé au super admin.' }, { status: 403 }) };
  }
  return ctx;
}

// Garde par permission granulaire. Le super admin passe toujours.
export async function requirePermission(req, perm) {
  const ctx = await requireAdmin(req);
  if (ctx.error) return ctx;
  if (ctx.role === ROLES.SUPER_ADMIN || hasPerm(ctx.permissions, perm)) return ctx;
  return { error: NextResponse.json({ error: 'Permission manquante.' }, { status: 403 }) };
}

// Scope de requête : undefined = tout voir (super admin), sinon id d'entreprise.
export function companyScope(ctx) {
  return ctx.role === ROLES.SUPER_ADMIN ? undefined : ctx.companyId;
}

export async function logAction(adminId, action, entity, entityId = null) {
  await db.auditLog.create({ data: { adminId, action, entity, entityId } }).catch(() => {});
}
