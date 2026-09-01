import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePermissions, ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊', perm: null },
  { href: '/admin/avis', label: 'Avis', icon: '⭐', perm: 'moderate_reviews' },
  { href: '/admin/clients', label: 'Clients', icon: '👥', perm: 'view_customers' },
  { href: '/admin/lots', label: 'Lots', icon: '🎁', perm: 'manage_prizes' },
  { href: '/admin/qr-codes', label: 'QR codes', icon: '📱', perm: 'manage_qrcodes' },
  { href: '/admin/reglages', label: 'Réglages', icon: '⚙️', perm: 'configure_wheel' },
];

export default async function ProtectedAdminLayout({ children }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const admin = await db.admin.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.emailVerifiedAt) redirect('/admin/login');

  const role = session.role === ROLES.COMPANY_ADMIN ? ROLES.COMPANY_ADMIN : ROLES.SUPER_ADMIN;
  const isSuper = role === ROLES.SUPER_ADMIN && !session.impersonatedBy;
  const perms = role === ROLES.COMPANY_ADMIN && !session.impersonatedBy ? parsePermissions(admin.permissions) : ['*'];
  const allowed = (perm) => !perm || perms.includes('*') || perms.includes(perm);
  const company = admin.companyId ? await db.company.findUnique({ where: { id: admin.companyId } }) : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {session.impersonatedBy && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span>🕵️ Vue support — entreprise «&nbsp;{company?.name || session.companyId}&nbsp;»</span>
          <form action="/api/super/impersonate/exit" method="post">
            <button className="rounded-lg bg-white px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50">
              Retour super admin
            </button>
          </form>
        </div>
      )}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-3">
          <span className="mr-4 font-bold text-brand-700">
            🎡 {isSuper ? 'Backoffice global' : `Backoffice — ${company?.name || 'Entreprise'}`}
          </span>
          {NAV.filter((item) => allowed(item.perm)).map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-brand-50 hover:text-brand-700">
              {item.icon} {item.label}
            </Link>
          ))}
          {isSuper && (
            <Link href="/super" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-50">
              🛡️ Espace super admin
            </Link>
          )}
          <form action="/api/admin/logout" method="post" className="ml-auto">
            <button className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600">
              Déconnexion
            </button>
          </form>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
