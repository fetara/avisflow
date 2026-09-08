import Link from 'next/link';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = { title: 'Roue de la Chance — Transformez vos clients en ambassadeurs' };

/* ---------- Roue décorative animée (démo visuelle, CSS pur) ---------- */
function DemoWheel() {
  const colors = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#db2777', '#f97316', '#10b981'];
  const step = 360 / colors.length;
  const gradient = colors
    .map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`)
    .join(', ');

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs" aria-hidden="true">
      {/* Aiguille */}
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl">▼</div>
      <div
        className="animate-wheel relative h-full w-full rounded-full border-8 border-white shadow-2xl"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-3xl shadow-lg">
          🎡
        </div>
      </div>
    </div>
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
  { icon: '🎨', title: 'Roue personnalisable', text: 'Textes d’accueil, seuils d’auto-publication des avis, lien Google : tout se règle en quelques clics.' },
  { icon: '📊', title: 'Statistiques en temps réel', text: 'Scans, inscriptions, parties jouées, avis collectés : un entonnoir complet, même par QR code.' },
  { icon: '👥', title: 'Multi-utilisateurs', text: 'Attribuez des droits fins par utilisateur : lots, roue, modération, statistiques — chacun son périmètre.' },
  { icon: '📱', title: 'QR codes prêts à imprimer', text: 'Générez des QR codes et affiches PDF par emplacement (caisse, comptoir, vitrine) et suivez leurs performances.' },
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
  ['Un client peut-il jouer plusieurs fois ?', 'Non : un seul tour par e-mail validé et par entreprise. Le tirage est effectué côté serveur, équitablement.'],
  ['Mes données sont-elles séparées des autres commerces ?', 'Oui. Chaque entreprise a ses lots, ses clients, ses avis et ses réglages, isolés par construction.'],
  ['Comment mes clients participent-ils ?', 'Ils scannent votre QR code en boutique, laissent leur e-mail de façon sécurisée, puis jouent à la roue sur leur téléphone.'],
  ['Puis-je gérer plusieurs établissements ?', 'Oui : créez un QR code par emplacement et suivez les performances de chacun dans vos statistiques.'],
];

function Section({ children, className = '', id }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 py-16 ${className}`}>{children}</section>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ---------- Header (responsive : burger mobile) ---------- */}
      <NavBar
        brand="🎡 Roue de la Chance"
        items={[
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

      {/* ---------- Fonctionnalités ---------- */}
      <Section id="fonctionnalites">
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

      {/* ---------- FAQ / tarifs ---------- */}
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
        <p className="mt-8 rounded-2xl bg-brand-50 p-6 text-center text-sm text-gray-600">
          💡 <strong>Tarifs :</strong> offre de lancement — <strong>essai gratuit pendant la beta</strong>.
          <Link href="/inscription" className="ml-1 font-semibold text-brand-700 hover:underline">Créez votre entreprise →</Link>
        </p>
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
