import Link from 'next/link';
import { getUsage } from '@/lib/subscription';

// Carte « Votre abonnement » du dashboard entreprise (données réelles, serveur).
export default async function SubscriptionCard({ companyId, companySlug }) {
  let data = null;
  try {
    data = await getUsage(companyId);
  } catch {
    return null; // système non migré : carte masquée, rien ne casse
  }
  if (!data) return null;
  const { subscription, plan } = data;
  const badge = {
    ACTIVE: ['● Actif', 'bg-emerald-100 text-emerald-700'],
    APPROVED: ['● Activation en attente', 'bg-sky-100 text-sky-700'],
    PENDING: ['● Validation en attente', 'bg-amber-100 text-amber-700'],
    SUSPENDED: ['● Suspendu', 'bg-red-100 text-red-700'],
  }[subscription.status] || ['● ' + subscription.status, 'bg-gray-100 text-gray-600'];

  return (
    <section className="card !bg-white/90 dark:!bg-gray-900/90">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">💳 Votre abonnement</p>
          <h2 className="mt-1 text-xl font-extrabold">{plan?.name || 'Aucun plan'}</h2>
          {subscription.priceMonthly != null && (
            <p className="text-sm text-gray-500">{Number(subscription.priceMonthly)}€ / mois</p>
          )}
        </div>
        <div className="text-right">
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${badge[1]}`}>{badge[0]}</span>
          {subscription.endAt && subscription.status === 'ACTIVE' && (
            <p className="mt-2 text-xs text-gray-500">Renouvellement : {new Date(subscription.endAt).toLocaleDateString('fr-FR')}</p>
          )}
          {subscription.status === 'APPROVED' && subscription.activatedAt && (
            <p className="mt-2 text-xs text-gray-500">Activation prévue : {new Date(subscription.activatedAt).toLocaleDateString('fr-FR')}</p>
          )}
        </div>
      </div>
      <Link href={`/${companySlug}/abonnement`} className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
        Voir mon abonnement →
      </Link>
    </section>
  );
}
