import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Compatibilité : les anciennes URLs /admin/xxx redirigent vers /{slug}/xxx.
export default async function AdminPathRedirect({ params }) {
  const { path = [] } = await params;
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role === ROLES.SUPER_ADMIN || session.role === 'admin') redirect('/super');

  const admin = await db.admin.findUnique({ where: { id: session.sub }, include: { company: true } });
  if (admin?.company?.slug) redirect(`/${admin.company.slug}/${path.join('/')}`);
  redirect('/admin/login');
}
