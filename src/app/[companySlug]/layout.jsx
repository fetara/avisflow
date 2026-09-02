import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePermissions, ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Navigation du backoffice, préfixée par le slug de l'entreprise
const NAV = [
  { href: '', label: 'Tableau de bord', icon: '📊', perm: null },
  { href: '/avis', label: 'Avis', icon: '⭐', perm: 'moderate_reviews' },
  { href: '/clients', label: 'Clients', icon: '👥', perm: 'view_customers' },
  { href: '/lots', label: 'Lots', icon: '🎁', perm: 'manage_prizes' },
  { href: '/qr-codes', label: 'QR codes', icon: '📱', perm: 'manage_qrcodes' },
  { href: '/reglages', label: 'Réglages', icon: '⚙️', perm: 'configure_wheel' },
];

// Page d'erreur dédiée : slug invalide ou entreprise désactivée
function CompanyError({ title, message, showLogin }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-3xl">🚫</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">{message}</p>
      <div className="mt-6 flex gap-3">
        {showLogin && <Link href="/admin/login" className="btn-primary !py-2">Se connecter</Link>}
        <Link href="/" className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-white">Accueil</Link>
      </div>
    </main>
  );
}

export default async function CompanyLayout({ children, params }) {
  const { companySlug } = await params;

  // 1. Le slug doit correspondre à une entreprise existante et active
  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return <CompanyError title="Entreprise introuvable" message={`Aucune entreprise « ${companySlug} » n'existe sur cette plateforme. Vérifiez le lien ou le QR code scanné.`} showLogin />;
  }
  if (!company.active) {
    return <CompanyError title="Opération terminée" message={`L'espace de l'entreprise « ${company.name} » est actuellement désactivé. Contactez le support si cela semble être une erreur.`} showLogin={false} />;
  }

  return <>{children}</>;
}
