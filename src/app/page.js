import Link from 'next/link';
import { db } from '@/lib/db';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Roue de la Chance — Transformez vos clients en ambassadeurs' };

/* ---------- Roue décorative animée (démo visuelle, CSS pur) ---------- */
function DemoWheel() {
  const colors = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#db2777', '#f97316', '#10b981'];
  const step = 360 / colors.length;
  const gradient = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs" aria-hidden="true">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl">▼</div>
      <div className="animate-wheel relative h-full w-full rounded-full border-8 border-white shadow-2xl" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl shadow-lg">🎡</div>
      </div>
    </div>
  );
}

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`Note ${rating.toFixed(1)} sur 5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

const USE_CASES = [
  { icon: '🛍️', title: 'Commerces', text: 'Boulangeries, boutiques, bars : fidélisez la clientèle de passage et récoltez des avis Google.' },
  { icon: '🎪', title: 'Salons & événements', text: 'Animez votre stand, capturez des contacts qualifiés et laissez une impression durable.' },
  { icon: '🛒', title: 'E-commerce', text: 'Récompensez vos clients après achat et boostez vos avis produits vérifiés.' },
  { icon: '✂️', title: 'Restaurants & instituts', text: 'Un QR code en caisse, une roue sur mobile : le jeu devient votre meilleure pub.' },
];

const FEATURES = [
  { icon: '🎁', title: 'Lots sur mesure', text: 'Bons d’achat, offres, lots surprises : définissez vos lots, leurs probabilités et leurs stocks.' },
  { icon: '🎨', title: 'Roue personnalisable', text: 'Couleurs, image de fond, logo, textes d’accueil : votre roue à votre image, en quelques clics.' },
  { icon: '📊', title: 'Statistiques en temps réel', text: 'Scans, inscriptions, parties jouées, avis collectés : un entonnoir complet, même par QR code.' },
  { icon: '🏆', title: 'Gestion des gagnants', text: 'Suivi des lots à retirer, codes cadeaux uniques avec QR de validation en caisse.' },
  { icon: '📱', title: 'QR codes prêts à imprimer', text: 'Générez des QR codes et affiches PDF par emplacement et suivez leurs performances.' },
  { icon: '🔐', title: 'Multi-entreprises sécurisé', text: 'Chaque entreprise a ses lots, ses clients et sa roue. Isolation stricte des données garantie.' },
];

const STEPS = [
  { n: '1', title: 'Créez votre entreprise', text: 'Inscription gratuite en 2 minutes. Vous obtenez votre espace et votre roue.' },
  { n: '2', title: 'Configurez lots et roue', text: 'Ajoutez vos lots, leurs probabilités et vos textes. Générez vos QR codes.' },
  { n: '3', title: 'Vos clients scannent et jouent', text: 'Ils s’inscrivent, tournent la roue et gagnent un cadeau avec leur code unique.' },
  { n: '4', title: 'Vous récoltez avis et fidélité', text: 'Avis Google collectés, clients fidélisés, statistiques en temps réel.' },
];

const FAQ = [
  ['Combien ça coûte ?', 'L’essai est gratuit et sans engagement. Nos offres tarifaires arrivent bientôt — profitez du lancement.'],
  ['Un client peut-il jouer plusieurs fois ?', 'Non : un seul tour par e-mail validé et par entreprise (périodicité configurable). Le tirage est effectué côté serveur, équitablement.'],
  ['Mes données sont-elles séparées des autres commerces ?', 'Oui. Chaque entreprise a ses lots, ses clients, ses avis et ses réglages, isolés par construction.'],
  ['Comment mes clients participent-ils ?', 'Ils scannent votre QR code en boutique, laissent leur e-mail de façon sécurisée, puis jouent à la roue sur leur téléphone.'],
  ['Puis-je gérer plusieurs établissements ?', 'Oui : créez un QR code par emplacement et suivez les performances de chacun dans vos statistiques.'],
];

function Section({ children, className = '', id }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 py-16 ${className}`}>{children}</section>;
}

