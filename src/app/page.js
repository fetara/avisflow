import Link from 'next/link';
import { db } from '@/lib/db';
import { Rocket, PlayCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';
import LangSwitcher from '@/components/LangSwitcher';
import DrawDemo from '@/components/DrawDemo';
import { getLangFromCookies, t } from '@/i18n';

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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AvisFlow',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Plateforme de fidélisation et d’engagement client basée sur QR codes, jeux et récompenses.',
};

const BENEFITS = [
  { icon: '🎡', key: '1' }, { icon: '⭐', key: '2' }, { icon: '🔄', key: '3' },
];

const SECTORS = [
  { icon: '🍔', name: 'Restaurants' }, { icon: '💇', name: 'Salons & Barbiers' },
  { icon: '🛍️', name: 'Commerces' }, { icon: '💅', name: 'Beauté & Bien-être' },
  { icon: '🚗', name: 'Services automobiles' }, { icon: '🎪', name: 'Événements' },
];

const FLOW = [
  { n: '01', icon: '📱', key: '1' },
  { n: '02', icon: '🎡', key: '2' },
  { n: '03', icon: '🎁', key: '3' },
  { n: '04', icon: '⭐', key: '4' },
  { n: '05', icon: '🔄', key: '5' },
];

const FAQ_KEYS = [['faq1q', 'faq1a'], ['faq2q', 'faq2a'], ['faq3q', 'faq3a'], ['faq4q', 'faq4a'], ['faq5q', 'faq5a'], ['faq6q', 'faq6a'], ['faq7q', 'faq7a']];

