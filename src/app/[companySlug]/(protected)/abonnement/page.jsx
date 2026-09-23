import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { runSubscriptionTransitions } from '@/lib/subscription';
import Usage from './Usage';

export const dynamic = 'force-dynamic';

const STATUS_BADGE = {
  ACTIVE: ['● Actif', 'bg-emerald-100 text-emerald-700'],
  APPROVED: ['● Approuvé — activation programmée', 'bg-sky-100 text-sky-700'],
  PENDING: ['● En attente de validation', 'bg-amber-100 text-amber-700'],
  SUSPENDED: ['● Suspendu', 'bg-red-100 text-red-700'],
  EXPIRED: ['● Expiré', 'bg-gray-200 text-gray-600'],
  CANCELLED: ['● Annulé', 'bg-gray-200 text-gray-600'],
  REJECTED: ['● Refusé', 'bg-red-100 text-red-700'],
};

// « Mon abonnement » : statut effectif, utilisation vs limites, historique.
export default async function AbonnementPage({ params }) {
  const { companySlug } = await params;
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const role = session.role === 'COMPANY_ADMIN' ? 'COMPANY_ADMIN' : 'SUPER_ADMIN';
  if (role === 'COMPANY_ADMIN' && session.companySlug !== companySlug && !session.impersonatedBy) {
    redirect(session.companySlug ? `/${session.companySlug}/abonnement` : '/admin/login');
  }

  const companyId = role === 'COMPANY_ADMIN' ? session.companyId : (session.companyId ?? null);
  // Requêtes protégées : si la table subscriptions n'existe pas encore (migration
  // 20260918000000 non appliquée) ou base indisponible, page propre au lieu d'un crash.
  let subs = [];
  let dbError = false;
  try {
    await runSubscriptionTransitions();
    subs = await db.subscription.findMany({
      where: { companyId },
      orderBy: { requestedAt: 'desc' },
      include: { plan: { select: { name: true, slug: true } } },
    });
  } catch (e) {
    console.error('abonnement:', e.message?.slice(0, 200));
    dbError = true;
  }

  const current = subs.find((s) => ['ACTIVE', 'APPROVED', 'PENDING', 'SUSPENDED'].includes(s.status)) || null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Mon abonnement</h1>

      {dbError && (
        <p className="card text-sm text-amber-600">
          Le module d’abonnement n’est pas encore disponible (migration de base à appliquer).
          <Link href="/tarifs" className="ml-1 font-semibold text-brand-600 hover:underline">Voir les tarifs</Link>
        </p>
      )}

      {/* Abonnement actif ou en cours */}
      {!dbError && current ? (
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plan actuel</p>
              <h2 className="mt-1 text-2xl font-extrabold">{current.plan.name}</h2>
              {current.priceMonthly != null && (
                <p className="text-gray-500">{Number(current.priceMonthly)}€ {current.currency} / mois</p>
              )}
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_BADGE[current.status]?.[1] || 'bg-gray-100'}`}>
              {STATUS_BADGE[current.status]?.[0] || current.status}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-gray-500">Demande envoyée</dt><dd className="font-semibold">{new Date(current.requestedAt).toLocaleDateString('fr-FR')}</dd></div>
            {current.activatedAt && <div><dt className="text-gray-500">Activation</dt><dd className="font-semibold">{new Date(current.activatedAt).toLocaleDateString('fr-FR')}</dd></div>}
            {current.endAt && <div><dt className="text-gray-500">Échéance</dt><dd className="font-semibold">{new Date(current.endAt).toLocaleDateString('fr-FR')}</dd></div>}
          </dl>

          {current.status === 'PENDING' && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
              Votre demande est en cours de validation par notre équipe. Vous serez notifié dès l’activation.
            </p>
          )}
          {current.status === 'APPROVED' && current.activatedAt && (
            <p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-700">
              Votre abonnement sera automatiquement activé le <strong>{new Date(current.activatedAt).toLocaleDateString('fr-FR')}</strong>.
            </p>
          )}
          {current.status === 'SUSPENDED' && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              Votre abonnement est actuellement suspendu. Veuillez contacter l’administrateur.
            </p>
          )}
        </section>
      ) : (
        !dbError && (
          <section className="card text-center">
            <p className="text-sm text-gray-500">Vous n’avez pas encore d’abonnement actif.</p>
            <Link href="/tarifs" className="btn-primary mt-4 inline-block">Choisir un plan</Link>
          </section>
        )
      )}

      {/* Utilisation vs limites */}
      {!dbError && current?.status === 'ACTIVE' && (
        <section className="card space-y-4">
          <h2 className="font-bold">Utilisation</h2>
          <Usage companyId={companyId} />
        </section>
      )}

      {/* Historique */}
      {!dbError && (
        <section className="card">
          <h2 className="mb-3 font-bold">Historique</h2>
          {subs.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun abonnement.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {subs.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <span className="font-medium">{s.plan.name}</span>
                  <span className="text-gray-500">{STATUS_BADGE[s.status]?.[0] || s.status}</span>
                  <span className="text-xs text-gray-400">{new Date(s.requestedAt).toLocaleDateString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/tarifs" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">Voir les plans →</Link>
        </section>
      )}
    </div>
  );
}
