import Link from 'next/link';
import { db } from '@/lib/db';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------- SEO ----------
export const metadata = {
  title: 'AvisFlow — Transformez vos clients en clients fidèles',
  description:
    'Engagez vos clients avec des jeux, récompenses et QR codes. Obtenez plus d’avis et encouragez vos clients à revenir.',
  openGraph: {
    title: 'AvisFlow — Transformez vos clients en clients fidèles',
    description:
      'Un simple QR code : vos clients jouent, gagnent une récompense, partagent leur expérience et reviennent.',
    type: 'website',
    siteName: 'AvisFlow',
  },
  alternates: { canonical: '/' },
};

// Données structurées SEO (produit + FAQ)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AvisFlow',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Plateforme de fidélisation et d’engagement client basée sur QR codes, jeux et récompenses.',
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '29', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro', price: '59', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Business', price: '99', priceCurrency: 'EUR' },
  ],
};

const BENEFITS = [
  { icon: '🎡', title: 'Engagez vos clients', text: 'Transformez un simple QR code en expérience interactive mémorable.' },
  { icon: '⭐', title: 'Obtenez plus d’avis', text: 'Invitez vos clients à partager leur expérience juste après leur participation.' },
  { icon: '🔄', title: 'Faites revenir vos clients', text: 'Récompenses et campagnes donnent une bonne raison de repasser vous voir.' },
];

const SECTORS = [
  { icon: '🍔', name: 'Restaurants' }, { icon: '💇', name: 'Salons & Barbiers' },
  { icon: '🛍️', name: 'Commerces' }, { icon: '💅', name: 'Beauté & Bien-être' },
  { icon: '🚗', name: 'Services automobiles' }, { icon: '🎪', name: 'Événements' },
];

const FLOW = [
  { n: '01', icon: '📱', title: 'Scannez', text: 'Le client scanne votre QR code depuis sa table ou votre comptoir.' },
  { n: '02', icon: '🎡', title: 'Jouez', text: 'Il participe à votre roue de la chance, directement dans son navigateur.' },
  { n: '03', icon: '🎁', title: 'Gagnez', text: 'Il découvre immédiatement sa récompense et son code cadeau.' },
  { n: '04', icon: '⭐', title: 'Partagez', text: 'Il partage ensuite son expérience et laisse un avis.' },
  { n: '05', icon: '🔄', title: 'Revenez', text: 'Les récompenses et campagnes l’encouragent à revenir.' },
];

const FAQ = [
  ['Est-ce que mes clients doivent télécharger une application ?',
   'Non. Vos clients utilisent directement leur navigateur depuis leur téléphone : ils scannent le QR code, remplissent le formulaire et jouent. Rien à installer.'],
  ['Combien de fois un client peut-il participer ?',
   'Par défaut, une seule participation par e-mail validé et par entreprise. Vous pouvez passer à « une participation par jour » selon vos opérations.'],
  ['Puis-je personnaliser les récompenses ?',
   'Oui : vous créez vos lots (libellés, photos, probabilités, stocks limités ou illimités) et personnalisez la roue (couleurs, image de fond, logo, messages).'],
  ['Puis-je utiliser plusieurs QR codes ?',
   'Oui, un QR par emplacement (caisse, comptoir, vitrine…) avec les statistiques de chacun, prêt à imprimer en PNG/PDF.'],
  ['Puis-je voir les résultats de mes campagnes ?',
   'Oui : participations, avis, taux de conversion, performance par QR code et par période, directement dans votre tableau de bord.'],
  ['Mes données sont-elles séparées de celles des autres entreprises ?',
   'Oui. Chaque entreprise a ses propres clients, lots, avis et réglages, strictement isolés les uns des autres.'],
  ['Puis-je tester ma roulette avant de la publier ?',
   'Oui : un mode test intégré vous permet de jouer au parcours client sans créer de participation ni consommer de stock.'],
];

