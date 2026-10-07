import Link from 'next/link';
import { db } from '@/lib/db';
import {
  Rocket, PlayCircle, QrCode, Dices, Star, Repeat, BarChart3, Gift,
  Palette, ShieldCheck, Check,
} from 'lucide-react';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';
import LangSwitcher from '@/components/LangSwitcher';
import PhoneMockup from '@/components/PhoneMockup';
import DrawDemo from '@/components/DrawDemo';
import { getLangFromCookies, t } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  { icon: QrCode, key: '1' },
  { icon: Star, key: '2' },
  { icon: Repeat, key: '3' },
];

const SECTORS = ['🍔 Restaurants', '💇 Salons & Barbiers', '🛍️ Commerces', '💅 Beauté & Bien-être', '🚗 Automobile', '🎪 Événements'];

const FLOW = [
  { n: '01', icon: QrCode, key: '1' },
  { n: '02', icon: Dices, key: '2' },
  { n: '03', icon: Gift, key: '3' },
  { n: '04', icon: Star, key: '4' },
  { n: '05', icon: Repeat, key: '5' },
];

const FEATURES = [
  { icon: Gift, en: ['Custom rewards', 'Prizes, photos, odds, stock: you stay in control.'], ar: ['جوائز مخصصة', 'الجوائز والصور والاحتمالات والمخزون تحت سيطرتك.'], fr: ['Récompenses sur mesure', 'Lots, photos, probabilités, stocks : vous gardez le contrôle.'] },
  { icon: Palette, en: ['Customizable games', 'Wheel colors, background, logo, messages: your brand.'], ar: ['ألعاب قابلة للتخصيص', 'الألوان والخلفية والشعار والرسائل بهويتك.'], fr: ['Jeux personnalisables', 'Couleurs, image de fond, logo, messages : votre image de marque.'] },
  { icon: Star, en: ['Moderated reviews', 'Configurable auto-publish, no unwanted reviews online.'], ar: ['تقييمات مُدارة', 'نشر تلقائي قابل للضبط، لا تقييمات غير مرغوبة.'], fr: ['Avis modérés', 'Auto-publication configurable, aucun avis indésirable en ligne.'] },
  { icon: BarChart3, en: ['Clear statistics', 'Entries, reviews, conversion — per QR and period.'], ar: ['إحصائيات واضحة', 'المشاركات والتقييمات والتحويل — لكل رمز وكل فترة.'], fr: ['Statistiques claires', 'Participations, avis, conversion — par QR et par période.'] },
  { icon: ShieldCheck, en: ['Isolated data', 'Each business strictly owns its own.'], ar: ['بيانات معزولة', 'لكل شركة بياناتها الخاصة بشكل صارم.'], fr: ['Données isolées', 'Chaque entreprise a strictement les siennes.'] },
];

const FAQ_KEYS = [['faq1q', 'faq1a'], ['faq2q', 'faq2a'], ['faq3q', 'faq3a'], ['faq4q', 'faq4a'], ['faq5q', 'faq5a'], ['faq6q', 'faq6a'], ['faq7q', 'faq7a']];

function Eyebrow({ children }) {
  return <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">{children}</p>;
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-gray-500">{sub}</p>}
    </div>
  );
}

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-400" aria-label={`${rating.toFixed(1)}/5`}>
      {'★'.repeat(full)}<span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - full)}</span>
    </span>
  );
}


