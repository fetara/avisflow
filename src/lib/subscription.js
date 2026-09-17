import { db } from '@/lib/db';

// ---------- Logique d'abonnement CENTRALISÉE ----------
// Toutes les vérifications d'accès/limites passent par ici (jamais dispersées).

// Transitions automatiques IDEMPOTENTES :
//  - APPROVED + activatedAt <= now  -> ACTIVE
//  - ACTIVE + endAt < now          -> EXPIRED
// Appelée par le cron ET avant toute lecture importante. Repasser deux fois ne
// change rien (updateMany conditionnel sur le statut source).
// Le système d'abonnement ne devient bloquant que lorsqu'au moins un plan existe.
// Avant ça (aucun plan créé), tout est autorisé — compatibilité ascendante.
export async function subscriptionsEnabled() {
  return (await db.subscriptionPlan.count()) > 0;
}

export async function runSubscriptionTransitions() {
  const now = new Date();
  const [activated, expired] = await db.$transaction([
    db.subscription.updateMany({
      where: { status: 'APPROVED', activatedAt: { lte: now } },
      data: { status: 'ACTIVE', startAt: now },
    }),
    db.subscription.updateMany({
      where: { status: 'ACTIVE', endAt: { lt: now } },
      data: { status: 'EXPIRED' },
    }),
  ]);
  return { activated: activated.count, expired: expired.count };
}

// Abonnement effectif d'une entreprise (transitions appliquées d'abord).
export async function getCompanySubscription(companyId) {
  await runSubscriptionTransitions();
  return db.subscription.findFirst({
    where: { companyId },
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }], // ACTIVE d'abord, sinon la plus récente
  });
}

// Détermine le statut d'accès. Retourne { allowed, reason } côté serveur.
export async function canCreateQrCode(companyId) {
  if (!(await subscriptionsEnabled())) return { ok: true };
  const sub = await getCompanySubscription(companyId);
  if (!sub || sub.status !== 'ACTIVE') {
    return { ok: false, reason: 'Aucun abonnement actif. Choisissez un plan sur la page Tarifs pour activer vos QR codes.' };
  }
  const plan = await db.subscriptionPlan.findUnique({ where: { id: sub.planId } });
  if (plan?.maxQrCodes != null) {
    const count = await db.qrCode.count({ where: { companyId } });
    if (count >= plan.maxQrCodes) {
      return {
        ok: false,
        reason: `Votre plan ${plan.name} autorise jusqu'à ${plan.maxQrCodes} QR codes. Passez à un plan supérieur pour en créer davantage.`,
      };
    }
  }
  return { ok: true, plan, subscription: sub };
}

// Nouveau client (identification joueur) : respecte maxCustomers du plan.
export async function canAddCustomer(companyId) {
  if (!(await subscriptionsEnabled())) return { ok: true };
  const sub = await getCompanySubscription(companyId);
  if (!sub || sub.status !== 'ACTIVE') return { ok: false, reason: 'Aucun abonnement actif pour cette entreprise.' };
  const plan = await db.subscriptionPlan.findUnique({ where: { id: sub.planId } });
  if (plan?.maxCustomers != null) {
    const count = await db.customer.count({ where: { companyId } });
    if (count >= plan.maxCustomers) {
      return { ok: false, reason: `Limite de clients atteinte pour le plan ${plan.name} (${plan.maxCustomers}).` };
    }
  }
  return { ok: true };
}

// Nouvelle participation (tirage) : respecte maxSpins du plan (par mois glissant).
export async function canAddSpin(companyId) {
  if (!(await subscriptionsEnabled())) return { ok: true };
  const sub = await getCompanySubscription(companyId);
  if (!sub || sub.status !== 'ACTIVE') return { ok: false, reason: 'Aucun abonnement actif pour cette entreprise.' };
  const plan = await db.subscriptionPlan.findUnique({ where: { id: sub.planId } });
  if (plan?.maxSpins != null) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const count = await db.spin.count({ where: { customer: { companyId }, createdAt: { gte: monthStart } } });
    if (count >= plan.maxSpins) {
      return { ok: false, reason: `Limite mensuelle de participations atteinte pour le plan ${plan.name} (${plan.maxSpins}).` };
    }
  }
  return { ok: true };
}

// Fonctionnalité du plan (features JSON du plan actif)
export async function hasFeature(companyId, feature) {
  const sub = await getCompanySubscription(companyId);
  if (!sub || sub.status !== 'ACTIVE') return false;
  const plan = await db.subscriptionPlan.findUnique({ where: { id: sub.planId } });
  const feats = plan?.features;
  return Boolean(feats && typeof feats === 'object' && feats[feature]);
}

// Utilisation vs limites, pour l'affichage « Mon abonnement ».
export async function getUsage(companyId) {
  const sub = await getCompanySubscription(companyId);
  if (!sub) return null;
  const plan = await db.subscriptionPlan.findUnique({ where: { id: sub.planId } });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [qrCount, custCount, spinsMonth] = await Promise.all([
    db.qrCode.count({ where: { companyId } }),
    db.customer.count({ where: { companyId } }),
    db.spin.count({ where: { customer: { companyId }, createdAt: { gte: monthStart } } }),
  ]);
  const n = (d) => (d == null ? Number(d) : Number(d));
  return {
    subscription: { ...sub, priceMonthly: n(sub.priceMonthly) },
    plan: plan ? { ...plan, priceMonthly: n(plan.priceMonthly), priceYearly: n(plan.priceYearly) } : null,
    usage: {
      qrCodes: { used: qrCount, max: plan?.maxQrCodes ?? null },
      customers: { used: custCount, max: plan?.maxCustomers ?? null },
      spinsThisMonth: { used: spinsMonth, max: plan?.maxSpins ?? null },
    },
  };
}
