import Link from 'next/link';
import { db, getCompanySetting, getCompanySettings } from '@/lib/db';
import { getPlayerSession } from '@/lib/auth';
import GameFlow from '@/components/GameFlow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Roue de la chance' };

// Page « jeu indisponible » : la roue n'est pas encore configurée par l'entreprise
function NotReady({ companyName }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">⏳</div>
      <h1 className="text-2xl font-bold">Jeu bientôt disponible !</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {companyName ? `${companyName} prépare sa roue de la chance.` : 'Cette roue de la chance est en préparation.'}
        {' '}Revenez très vite pour tenter de gagner un cadeau.
      </p>
      <Link href="/" className="mt-6 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-white">Accueil</Link>
    </main>
  );
}

export default async function PlayPage({ params, searchParams }) {
  const { companySlug } = await params;

  const company = await db.company.findUnique({ where: { slug: companySlug } });
  // Le layout parent gère déjà inexistant / désactivée ; double garde par sécurité
  if (!company || !company.active) return <NotReady companyName={null} />;

  try {
    // Roue non configurée (aucun lot actif) -> page dédiée, pas de jeu
    const prizeCount = await db.prize.count({ where: { companyId: company.id, active: true } });
    if (prizeCount === 0) return <NotReady companyName={company.name} />;

    const prizes = await db.prize.findMany({
      where: { active: true, companyId: company.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true },
    });

    let initial = { step: 'identify', spin: null, reviewDone: false, prizes, email: null, demoToken: null };

    // Session joueur éventuelle : ne vaut que pour CETTE entreprise
    const session = await getPlayerSession();
    if (session?.sub) {
      const customer = await db.customer.findUnique({ where: { id: session.sub } });
      if (customer?.emailVerifiedAt && customer.companyId === company.id) {
        const spin = await db.spin.findFirst({ where: { customerId: customer.id }, include: { prize: true } });
        const review = await db.review.findFirst({ where: { customerId: customer.id } });
        initial = {
          step: spin ? (review ? 'done' : 'review') : 'wheel',
          spin: spin ? { label: spin.prize.label, giftCode: spin.giftCode, photo: spin.prize.photo || null } : null,
          reviewDone: Boolean(review),
          prizes,
          email: customer.email,
        };
      }
    }

    const headline = await getCompanySetting(company.id, 'GAME_HEADLINE', null);
    const sub = await getCompanySetting(company.id, 'GAME_SUB', null);

    // Apparence de la roue personnalisée par l'entreprise
    let wheelColors = null;
    let wheelBg = null;
    try {
      const cs = await getCompanySettings(company.id);
      wheelColors = JSON.parse(cs.WHEEL_COLORS || 'null');
      wheelBg = cs.WHEEL_BG_IMAGE || null;
    } catch { /* couleurs invalides -> palette par défaut */ }

    return <GameFlow initial={initial}
      src={searchParams?.src || ''} companySlug={company.slug} err=""
      companyName={company.name} headline={headline} sub={sub}
      wheelColors={wheelColors} wheelBg={wheelBg} />;
  } catch (e) {
    return <NotReady companyName={company.name} />;
  }
}
