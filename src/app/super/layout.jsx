import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { ROLES } from '@/lib/permissions';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }) {
  const session = await getAdminSession();
  // Réservé au super admin hors impersonation
  if (!session || session.impersonatedBy || (session.role !== ROLES.SUPER_ADMIN && session.role !== 'admin')) {
    redirect(session ? '/admin' : '/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 lg:pl-64">
      <Sidebar
        brand="AvisFlow Admin"
        subtitle="Espace super administrateur"
        sections={[
          { title: 'Pilotage', items: [
            { href: '/super', label: 'Entreprises', icon: '🏢' },
          ] },
          { title: 'Abonnements', items: [
            { href: '/super/abonnements', label: 'Abonnements & plans', icon: '💳' },
          ] },
          { title: 'Système', items: [
            { href: '/super/env', label: 'Serveur & E-mails', icon: '⚙️' },
            { href: '/super/audit', label: 'Journal d’audit', icon: '📜' },
          ] },
        ]}
        footer={
          <>
            <div className="flex items-center gap-2 px-2">
              <ThemeToggle />
              <Link href="/" className="rounded-lg px-2 py-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">Site public</Link>
            </div>
            <form action="/api/admin/logout" method="post">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400">
                <span aria-hidden="true">🚪</span> Déconnexion
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8 pt-16 lg:pt-8">{children}</main>
    </div>
  );
}
