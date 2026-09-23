import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { parsePermissions, ROLES } from '@/lib/permissions';
import ThemeToggle from '@/components/ThemeToggle';
import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

// Navigation du backoffice entreprise, organisée par sections (sidebar gauche)
const SECTIONS = [
  { title: 'Principal', items: [
    { href: '', label: 'Tableau de bord', icon: '📊', perm: null },
    { href: '/clients', label: 'Clients', icon: '👥', perm: 'view_customers' },
    { href: '/avis', label: 'Avis', icon: '⭐', perm: 'moderate_reviews' },
  ] },
  { title: 'Engagement', items: [
    { href: '/lots', label: 'Lots de la roue', icon: '🎁', perm: 'manage_prizes' },
    { href: '/qr-codes', label: 'QR codes', icon: '📱', perm: 'manage_qrcodes' },
    { href: '/gagnants', label: 'Gagnants', icon: '🏆', perm: 'view_customers' },
  ] },
  { title: 'Administration', items: [
    { href: '/abonnement', label: 'Abonnement', icon: '💳', perm: null },
    { href: '/reglages', label: 'Paramètres', icon: '⚙️', perm: 'configure_wheel' },
  ] },
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

export default async function ProtectedCompanyLayout({ children, params }) {
  const { companySlug } = await params;

  // 1. Le slug doit correspondre à une entreprise existante et active
  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return <CompanyError title="Entreprise introuvable" message={`Aucune entreprise « ${companySlug} » n'existe sur cette plateforme. Vérifiez le lien ou le QR code scanné.`} showLogin />;
  }
  if (!company.active) {
    return <CompanyError title="Opération terminée" message={`L'espace de l'entreprise « ${company.name} » est actuellement désactivé. Contactez le support si cela semble être une erreur.`} showLogin={false} />;
  }

  // 2. Une session admin valide est obligatoire — le slug seul ne suffit jamais
  const session = await getAdminSession();
  if (!session) redirect(`/admin/login?next=${companySlug}`);

  const role = session.role === ROLES.COMPANY_ADMIN ? ROLES.COMPANY_ADMIN : ROLES.SUPER_ADMIN;

  // 3. Impersonation : le super admin en vue support doit être sur le slug de l'entreprise impersonée
  if (session.impersonatedBy) {
    if (session.companyId !== company.id) redirect('/super');
  } else if (role === ROLES.COMPANY_ADMIN) {
    // 4. Un admin entreprise ne peut ouvrir que LE slug de sa propre entreprise
    if (session.companyId !== company.id) {
      // Journalisation d'une tentative d'accès cross-entreprise
      await db.auditLog.create({
        data: { adminId: session.sub, action: 'security.cross_company_denied', entity: 'Company', entityId: company.id },
      }).catch(() => {});
      const own = await db.admin.findUnique({ where: { id: session.sub }, include: { company: true } });
      redirect(own?.company?.slug ? `/${own.company.slug}` : '/admin/login?err=denied');
    }
  }
  // 5. Le super admin (hors impersonation) peut accéder à n'importe quel slug

  const admin = await db.admin.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.emailVerifiedAt) redirect('/admin/login');

  const isSuper = role === ROLES.SUPER_ADMIN && !session.impersonatedBy;
  const perms = role === ROLES.COMPANY_ADMIN && !session.impersonatedBy ? parsePermissions(admin.permissions) : ['*'];
  const allowed = (perm) => !perm || perms.includes('*') || perms.includes(perm);
  const base = `/${company.slug}`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 lg:pl-64">
      <Sidebar
        brand={company.name}
        subtitle={isSuper ? `Vue super admin · /${company.slug}` : `/${company.slug}`}
        sections={SECTIONS.map((sec) => ({
          ...sec,
          items: sec.items
            .filter((it) => allowed(it.perm))
            .map((it) => ({ ...it, href: `${base}${it.href}` })),
        }))}
        footer={
          <>
            {isSuper && (
              <Link href="/super" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10">
                <span aria-hidden="true">🛡️</span> Espace super admin
              </Link>
            )}
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
      {session.impersonatedBy && (
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span>🕵️ Vue support — entreprise «&nbsp;{company.name}&nbsp;»</span>
          <form action="/api/super/impersonate/exit" method="post">
            <button className="rounded-lg bg-white px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50">
              Retour super admin
            </button>
          </form>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8 pt-16 lg:pt-8">{children}</main>
    </div>
  );
}