function Section({ children, className = '', id }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 py-16 sm:py-20 ${className}`}>{children}</section>;
}

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`Note ${rating.toFixed(1)} sur 5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

/* ---------- Mockup téléphone : ce que verra le client ---------- */
function PhoneMockup() {
  const colors = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#db2777', '#f97316', '#10b981', '#6366f1'];
  const step = 360 / colors.length;
  const gradient = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl dark:border-gray-700" aria-label="Aperçu de l’expérience client">
      <div className="absolute left-1/2 top-2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
      <div className="flex min-h-[480px] flex-col items-center rounded-[2rem] bg-gradient-to-b from-brand-50 to-white px-5 pb-6 pt-12 dark:from-gray-800 dark:to-gray-900">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Spin & Win</p>
        <div className="relative mt-5 aspect-square w-56">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl" aria-hidden="true">▼</div>
          <div className="animate-wheel h-full w-full rounded-full border-[6px] border-white shadow-xl" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl shadow">🎡</div>
          </div>
        </div>
        <p className="mt-5 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">🎁 10% OFF</p>
        <button type="button" tabIndex={-1} className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg">
          TOURNER LA ROUE
        </button>
        <p className="mt-3 text-center text-[10px] text-gray-400">Ce que vos clients verront sur leur téléphone</p>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  // ---------- Données réelles (requêtes agrégées, pas de N+1) ----------
  let companies = [];
  let trustLogos = [];
  let recentReviews = [];
  let dbPlans = [];
  try {
    const publicCompanies = await db.company.findMany({
      where: { active: true, isPublic: true },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
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
          return { ...c, rating: a && a.count ? a.sum / a.count : null, reviewCount: a?.count || 0, logo: logos.find((l) => l.companyId === c.id)?.value || null };
        })
        .sort((a, b) => b.reviewCount - a.reviewCount); // les plus actives d'abord

      // Bloc confiance : uniquement des entreprises qui ont déjà une activité (≥1 avis)
      trustLogos = companies.filter((c) => c.reviewCount > 0 && c.logo).slice(0, 8);

      recentReviews = await db.review.findMany({
        where: { status: 'approved', customer: { companyId: { in: ids }, anonymizedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          rating: true, comment: true,
          customer: { select: { firstName: true, company: { select: { name: true, slug: true } } } },
        },
      });
    }
    dbPlans = await db.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      take: 3,
    });
  } catch {
    // base indisponible : la vitrine reste fonctionnelle sans données
  }

  const companiesWithReviews = companies.filter((c) => c.reviewCount > 0).slice(0, 8);

  return (
    <div className="min-h-screen bg-white">
      {/* ---------- Données structurées SEO ---------- */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------- Navigation ---------- */}
      <NavBar
        brand="🎡 AvisFlow"
        items={[
          { href: '#fonctionnalites', label: 'Fonctionnalités' },
          { href: '#etapes', label: 'Comment ça marche' },
          { href: '/entreprises', label: 'Entreprises' },
          { href: '/tarifs', label: 'Tarifs' },
        ]}
        actions={
          <>
            <ThemeToggle />
            <Link href="/admin/login" className="rounded-lg px-3 py-2.5 font-medium text-gray-700 hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-800">Se connecter</Link>
            <Link href="/inscription" className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-md transition hover:bg-brand-700">Commencer gratuitement</Link>
          </>
        }
      />

      {/* ---------- HERO : promesse + mockup client ---------- */}
      <Section className="grid items-center gap-12 lg:grid-cols-2 !pt-16 sm:!pt-24">
        <div>
          <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
            Fidélisation · Avis · Récompenses
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Transformez vos clients en <span className="text-brand-600">clients fidèles</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Un simple QR code permet à vos clients de jouer, gagner une récompense,
            partager leur expérience et revenir dans votre établissement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className="btn-primary">🚀 Commencer gratuitement</Link>
            <a href="#etapes" className="btn-secondary">Voir comment ça marche</a>
          </div>
          <p className="mt-3 text-sm text-gray-400">Essai gratuit · Sans carte bancaire · Prêt en 2 minutes</p>
        </div>
        <PhoneMockup />
      </Section>

      {/* ---------- 3 bénéfices ---------- */}
      <Section className="!py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-4xl" aria-hidden="true">{b.icon}</div>
              <h2 className="mt-3 text-lg font-bold">{b.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{b.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Ces entreprises nous font confiance (logos réels, entreprises actives) ---------- */}
      {trustLogos.length > 0 && (
        <Section className="rounded-3xl bg-gray-50 !py-12">
          <h2 className="text-center text-xl font-bold uppercase tracking-wide text-gray-500">Ces entreprises nous font confiance</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {trustLogos.map((c) => (
              <Link key={c.id} href={`/entreprises/${c.slug}`} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt={c.name} loading="lazy"
                  className="mx-auto h-14 w-auto max-w-[130px] object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0" />
                <span className="mt-1 block text-xs text-gray-500">{c.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- Comment ça marche (5 étapes) ---------- */}
      <Section id="etapes" className="rounded-3xl bg-gray-900 text-white">
        <h2 className="text-center text-3xl font-bold">Comment ça marche ?</h2>
        <p className="mt-2 text-center text-gray-400">Du scan QR au retour client, en cinq étapes.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl bg-gray-800 p-6 text-center">
              {i < FLOW.length - 1 && (
                <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-brand-500 lg:block" aria-hidden="true">→</span>
              )}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/20 text-3xl" aria-hidden="true">{s.icon}</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-400">{s.n}</p>
              <h3 className="mt-1 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-300">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-400">
          Un simple QR code transforme une visite classique en expérience mémorable.
        </p>
      </Section>

      {/* ---------- Exemple concret (restaurant) ---------- */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Un exemple en quelques secondes</h2>
            <p className="mt-3 text-gray-600">
              Un client termine son repas. Sur la table, un QR code. Il scanne, tourne la roue,
              gagne un dessert et laisse un avis cinq étoiles. La semaine suivante, il revient
              utiliser sa récompense.
            </p>
            <p className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              Un simple QR code transforme une visite classique en expérience mémorable.
            </p>
          </div>
          <ol className="space-y-3">
            {['Client termine son repas', '📱 Scanne le QR', '🎡 Tourne la roue', '🎁 Gagne une récompense', '⭐ Partage son expérience', '🔄 Revient plus tard'].map((t, i) => (
              <li key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 text-sm font-medium shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------- Secteurs ---------- */}
      <Section className="rounded-3xl bg-gray-50">
        <h2 className="text-center text-3xl font-bold">Fait pour tous les secteurs</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SECTORS.map((s) => (
            <div key={s.name} className="rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">{s.icon}</div>
              <p className="mt-2 text-sm font-semibold">{s.name}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">…et bien plus encore.</p>
      </Section>

      {/* ---------- Fonctionnalités ---------- */}
      <Section id="fonctionnalites">
        <h2 className="text-center text-3xl font-bold">Tout ce qu’il faut pour engager vos clients</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🎁', title: 'Récompenses sur mesure', text: 'Lots, photos, probabilités, stocks : vous gardez le contrôle.' },
            { icon: '🎨', title: 'Roue personnalisable', text: 'Couleurs, image de fond, logo, messages : votre image de marque.' },
            { icon: '⭐', title: 'Avis modérés', text: 'Auto-publication configurable, aucun avis indésirable en ligne.' },
            { icon: '🏆', title: 'Gestion des gagnants', text: 'Codes cadeaux uniques avec QR de validation en caisse.' },
            { icon: '📊', title: 'Statistiques claires', text: 'Participations, avis, conversion — par QR et par période.' },
            { icon: '🔐', title: 'Données isolées', text: 'Chaque entreprise a strictement les siennes, en toute sécurité.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">{f.icon}</div>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Dashboard illustré (données d'exemple identifiées) ---------- */}
      <Section className="rounded-3xl bg-gray-900 text-white">
        <h2 className="text-center text-3xl font-bold">Tout votre engagement au même endroit</h2>
        <p className="mt-2 text-center text-sm text-gray-400">Aperçu illustratif du tableau de bord — vos vraies statistiques sont dans votre espace.</p>
        <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-gray-800 p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">📊 Ce mois-ci</p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[['1 248', 'Participations'], ['327', 'Avis'], ['841', 'Récompenses'], ['26 %', 'Conversion']].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-gray-900 p-4 text-center">
                <p className="text-2xl font-extrabold text-brand-400">{v}</p>
                <p className="mt-1 text-xs text-gray-400">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex h-32 items-end gap-2" aria-hidden="true">
            {[35, 50, 42, 65, 58, 80, 72, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-300">
            💡 <strong>Votre meilleur QR code :</strong> <span className="font-mono text-brand-400">REPARPHONE29</span> — 68 % des participations cette semaine.
          </p>
        </div>
      </Section>

      {/* ---------- Entreprises participantes (réelles, avec avis uniquement) ---------- */}
      <Section id="entreprises">
        <h2 className="text-center text-3xl font-bold">Découvrez les entreprises participantes</h2>
        {companiesWithReviews.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-400">
            Les premières entreprises arrivent bientôt — <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">créez la vôtre</Link> !
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companiesWithReviews.map((c) => (
              <div key={c.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  {c.logo
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-10 w-10 rounded-lg object-contain" loading="lazy" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-lg">🏪</span>}
                  <h3 className="font-bold">{c.name}</h3>
                </div>
                <p className="mt-3 text-sm">
                  <Stars rating={c.rating} /> <span className="font-semibold">{c.rating.toFixed(1).replace('.', ',')}</span>
                </p>
                <p className="text-xs text-gray-500">{c.reviewCount} avis</p>
                <Link href={`/entreprises/${c.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">Voir les avis →</Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link href="/entreprises" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Voir toutes les entreprises →
          </Link>
        </p>
      </Section>

      {/* ---------- Ils parlent de nous (avis réels approuvés) ---------- */}
      {recentReviews.length > 0 && (
        <Section id="avis" className="rounded-3xl bg-gray-50">
          <h2 className="text-center text-3xl font-bold">⭐ Ils parlent de nous</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentReviews.map((r, i) => (
              <blockquote key={i} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <Stars rating={r.rating} />
                {r.comment && <p className="mt-2 text-sm text-gray-600">« {r.comment} »</p>}
                <footer className="mt-3 text-xs text-gray-400">
                  {r.customer.firstName || 'Un client'} —{' '}
                  <Link href={`/entreprises/${r.customer.company.slug}`} className="font-semibold text-brand-600 hover:underline">{r.customer.company.name}</Link>
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- Tarifs (plans réels de la base) ---------- */}
      <Section id="tarifs">
        <h2 className="text-center text-3xl font-bold">Des tarifs simples</h2>
        <p className="mt-2 text-center text-gray-500">Commencez gratuitement, évoluez quand vous voulez.</p>
        {dbPlans.length === 0 ? (
          <p className="mt-10 card text-center text-sm text-gray-400">
            Nos offres sont en préparation. <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">Créez votre entreprise</Link> dès maintenant — l’essai est gratuit.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {dbPlans.map((p) => (
              <div key={p.id} className={`relative flex flex-col rounded-3xl border p-7 shadow-sm ${p.slug === 'business' ? 'border-brand-600 shadow-xl ring-2 ring-brand-600/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'}`}>
                {p.slug === 'business' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Le plus populaire</span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-gray-500">{p.description}</p>}
                <p className="mt-3">
                  <span className="text-4xl font-extrabold">
                    {p.priceMonthly == null ? 'Sur devis' : `${Number(p.priceMonthly)}${p.currency === 'EUR' ? '€' : ' ' + p.currency}`}
                  </span>
                  {p.priceMonthly != null && <span className="text-gray-500"> /mois</span>}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {(Array.isArray(p.features) ? p.features : []).map((label) => (
                    <li key={label} className="flex items-center gap-2"><span aria-hidden="true" className="text-emerald-500">✓</span>{label}</li>
                  ))}
                </ul>
                <Link href="/inscription" className={`mt-6 rounded-xl py-3 text-center text-sm font-bold transition ${p.slug === 'business' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                  Essai gratuit
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link href="/tarifs" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Voir le détail des plans →
          </Link>
        </p>
      </Section>

      {/* ---------- FAQ ---------- */}
      <Section id="faq" className="max-w-3xl">
        <h2 className="text-center text-3xl font-bold">Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-gray-200 bg-gray-50 p-4 open:bg-white dark:border-gray-800 dark:bg-gray-900">
              <summary className="cursor-pointer list-none font-semibold">
                <span className="mr-2 inline-block text-brand-600 transition group-open:rotate-90">▸</span>{q}
              </summary>
              <p className="mt-2 pl-6 text-sm text-gray-600">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ---------- CTA final ---------- */}
      <Section className="rounded-3xl bg-brand-600 text-center text-white">
        <h2 className="text-3xl font-bold sm:text-4xl">Prêt à transformer vos clients en clients fidèles ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-50">Lancez votre première campagne en quelques minutes.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/inscription" className="rounded-xl bg-white px-6 py-3 font-bold text-brand-700 shadow-lg transition hover:bg-brand-50">🚀 Commencer gratuitement</Link>
          <a href="#etapes" className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Voir la démonstration</a>
        </div>
      </Section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-extrabold text-brand-700">🎡 AvisFlow</p>
            <p className="mt-2 text-sm text-gray-500">Engagez vos clients, obtenez plus d’avis, faites-les revenir.</p>
          </div>
          <nav className="text-sm" aria-label="Liens utiles">
            <p className="font-semibold text-gray-700">Liens</p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li><Link href="/entreprises" className="hover:text-brand-600">Entreprises</Link></li>
              <li><Link href="/admin/login" className="hover:text-brand-600">Connexion</Link></li>
              <li><Link href="/inscription" className="hover:text-brand-600">Créer mon entreprise</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-brand-600">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-brand-600">Confidentialité</Link></li>
              <li><Link href="/reglement-jeu" className="hover:text-brand-600">Règlement du jeu</Link></li>
            </ul>
          </nav>
          <div className="text-sm">
            <p className="font-semibold text-gray-700">Contact</p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li>✉️ <a href="mailto:contact@example.com" className="hover:text-brand-600">contact@example.com</a></li>
              <li>🛡️ Support 7j/7 pour les entreprises</li>
            </ul>
          </div>
        </div>
        <p className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} AvisFlow — Jeu gratuit sans obligation d’achat.
        </p>
      </footer>
    </div>
  );
}