export default async function LandingPage() {
  // ---------- Données réelles : entreprises publiques + avis approuvés ----------
  // Requêtes agrégées (pas de N+1) : 1 findMany entreprises, 1 agrégation des avis,
  // 1 pour les logos, 1 pour les avis récents. Limites : 12 entreprises, 6 avis.
  let companies = [];
  let trustLogos = [];
  let recentReviews = [];
  try {
    const publicCompanies = await db.company.findMany({
      where: { active: true, isPublic: true },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const ids = publicCompanies.map((c) => c.id);

    if (ids.length > 0) {
      // Clients des entreprises publiques (pour relier avis -> entreprise)
      const custs = await db.customer.findMany({
        where: { companyId: { in: ids } },
        select: { id: true, companyId: true },
      });
      const custIds = custs.map((c) => c.id);
      const compOf = Object.fromEntries(custs.map((c) => [c.id, c.companyId]));

      const [reviews, logos] = await Promise.all([
        db.review.findMany({
          where: { status: 'approved', customerId: { in: custIds } },
          select: { rating: true, customerId: true },
        }),
        db.companySetting.findMany({
          where: { key: 'BRAND_LOGO', companyId: { in: ids }, value: { not: '' } },
          select: { companyId: true, value: true },
        }),
      ]);

      // Agrégation en mémoire (note moyenne + nombre d'avis APPROUVÉS par entreprise)
      const perCompany = {};
      for (const r of reviews) {
        const cid = compOf[r.customerId];
        if (!cid) continue;
        (perCompany[cid] ??= { sum: 0, count: 0 });
        perCompany[cid].sum += r.rating;
        perCompany[cid].count += 1;
      }

      companies = publicCompanies.map((c) => {
        const a = perCompany[c.id];
        return {
          ...c,
          rating: a && a.count ? a.sum / a.count : null,
          reviewCount: a?.count || 0,
          logo: logos.find((l) => l.companyId === c.id)?.value || null,
        };
      });

      // Bloc confiance : logos réels des entreprises qui en ont un
      trustLogos = companies.filter((c) => c.logo).slice(0, 10);

      // Avis récents (approuvés uniquement), 6 max, avec nom d'entreprise
      recentReviews = await db.review.findMany({
        where: { status: 'approved', customer: { companyId: { in: ids }, anonymizedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          rating: true, comment: true, createdAt: true,
          customer: { select: { firstName: true, company: { select: { name: true, slug: true } } } },
        },
      });
    }
  } catch {
    // base indisponible (build) : la vitrine reste fonctionnelle sans données
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ---------- Header ---------- */}
      <NavBar
        brand="🎡 Roue de la Chance"
        items={[
          { href: '#entreprises', label: 'Entreprises' },
          { href: '#fonctionnalites', label: 'Fonctionnalités' },
          { href: '#etapes', label: 'Comment ça marche' },
          { href: '#faq', label: 'FAQ' },
        ]}
        actions={
          <>
            <ThemeToggle />
            <Link href="/admin/login" className="rounded-lg px-3 py-2.5 font-medium text-gray-700 hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-800">Se connecter</Link>
            <Link href="/inscription" className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-md transition hover:bg-brand-700">Créer mon entreprise</Link>
          </>
        }
      />

      {/* ---------- Hero ---------- */}
      <Section className="grid items-center gap-10 lg:grid-cols-2 !pt-20">
        <div>
          <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
            Fidélisation & avis clients
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Transformez chaque client en <span className="text-brand-600">ambassadeur</span>, un tour de roue à la fois.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Vos clients scannent un QR code, jouent à la roue et gagnent un cadeau.
            Vous récoltez e-mails, avis Google et fidélité. En magasin, en salon ou en ligne.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className="btn-primary">🚀 Créer mon entreprise</Link>
            <Link href="/admin/login" className="btn-secondary">Se connecter</Link>
          </div>
          <p className="mt-3 text-sm text-gray-400">Essai gratuit · Sans carte bancaire · Prêt en 2 minutes</p>
        </div>
        <DemoWheel />
      </Section>

      {/* ---------- Ces entreprises nous font confiance (logos réels) ---------- */}
      {trustLogos.length > 0 && (
        <Section className="rounded-3xl bg-gray-50 !py-12">
          <h2 className="text-center text-xl font-bold uppercase tracking-wide text-gray-500">Ces entreprises nous font confiance</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {trustLogos.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c.id} src={c.logo} alt={c.name} loading="lazy"
                className="h-14 w-auto max-w-[140px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" />
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            Ils utilisent notre solution pour recueillir les avis de leurs clients et développer leur visibilité.
          </p>
        </Section>
      )}

      {/* ---------- Cas d'usage ---------- */}
      <Section className="rounded-3xl bg-gray-50">
        <h2 className="text-center text-3xl font-bold">Pensé pour tous les points de vente</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <div key={u.title} className="card !shadow-md">
              <div className="text-4xl" aria-hidden="true">{u.icon}</div>
              <h3 className="mt-3 font-bold">{u.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{u.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Entreprises participantes (données réelles) ---------- */}
      <Section id="entreprises">
        <h2 className="text-center text-3xl font-bold">Découvrez les entreprises participantes</h2>
        {companies.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-400">Les premières entreprises arrivent bientôt — créez la vôtre !</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map((c) => (
              <div key={c.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
                <div className="flex items-center gap-3">
                  {c.logo
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-10 w-10 rounded-lg object-contain" loading="lazy" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-lg">🏪</span>}
                  <h3 className="font-bold">{c.name}</h3>
                </div>
                <p className="mt-3 text-sm">
                  {c.rating != null
                    ? <><Stars rating={c.rating} /> <span className="font-semibold">{c.rating.toFixed(1).replace('.', ',')}</span></>
                    : <span className="text-gray-400">Pas encore d’avis</span>}
                </p>
                <p className="text-xs text-gray-500">{c.reviewCount} avis</p>
                <Link href={`/entreprises/${c.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
                  Voir les avis →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ---------- Fonctionnalités ---------- */}
      <Section id="fonctionnalites" className="rounded-3xl bg-gray-50">
        <h2 className="text-center text-3xl font-bold">Tout ce qu’il faut pour une opération réussie</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg">
              <div className="text-3xl" aria-hidden="true">{f.icon}</div>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Comment ça marche ---------- */}
      <Section id="etapes" className="rounded-3xl bg-gray-900 text-white">
        <h2 className="text-center text-3xl font-bold">Comment ça marche ?</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl bg-gray-800 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-extrabold" aria-hidden="true">{s.n}</div>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-300">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- Avis récents (réels, approuvés uniquement) ---------- */}
      {recentReviews.length > 0 && (
        <Section>
          <h2 className="text-center text-3xl font-bold">Les avis de leurs clients</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentReviews.map((r, i) => (
              <blockquote key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <Stars rating={r.rating} />
                {r.comment && <p className="mt-2 text-sm text-gray-600">« {r.comment} »</p>}
                <footer className="mt-3 text-xs text-gray-400">
                  {r.customer.firstName || 'Un client'} —{' '}
                  <Link href={`/entreprises/${r.customer.company.slug}`} className="font-semibold text-brand-600 hover:underline">
                    {r.customer.company.name}
                  </Link>
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- FAQ ---------- */}
      <Section id="faq" className="max-w-3xl">
        <h2 className="text-center text-3xl font-bold">Questions fréquentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-gray-200 bg-gray-50 p-4 open:bg-white">
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
        <h2 className="text-3xl font-bold">Vous êtes une entreprise ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-50">
          Créez votre roue de la chance, collectez des avis et fidélisez vos clients dès aujourd’hui.
        </p>
        <Link href="/inscription" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-brand-700 shadow-lg transition hover:bg-brand-50">
          🚀 Créer mon espace gratuitement
        </Link>
      </Section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-extrabold text-brand-700">🎡 Roue de la Chance</p>
            <p className="mt-2 text-sm text-gray-500">La roue de la chance qui transforme vos clients en ambassadeurs.</p>
          </div>
          <nav className="text-sm" aria-label="Liens utiles">
            <p className="font-semibold text-gray-700">Liens</p>
            <ul className="mt-2 space-y-1 text-gray-500">
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
          © {new Date().getFullYear()} Roue de la Chance — Jeu gratuit sans obligation d’achat.
        </p>
      </footer>
    </div>
  );
}
