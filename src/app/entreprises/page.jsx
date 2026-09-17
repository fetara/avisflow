import Link from 'next/link';
import { db } from '@/lib/db';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Entreprises participantes — AvisFlow',
  description: 'Découvrez les entreprises qui utilisent AvisFlow pour engager leurs clients et récolter des avis.',
};

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`Note ${rating.toFixed(1)} sur 5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

// Listing public de toutes les entreprises actives et visibles.
export default async function EntreprisesPage() {
  let companies = [];
  try {
    const publicCompanies = await db.company.findMany({
      where: { active: true, isPublic: true },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    const ids = publicCompanies.map((c) => c.id);

    if (ids.length > 0) {
      const custs = await db.customer.findMany({
        where: { companyId: { in: ids } },
        select: { id: true, companyId: true },
      });
      const compOf = Object.fromEntries(custs.map((c) => [c.id, c.companyId]));

      const [reviews, logos] = await Promise.all([
        db.review.findMany({
          where: { status: 'approved', customerId: { in: custs.map((c) => c.id) } },
          select: { rating: true, customerId: true },
        }),
        db.companySetting.findMany({
          where: { key: 'BRAND_LOGO', companyId: { in: ids }, value: { not: '' } },
          select: { companyId: true, value: true },
        }),
      ]);

      const perCompany = {};
      for (const r of reviews) {
        const cid = compOf[r.customerId];
        if (!cid) continue;
        (perCompany[cid] ??= { sum: 0, count: 0 });
        perCompany[cid].sum += r.rating;
        perCompany[cid].count += 1;
      }

      companies = publicCompanies
        .map((c) => {
          const a = perCompany[c.id];
          return {
            ...c,
            rating: a && a.count ? a.sum / a.count : null,
            reviewCount: a?.count || 0,
            logo: logos.find((l) => l.companyId === c.id)?.value || null,
          };
        })
        .sort((a, b) => b.reviewCount - a.reviewCount);
    }
  } catch {
    // base indisponible : liste vide
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        brand="🎡 AvisFlow"
        items={[{ href: '/', label: 'Accueil' }]}
        actions={
          <>
            <ThemeToggle />
            <Link href="/inscription" className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-md hover:bg-brand-700">Commencer gratuitement</Link>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Entreprises participantes</h1>
          <p className="mt-2 text-gray-500">
            Découvrez les établissements qui engagent leurs clients avec AvisFlow.
          </p>
        </header>

        {companies.length === 0 ? (
          <p className="mt-12 card text-center text-sm text-gray-400">
            Aucune entreprise visible pour le moment — <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">soyez la première</Link> !
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/entreprises/${c.slug}`}
                className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  {c.logo
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-12 w-12 rounded-xl object-contain" loading="lazy" />
                    : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl">🏪</span>}
                  <h2 className="text-lg font-bold">{c.name}</h2>
                </div>
                <p className="mt-4 text-sm">
                  {c.rating != null
                    ? <><Stars rating={c.rating} /> <span className="font-semibold">{c.rating.toFixed(1).replace('.', ',')}</span></>
                    : <span className="text-gray-400">Pas encore d’avis</span>}
                </p>
                <p className="text-xs text-gray-500">{c.reviewCount} avis</p>
                <span className="mt-4 inline-block text-sm font-semibold text-brand-600">Voir les avis et jouer →</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
