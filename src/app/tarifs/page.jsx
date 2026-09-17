import Link from 'next/link';
import { db } from '@/lib/db';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';
import PlanCards from './PlanCards';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AvisFlow — Tarifs',
  description: 'Découvrez les abonnements AvisFlow pour engager vos clients, développer vos avis et fidéliser votre clientèle.',
  openGraph: {
    title: 'AvisFlow — Tarifs',
    description: 'Des abonnements simples pour engager vos clients et obtenir plus d’avis.',
  },
};

// Page tarifs publique : les plans affichés viennent de la base (SubscriptionPlan).
export default async function TarifsPage() {
  const session = await getAdminSession();
  const canSubscribe = Boolean(session && session.role === 'COMPANY_ADMIN' && session.companyId && !session.impersonatedBy);

  let plans = [];
  let currentPlanSlug = null;
  try {
    plans = await db.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (canSubscribe) {
      const sub = await db.subscription.findFirst({
        where: { companyId: session.companyId, status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } },
        include: { plan: { select: { slug: true } } },
      });
      currentPlanSlug = sub?.plan?.slug || null;
    }
  } catch {
    plans = [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        brand="🎡 AvisFlow"
        items={[{ href: '/', label: 'Accueil' }]}
        actions={<ThemeToggle />}
      />

      <main className="mx-auto max-w-6xl px-4 py-14">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Des tarifs simples pour développer votre activité</h1>
          <p className="mt-3 text-gray-500">Choisissez le plan adapté à votre entreprise. Essai gratuit, sans engagement.</p>
        </header>

        <div className="mt-12">
          {plans.length === 0 ? (
            <p className="card text-center text-sm text-gray-400">
              Nos offres sont en préparation. <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">Créez votre entreprise</Link> en attendant l’ouverture.
            </p>
          ) : (
            <PlanCards plans={plans.map((p) => ({ ...p, priceMonthly: p.priceMonthly == null ? null : Number(p.priceMonthly) }))} currentPlanSlug={currentPlanSlug} canSubscribe={canSubscribe} />
          )}
        </div>

        <p className="mt-10 text-center text-xs text-gray-400">
          Paiement géré manuellement après validation de votre demande par notre équipe. Activation possible sous 1 à 3 jours selon le plan.
        </p>
      </main>
    </div>
  );
}
