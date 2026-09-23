import { db } from '@/lib/db';
import { ROLES } from '@/lib/permissions';

// Résout l'entreprise ciblée par une route /api/{slug}/... :
// - admin entreprise (ou impersonation) -> SA entreprise (session, jamais le client) ;
// - super admin visitant un espace -> l'entreprise du slug (header posé par le middleware).
export async function resolveCompanyId(req, guard) {
  if (guard.role === ROLES.SUPER_ADMIN && !guard.impersonatedBy) {
    const slug = req.headers.get('x-company-slug');
    if (!slug) return null;
    const company = await db.company.findUnique({ where: { slug }, select: { id: true } });
    return company?.id ?? null;
  }
  return guard.companyId;
}