function Section({ children, className = '', id }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 py-16 sm:py-20 ${className}`}>{children}</section>;
}

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`${rating.toFixed(1)}/5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function PhoneMockup() {
  const colors = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#db2777', '#f97316', '#10b981', '#6366f1'];
  const step = 360 / colors.length;
  const gradient = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl dark:border-gray-700">
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
        <button type="button" tabIndex={-1} className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg">TOURNER LA ROUE</button>
        <p className="mt-3 text-center text-[10px] text-gray-400">Ce que vos clients verront sur leur téléphone</p>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const lang = getLangFromCookies();
  const T = (k) => t(lang, k);
  const L = (en, ar, fr) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

  // ---------- Données réelles (agrégées, pas de N+1) ----------
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
      const custs = await db.customer.findMany({ where: { companyId: { in: ids } }, select: { id: true, companyId: true } });
      const compOf = Object.fromEntries(custs.map((c) => [c.id, c.companyId]));
      const [reviews, logos] = await Promise.all([
        db.review.findMany({ where: { status: 'approved', customerId: { in: custs.map((c) => c.id) } }, select: { rating: true, customerId: true } }),
        db.companySetting.findMany({ where: { key: 'BRAND_LOGO', companyId: { in: ids }, value: { not: '' } }, select: { companyId: true, value: true } }),
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
        .sort((a, b) => b.reviewCount - a.reviewCount);
      trustLogos = companies.filter((c) => c.reviewCount > 0 && c.logo).slice(0, 8);
      recentReviews = await db.review.findMany({
        where: { status: 'approved', customer: { companyId: { in: ids }, anonymizedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { rating: true, comment: true, customer: { select: { firstName: true, company: { select: { name: true, slug: true } } } } },
      });
      dbPlans = await db.subscriptionPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 3 });
    }
  } catch {
    // base indisponible : vitrine fonctionnelle sans données
  }

  const companiesWithReviews = companies.filter((c) => c.reviewCount > 0).slice(0, 8);

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <NavBar
        brand="🎡 AvisFlow"
        items={[
          { href: '#fonctionnalites', label: T('common.features') },
          { href: '#etapes', label: T('common.how') },
          { href: '/entreprises', label: T('common.companies') },
          { href: '/tarifs', label: T('common.pricing') },
        ]}
        actions={
          <>
            <LangSwitcher current={lang} />
            <ThemeToggle />
            <Link href="/admin/login" className="rounded-lg px-3 py-2.5 font-medium text-gray-700 hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-800">{T('common.login')}</Link>
            <Link href="/inscription" className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-md transition hover:bg-brand-700">{T('common.start')}</Link>
          </>
        }
      />

      {/* HERO */}
      <Section className="grid items-center gap-12 lg:grid-cols-2 !pt-16 sm:!pt-24">
        <div>
          <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">{T('landing.badge')}</p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            {T('landing.heroTitle1')} <span className="text-brand-600">{T('landing.heroTitle2')}</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">{T('landing.heroSub')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className="btn-primary"><Rocket className="h-5 w-5" /> {T('common.start')}</Link>
            <a href="#etapes" className="btn-secondary"><PlayCircle className="h-5 w-5" /> {T('common.seeHow')}</a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{T('landing.modeWheel')}</span>
            <span className="text-xs text-gray-400">+</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{T('landing.modeRaffle')}</span>
          </div>
          <p className="mt-3 text-sm text-gray-400">{T('landing.freeTrial')}</p>
        </div>
        <PhoneMockup />
      </Section>

      {/* Bénéfices */}
      <Section className="!py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.key} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-4xl" aria-hidden="true">{b.icon}</div>
              <h2 className="mt-3 text-lg font-bold">{T(`landing.benefit${b.key}`)}</h2>
              <p className="mt-1 text-sm text-gray-500">{T(`landing.benefit${b.key}t`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Confiance (logos réels, entreprises avec avis) */}
      {trustLogos.length > 0 && (
        <Section className="rounded-3xl bg-gray-50 !py-12">
          <h2 className="text-center text-xl font-bold uppercase tracking-wide text-gray-500">{T('landing.trustTitle')}</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {trustLogos.map((c) => (
              <Link key={c.id} href={`/entreprises/${c.slug}`} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt={c.name} loading="lazy" className="mx-auto h-14 w-auto max-w-[130px] object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0" />
                <span className="mt-1 block text-xs text-gray-500">{c.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Comment ça marche (5 étapes) */}
      <Section id="etapes" className="rounded-3xl bg-gray-900 text-white">
        <h2 className="text-center text-3xl font-bold">{T('landing.howTitle')}</h2>
        <p className="mt-2 text-center text-gray-400">{T('landing.howSub')}</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl bg-gray-800 p-6 text-center">
              {i < FLOW.length - 1 && <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-brand-500 lg:block rtl:hidden" aria-hidden="true">→</span>}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/20 text-3xl" aria-hidden="true">{s.icon}</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-400">{s.n}</p>
              <h3 className="mt-1 font-bold">{T(`landing.step${s.key}`)}</h3>
              <p className="mt-1 text-sm text-gray-300">{T(`landing.step${s.key}t`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Exemple concret */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">{L('An example in seconds', 'مثال في ثوانٍ', 'Un exemple en quelques secondes')}</h2>
            <p className="mt-3 text-gray-600">
              {L(
                'A customer finishes their meal. On the table, a QR code. They scan, spin the wheel, win a dessert and leave a five-star review. The following week, they come back to use their reward.',
                'ينهي العميل وجبته. على الطاولة رمز QR. يمسحه، يدير العجلة، يفوز بحلوى ويترك تقييمًا بخمس نجوم. وفي الأسبوع التالي، يعود لاستخدام مكافأته.',
                'Un client termine son repas. Sur la table, un QR code. Il scanne, tourne la roue, gagne un dessert et laisse un avis cinq étoiles. La semaine suivante, il revient utiliser sa récompense.',
              )}
            </p>
            <p className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {L('A simple QR code turns an ordinary visit into a memorable experience.', 'رمز QR بسيط يحوّل زيارة عادية إلى تجربة لا تُنسى.', 'Un simple QR code transforme une visite classique en expérience mémorable.')}
            </p>
          </div>
          <ol className="space-y-3">
            {[
              L('The customer finishes their meal', 'ينهي العميل وجبته', 'Client termine son repas'),
              L('📱 Scans the QR', '📱 يمسح رمز QR', '📱 Scanne le QR'),
              L('🎡 Spins the wheel', '🎡 يدير العجلة', '🎡 Tourne la roue'),
              L('🎁 Wins a reward', '🎁 يفوز بمكافأة', '🎁 Gagne une récompense'),
              L('⭐ Shares their experience', '⭐ يشارك تجربته', '⭐ Partage son expérience'),
              L('🔄 Comes back later', '🔄 يعود لاحقًا', '🔄 Revient plus tard'),
            ].map((txt, i) => (
              <li key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 text-sm font-medium shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                {txt}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Tirage au sort en direct (démo animée) */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">{L('🎲 Live raffle draw', '🎲 سحب مباشر', '🎲 Tirage au sort en direct')}</h2>
            <p className="mt-3 text-gray-600">
              {L(
                'Organize a raffle at your events: participants sign up from their phone, and the winners are drawn live on the big screen — with verifiable fairness.',
                'نظّم سحبًا في فعالياتك: يسجل المشاركون من هواتفهم، ويُسحب الفائزون مباشرة على الشاشة الكبيرة — بعدالة قابلة للتحقق.',
                'Organisez un tirage lors de vos événements : les participants s’inscrivent depuis leur téléphone, et les gagnants sont tirés en direct sur grand écran — avec une équité vérifiable.',
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ {L('Fullscreen projection mode', 'وضع العرض بملء الشاشة', 'Mode projection plein écran')}</li>
              <li>✓ {L('Verifiable randomness (server-side)', 'Aléa vérifiable côté serveur', 'Aléa vérifiable côté serveur')}</li>
              <li>✓ {L('Winners export (CSV)', 'Export des gagnants (CSV)', 'Export des gagnants (CSV)')}</li>
            </ul>
          </div>
          <DrawDemo />
        </div>
      </Section>

      {/* Secteurs */}
      <Section className="rounded-3xl bg-gray-50">
        <h2 className="text-center text-3xl font-bold">{L('Built for every sector', 'مصمم لكل القطاعات', 'Fait pour tous les secteurs')}</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SECTORS.map((s) => (
            <div key={s.name} className="rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">{s.icon}</div>
              <p className="mt-2 text-sm font-semibold">{s.name}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">{L('…and much more.', '…والمزيد أيضًا.', '…et bien plus encore.')}</p>
      </Section>

      {/* Fonctionnalités */}
      <Section id="fonctionnalites">
        <h2 className="text-center text-3xl font-bold">{L('Everything you need to engage customers', 'كل ما تحتاجه لاشراك عملائك', 'Tout ce qu’il faut pour engager vos clients')}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🎁', en: ['Custom rewards', 'Prizes, photos, odds, stock: you stay in control.'], ar: ['جوائز مخصصة', 'الجوائز والصور والاحتمالات والمخزون تحت سيطرتك.'], fr: ['Récompenses sur mesure', 'Lots, photos, probabilités, stocks : vous gardez le contrôle.'] },
            { icon: '🎨', en: ['Customizable wheel', 'Colors, background, logo, messages: your brand.'], ar: ['عجلة قابلة للتخصيص', 'الألوان والخلفية والشعار والرسائل بهويتك.'], fr: ['Roue personnalisable', 'Couleurs, image de fond, logo, messages : votre image de marque.'] },
            { icon: '⭐', en: ['Moderated reviews', 'Configurable auto-publish, no unwanted reviews online.'], ar: ['تقييمات مُدارة', 'نشر تلقائي قابل للضبط، لا تقييمات غير مرغوبة.'], fr: ['Avis modérés', 'Auto-publication configurable, aucun avis indésirable en ligne.'] },
            { icon: '🏆', en: ['Winners management', 'Unique gift codes with in-store QR validation.'], ar: ['إدارة الفائزين', 'رموز هدايا فريدة مع تحقق QR في المتجر.'], fr: ['Gestion des gagnants', 'Codes cadeaux uniques avec QR de validation en caisse.'] },
            { icon: '🎲', en: ['Live raffle draw', 'Project the winners draw at your event — verifiable fairness.'], ar: ['سحب مباشر', 'اعرض سحب الفائزين في فعاليتك — عدالة قابلة للتحقق.'], fr: ['Tirage au sort en direct', 'Projetez le tirage des gagnants à votre événement — équité vérifiable.'] },
            { icon: '📊', en: ['Clear statistics', 'Entries, reviews, conversion — per QR and period.'], ar: ['إحصائيات واضحة', 'المشاركات والتقييمات والتحويل — لكل رمز وكل فترة.'], fr: ['Statistiques claires', 'Participations, avis, conversion — par QR et par période.'] },
            { icon: '🔐', en: ['Isolated data', 'Each business strictly owns its own.'], ar: ['بيانات معزولة', 'لكل شركة بياناتها الخاصة بشكل صارم.'], fr: ['Données isolées', 'Chaque entreprise a strictement les siennes.'] },
          ].map((f) => {
            const [title, text] = lang === 'en' ? f.en : lang === 'ar' ? f.ar : f.fr;
            return (
              <div key={f.icon} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <div className="text-3xl" aria-hidden="true">{f.icon}</div>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{text}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Dashboard illustré */}
      <Section className="rounded-3xl bg-gray-900 text-white">
        <h2 className="text-center text-3xl font-bold">{L('All your engagement in one place', 'كل تفاعلات عملائك في مكان واحد', 'Tout votre engagement au même endroit')}</h2>
        <p className="mt-2 text-center text-sm text-gray-400">{L('Illustrative dashboard preview — your real stats live in your workspace.', 'معاينة توضيحية للوحة التحكم — إحصائياتك الحقيقية في مساحتك.', 'Aperçu illustratif du tableau de bord — vos vraies statistiques sont dans votre espace.')}</p>
        <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-gray-800 p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">📊 {L('This month', 'هذا الشهر', 'Ce mois-ci')}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['1 248', L('Entries', 'مشاركات', 'Participations')],
              ['327', L('Reviews', 'تقييمات', 'Avis')],
              ['841', L('Rewards', 'مكافآت', 'Récompenses')],
              ['26 %', L('Conversion', 'التحويل', 'Conversion')],
            ].map(([v, l]) => (
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
        </div>
      </Section>

      {/* Entreprises participantes (réelles, avec avis) */}
      <Section id="entreprises">
        <h2 className="text-center text-3xl font-bold">{T('landing.companiesTitle')}</h2>
        {companiesWithReviews.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-400">
            {L('The first businesses are coming soon — ', 'الشركات الأولى قادمة قريبًا — ', 'Les premières entreprises arrivent bientôt — ')}
            <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">{L('create yours', 'أنشئ شركتك', 'créez la vôtre')}</Link> !
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
                <p className="text-xs text-gray-500">{c.reviewCount} {L('reviews', 'تقييمات', 'avis')}</p>
                <Link href={`/entreprises/${c.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
                  {L('See reviews →', 'عرض التقييمات →', 'Voir les avis →')}
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link href="/entreprises" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            {L('See all businesses →', 'عرض جميع الشركات →', 'Voir toutes les entreprises →')}
          </Link>
        </p>
      </Section>

      {/* Avis récents (réels approuvés) */}
      {recentReviews.length > 0 && (
        <Section id="avis" className="rounded-3xl bg-gray-50">
          <h2 className="text-center text-3xl font-bold">{T('landing.reviewsTitle')}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentReviews.map((r, i) => (
              <blockquote key={i} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <Stars rating={r.rating} />
                {r.comment && <p className="mt-2 text-sm text-gray-600">« {r.comment} »</p>}
                <footer className="mt-3 text-xs text-gray-400">
                  {r.customer.firstName || L('A customer', 'عميل', 'Un client')} —{' '}
                  <Link href={`/entreprises/${r.customer.company.slug}`} className="font-semibold text-brand-600 hover:underline">{r.customer.company.name}</Link>
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* Tarifs (plans réels de la base) */}
      <Section id="tarifs">
        <h2 className="text-center text-3xl font-bold">{T('landing.pricingTitle')}</h2>
        <p className="mt-2 text-center text-gray-500">{T('landing.pricingSub')}</p>
        {dbPlans.length === 0 ? (
          <p className="card mt-10 text-center text-sm text-gray-400">
            {L('Our plans are in preparation.', 'عروضنا قيد التحضير.', 'Nos offres sont en préparation.')}{' '}
            <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">{T('common.start')}</Link>
          </p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {dbPlans.map((p) => (
              <div key={p.id} className={`relative flex flex-col rounded-3xl border p-7 shadow-sm ${p.slug === 'business' ? 'border-brand-600 shadow-xl ring-2 ring-brand-600/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'}`}>
                {p.slug === 'business' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                    {L('Most popular', 'الأكثر شعبية', 'Le plus populaire')}
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-gray-500">{p.description}</p>}
                <p className="mt-3">
                  <span className="text-4xl font-extrabold">{p.priceMonthly == null ? '—' : `${Number(p.priceMonthly)}€`}</span>
                  {p.priceMonthly != null && <span className="text-gray-500"> /{L('mo', 'شهر', 'mois')}</span>}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {(Array.isArray(p.features) ? p.features : []).map((label) => (
                    <li key={label} className="flex items-center gap-2"><span aria-hidden="true" className="text-emerald-500">✓</span>{label}</li>
                  ))}
                </ul>
                <Link href="/inscription" className={`mt-6 rounded-xl py-3 text-center text-sm font-bold transition ${p.slug === 'business' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                  {L('Free trial', 'تجربة مجانية', 'Essai gratuit')}
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link href="/tarifs" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            {L('See plan details →', 'عرض تفاصيل الخطط →', 'Voir le détail des plans →')}
          </Link>
        </p>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="max-w-3xl">
        <h2 className="text-center text-3xl font-bold">{T('landing.faqTitle')}</h2>
        <div className="mt-8 space-y-3">
          {FAQ_KEYS.map(([qk, ak]) => {
            const q = T(`landing.${qk}`); const a = T(`landing.${ak}`);
            return (
              <details key={qk} className="group rounded-xl border border-gray-200 bg-gray-50 p-4 open:bg-white dark:border-gray-800 dark:bg-gray-900">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="mr-2 inline-block text-brand-600 transition group-open:rotate-90">▸</span>{q}
                </summary>
                <p className="mt-2 pl-6 text-sm text-gray-600">{a}</p>
              </details>
            );
          })}
        </div>
      </Section>

      {/* CTA final */}
      <Section className="rounded-3xl bg-brand-600 text-center text-white">
        <h2 className="text-3xl font-bold sm:text-4xl">{T('landing.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-50">{T('landing.ctaSub')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/inscription" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-brand-700 shadow-lg transition hover:bg-brand-50"><Rocket className="h-5 w-5" /> {T('common.start')}</Link>
          <a href="#etapes" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"><PlayCircle className="h-5 w-5" /> {T('common.seeDemo')}</a>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-extrabold text-brand-700">🎡 AvisFlow</p>
            <p className="mt-2 text-sm text-gray-500">{T('landing.heroSub')}</p>
          </div>
          <nav className="text-sm" aria-label="Liens utiles">
            <p className="font-semibold text-gray-700">{L('Links', 'روابط', 'Liens')}</p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li><Link href="/entreprises" className="hover:text-brand-600">{T('common.companies')}</Link></li>
              <li><Link href="/admin/login" className="hover:text-brand-600">{T('common.login')}</Link></li>
              <li><Link href="/inscription" className="hover:text-brand-600">{L('Create my business', 'أنشئ شركتي', 'Créer mon entreprise')}</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-brand-600">{L('Legal notice', 'المعلومات القانونية', 'Mentions légales')}</Link></li>
              <li><Link href="/confidentialite" className="hover:text-brand-600">{L('Privacy', 'الخصوصية', 'Confidentialité')}</Link></li>
              <li><Link href="/reglement-jeu" className="hover:text-brand-600">{L('Game rules', 'قواعد اللعبة', 'Règlement du jeu')}</Link></li>
            </ul>
          </nav>
          <div className="text-sm">
            <p className="font-semibold text-gray-700">{L('Contact', 'اتصال', 'Contact')}</p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li>✉️ <a href="mailto:contact@example.com" className="hover:text-brand-600">contact@example.com</a></li>
              <li>🛡️ {L('7/7 support for businesses', 'دعم 7/7 للشركات', 'Support 7j/7 pour les entreprises')}</li>
            </ul>
          </div>
        </div>
        <p className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} AvisFlow
        </p>
      </footer>
    </div>
  );
}
