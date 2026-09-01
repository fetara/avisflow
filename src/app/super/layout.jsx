import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }) {
  const session = await getAdminSession();
  // Réservé au super admin hors impersonation
  if (!session || session.impersonatedBy || (session.role !== ROLES.SUPER_ADMIN && session.role !== 'admin')) {
    redirect(session ? '/admin' : '/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-3">
          <span className="mr-4 font-bold text-amber-400">🛡️ Super Admin</span>
          <Link href="/super" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white">
            🏢 Entreprises
          </Link>
          <Link href="/super/audit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white">
            📜 Journal d'audit
          </Link>
          <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white">
            🎡 Backoffice global
          </Link>
          <form action="/api/admin/logout" method="post" className="ml-auto">
            <button className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400">
              Déconnexion
            </button>
          </form>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
