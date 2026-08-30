import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊' },
  { href: '/admin/avis', label: 'Avis', icon: '⭐' },
  { href: '/admin/clients', label: 'Clients', icon: '👥' },
  { href: '/admin/lots', label: 'Lots', icon: '🎁' },
  { href: '/admin/qr-codes', label: 'QR codes', icon: '📱' },
  { href: '/admin/reglages', label: 'Réglages', icon: '⚙️' },
];

export default async function ProtectedAdminLayout({ children }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-3">
          <span className="mr-4 font-bold text-brand-700">🎡 Backoffice</span>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-brand-50 hover:text-brand-700">
              {item.icon} {item.label}
            </Link>
          ))}
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
