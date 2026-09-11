import Link from 'next/link';
import { db } from '@/lib/db';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

const PER_PAGE = 10;

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`Note ${rating} sur 5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function ErrorPage({ title, message }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-3xl">🚫</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">{message}</p>
      <Link href="/" className="mt-6 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-white">Accueil</Link>
    </main>
  );
}

// Page publique des avis d'une entreprise — accessible sans connexion.
export default async function AvisEntreprisePage({ params, searchParams }) {
  const { companySlug } = await params;
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10));

  const company = await db.company.findUnique({ where: { slug: companySlug } });
  // Seules les entreprises actives et publiques sont consultables
  if (!company || !company.active || !company.isPublic) {
    return <ErrorPage title="Entreprise introuvable" message="Cette entreprise n'existe pas ou n'est pas visible publiquement." />;
  }

  // Avis APPROUVÉS uniquement (statut de modération respecté), paginés
  const where = { status: 'approved', customer: { companyId: company.id, anonymizedAt: null } };
  const [reviews, total, agg, settings] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { rating: true, comment: true, photo: true, createdAt: true, customer: { select: { firstName: true } } },
    }),
    db.review.count({ where }),
    db.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
    db.companySetting.findMany({ where: { companyId: company.id, key: 'BRAND_LOGO' }, select: { value: true } }),
  ]);
  const logo = settings[0]?.value || null;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        brand={company.name}
        brandClass="text-xl font-extrabold text-brand-700"
        items={[{ href: '/', label: 'Accueil' }]}
        actions={<ThemeToggle />}
      />

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* En-tête entreprise */}
        <header className="card flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {logo
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`Logo ${company.name}`} className="h-20 w-20 rounded-2xl object-contain" />
            : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-4xl">🏪</div>}
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{company.name}</h1>
            <p className="mt-1">
              {agg._count._all > 0 ? (
                <>
                  <Stars rating={agg._avg.rating || 0} />{' '}
                  <span className="font-bold">{(agg._avg.rating || 0).toFixed(1).replace('.', ',')}</span> / 5
                  <span className="text-gray-500"> — {agg._count._all} avis</span>
                </>
              ) : (
                <span className="text-gray-400">Pas encore d’avis</span>
              )}
            </p>
            <Link href={`/${company.slug}/play`} className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-brand-700">
              🎡 Jouer à la roue
            </Link>
          </div>
        </header>

        {/* Liste des avis publiés */}
        <section className="mt-8 space-y-4" aria-label="Avis des clients">
          {reviews.length === 0 && <p className="card text-center text-sm text-gray-400">Aucun avis publié pour le moment.</p>}
          {reviews.map((r) => (
            <article key={r.id} className="card !p-5">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                <time className="text-xs text-gray-400" dateTime={r.createdAt.toISOString()}>
                  {r.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-700">« {r.comment} »</p>}
              {r.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt="Photo du client" loading="lazy" className="mt-3 max-h-48 rounded-xl object-cover" />
              )}
              <p className="mt-2 text-xs text-gray-400">{r.customer.firstName || 'Un client'}</p>
            </article>
          ))}
        </section>

        {/* Pagination */}
        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Pagination des avis">
            <Link href={`?page=${page - 1}`} aria-disabled={page <= 1}
              className={`rounded-lg border px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-30' : 'hover:bg-white'}`}>← Précédent</Link>
            <span className="text-gray-500">Page {page} / {pages}</span>
            <Link href={`?page=${page + 1}`} aria-disabled={page >= pages}
              className={`rounded-lg border px-3 py-2 ${page >= pages ? 'pointer-events-none opacity-30' : 'hover:bg-white'}`}>Suivant →</Link>
          </nav>
        )}
      </main>
    </div>
  );
}
