import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { ROLES } from '@/lib/permissions';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }) {
  const session = await getAdminSession();
  // Réservé au super admin hors impersonation
  if (!session || session.impersonatedBy || (session.role !== ROLES.SUPER_ADMIN && session.role !== 'admin')) {
    redirect(session ? '/admin' : '/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <NavBar
        brand="🛡️ Super Admin"
        brandClass="text-xl font-extrabold text-amber-400"
        items={[
          { href: '/super', label: 'Entreprises', icon: '🏢' },
          { href: '/super/audit', label: 'Journal d’audit', icon: '📜' },
          { href: '/super/email', label: 'E-mails', icon: '✉️' },
          { href: '/super/env', label: 'Serveur', icon: '⚙️' },
        ]}
        actions={
          <>
            <ThemeToggle />
            <form action="/api/admin/logout" method="post">
              <button className="rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400">Déconnexion</button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