export default async function LandingPage() {
  const lang = getLangFromCookies();
  const T = (k) => t(lang, k);
  const L = (en, ar, fr) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

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
        brand={<span className="inline-flex items-center gap-2"><img src="/icon.svg" alt="" className="h-7 w-7" /> <span className="text-xl font-extrabold text-brand-700">AvisFlow</span></span>}
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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">{T('landing.badge')}</p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            {T('landing.heroTitle1')} <span className="text-brand-600">{T('landing.heroTitle2')}</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">{T('landing.heroSub')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className="btn-primary"><Rocket className="h-5 w-5" /> {T('common.start')}</Link>
            <a href="#etapes" className="btn-secondary"><PlayCircle className="h-5 w-5" /> {T('common.seeHow')}</a>
          </div>
          <p className="mt-3 text-sm text-gray-400">{T('landing.freeTrial')}</p>
        </div>
        <PhoneMockup />
      </section>

      {/* Bénéfices */}
      <section className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.key} className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600"><Icon className="h-6 w-6" /></span>
                <div>
                  <h2 className="font-bold">{T(`landing.benefit${b.key}`)}</h2>
                  <p className="mt-1 text-sm text-gray-500">{T(`landing.benefit${b.key}t`)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confiance (logos réels) */}
      {trustLogos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400">{T('landing.trustTitle')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {trustLogos.map((c) => (
              <Link key={c.id} href={`/entreprises/${c.slug}`} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt={c.name} loading="lazy" className="mx-auto h-12 w-auto max-w-[120px] object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0" />
                <span className="mt-1 block text-xs text-gray-500">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comment ça marche */}
      <section id="etapes" className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead
          eyebrow={T('common.how')}
          title={L('From QR scan to repeat visit', 'من مسح QR إلى العودة', 'Du scan QR au retour client')}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {i < FLOW.length - 1 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-brand-400 lg:block rtl:hidden" aria-hidden="true">→</span>}
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.n}</span>
                </div>
                <h3 className="mt-3 font-bold">{T(`landing.step${s.key}`)}</h3>
                <p className="mt-1 text-sm text-gray-500">{T(`landing.step${s.key}t`)}</p>
              </div>
            );
          })}
        </div>
      </section>

     
      {/* Fonctionnalités + secteurs */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead
          eyebrow={T('common.features')}
          title={L('Everything you need to engage customers', 'كل ما تحتاجه لاشراك عملائك', 'Tout ce qu’il faut pour engager vos clients')}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            const tx = lang === 'en' ? f.en : lang === 'ar' ? f.ar : f.fr;
            return (
              <div key={f.en[0]} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-bold">{tx[0]}</h3>
                <p className="mt-1 text-sm text-gray-500">{tx[1]}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
          {L('Used across sectors:', 'مستخدم في قطاعات متعددة:', 'Utilisé dans de nombreux secteurs :')}{' '}
          {SECTORS.join(' · ')} — {L('and more.', 'et plus.', 'et plus.')}
        </p>
      </section>

      {/* Dashboard illustré */}
      <section className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead
            eyebrow={L('Your dashboard', 'لوحة التحكم', 'Votre tableau de bord')}
            title={L('All your engagement in one place', 'كل تفاعلات عملائك في مكان واحد', 'Tout votre engagement au même endroit')}
            sub={L('Illustrative preview — your real stats live in your workspace.', 'معاينة توضيحية — إحصائياتك الحقيقية في مساحتك.', 'Aperçu illustratif — vos vraies statistiques sont dans votre espace.')}
          />
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">{L('This month', 'هذا الشهر', 'Ce mois-ci')}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ['1 248', L('Entries', 'مشاركات', 'Participations')],
                ['327', L('Reviews', 'تقييمات', 'Avis')],
                ['841', L('Rewards', 'مكافآت', 'Récompenses')],
                ['26 %', L('Conversion', 'التحويل', 'Conversion')],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-gray-100 p-4 text-center dark:border-gray-800">
                  <p className="text-2xl font-extrabold text-brand-600">{v}</p>
                  <p className="mt-1 text-xs text-gray-400">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-6" aria-hidden="true">
              <div className="flex h-28 items-end gap-2">
                {[['Lun', 35], ['Mar', 50], ['Mer', 42], ['Jeu', 65], ['Ven', 58], ['Sam', 80], ['Dim', 72]].map(([d, h]) => (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-20 w-full items-end rounded-t-lg bg-brand-100 dark:bg-gray-800">
                      <div className="w-full rounded-t-lg bg-brand-500" style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Entreprises participantes */}
      <section id="entreprises" className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead
          eyebrow={T('common.companies')}
          title={T('landing.companiesTitle')}
          sub={companiesWithReviews.length === 0 ? L('The first businesses are coming soon — create yours!', 'الشركات الأولى قادمة قريبًا — أنشئ شركتك!', 'Les premières entreprises arrivent bientôt — créez la vôtre !') : null}
        />
        {companiesWithReviews.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companiesWithReviews.map((c) => (
              <div key={c.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  {c.logo
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-10 w-10 rounded-lg object-contain" loading="lazy" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-lg">🏪</span>}
                  <h3 className="font-bold">{c.name}</h3>
                </div>
                <p className="mt-3 text-sm"><Stars rating={c.rating} /> <span className="font-semibold">{c.rating.toFixed(1).replace('.', ',')}</span></p>
                <p className="text-xs text-gray-500">{c.reviewCount} {L('reviews', 'تقييمات', 'avis')}</p>
                <Link href={`/entreprises/${c.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                  {L('See reviews', 'عرض التقييمات', 'Voir les avis')} <span aria-hidden="true">→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link href="/entreprises" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            {L('See all businesses', 'عرض جميع الشركات', 'Voir toutes les entreprises')}
          </Link>
        </p>
      </section>

      {/* Avis récents */}
      {recentReviews.length > 0 && (
        <section className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <SectionHead eyebrow={T('common.reviews')} title={T('landing.reviewsTitle')} />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentReviews.map((r, i) => (
                <blockquote key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <Stars rating={r.rating} />
                  {r.comment && <p className="mt-2 text-sm text-gray-600">« {r.comment} »</p>}
                  <footer className="mt-3 text-xs text-gray-400">
                    {r.customer.firstName || L('A customer', 'عميل', 'Un client')} —{' '}
                    <Link href={`/entreprises/${r.customer.company.slug}`} className="font-semibold text-brand-600 hover:underline">{r.customer.company.name}</Link>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tarifs (plans réels) */}
      <section id="tarifs" className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead
          eyebrow={T('common.pricing')}
          title={T('landing.pricingTitle')}
          sub={T('landing.pricingSub')}
        />
        {dbPlans.length === 0 ? (
          <p className="card mx-auto mt-10 max-w-xl text-center text-sm text-gray-400">
            {L('Our plans are in preparation.', 'عروضنا قيد التحضير.', 'Nos offres sont en préparation.')}{' '}
            <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">{T('common.start')}</Link>
          </p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {dbPlans.map((p) => (
              <div key={p.id} className={`relative flex flex-col rounded-3xl border p-7 shadow-sm ${p.slug === 'business' ? 'border-brand-600 shadow-lg ring-2 ring-brand-600/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'}`}>
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
                    <li key={label} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{label}</li>
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
            {L('See plan details', 'عرض تفاصيل الخطط', 'Voir le détail des plans')}
          </Link>
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <SectionHead eyebrow="FAQ" title={T('landing.faqTitle')} />
          <div className="mt-8 space-y-3">
            {FAQ_KEYS.map(([qk, ak]) => {
              const q = T(`landing.${qk}`); const a = T(`landing.${ak}`);
              return (
                <details key={qk} className="group rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <summary className="cursor-pointer list-none font-semibold">
                    <span className="mr-2 inline-block text-brand-600 transition group-open:rotate-90">▸</span>{q}
                  </summary>
                  <p className="mt-2 pl-6 text-sm text-gray-600">{a}</p>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-brand-600 text-center text-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{T('landing.ctaTitle')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">{T('landing.ctaSub')}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/inscription" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-brand-700 shadow-lg transition hover:bg-brand-50"><Rocket className="h-5 w-5" /> {T('common.start')}</Link>
            <a href="#etapes" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"><PlayCircle className="h-5 w-5" /> {T('common.seeDemo')}</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="inline-flex items-center gap-2 font-extrabold text-brand-700">
              <img src="/icon.svg" alt="" className="h-6 w-6" /> AvisFlow
            </p>
            <p className="mt-2 text-sm text-gray-500">{T('landing.heroSub')}</p>
          </div>
          <nav className="text-sm" aria-label="Liens utiles">
            <p className="font-semibold text-gray-700">{L('Links', 'روابط', 'Liens')}</p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li><Link href="/entreprises" className="hover:text-brand-600">{T('common.companies')}</Link></li>
              <li><Link href="/tarifs" className="hover:text-brand-600">{T('common.pricing')}</Link></li>
              <li><Link href="/admin/login" className="hover:text-brand-600">{T('common.login')}</Link></li>
              <li><Link href="/inscription" className="hover:text-brand-600">{L('Create my business', 'أنشئ شركتي', 'Créer mon entreprise')}</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-brand-600">{L('Legal notice', 'المعلومات القانونية', 'Mentions légales')}</Link></li>
              <li><Link href="/confidentialite" className="hover:text-brand-600">{L('Privacy', 'الخصوصية', 'Confidentialité')}</Link></li>
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
