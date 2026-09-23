import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { runSubscriptionTransitions } from '@/lib/subscription';

// Liste des abonnements (toutes entreprises) avec filtres, pour le super admin.
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  await runSubscriptionTransitions();

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const q = sp.get('q');

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (q) where.company = { name: { contains: q, mode: 'insensitive' } };

  const subs = await db.subscription.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    take: 200,
    include: {
      company: { select: { name: true, slug: true } },
      plan: { select: { name: true, slug: true } },
    },
  });

  // Statistiques super admin (contractuel, pas de paiement réel intégré)
  const actives = await db.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: { priceMonthly: true, currency: true },
  });
  const mrr = actives.reduce((s, a) => s + Number(a.priceMonthly || 0), 0);

  return NextResponse.json({
    subscriptions: subs.map((s2) => ({ ...s2, priceMonthly: s2.priceMonthly == null ? null : Number(s2.priceMonthly) })),
    stats: {
      active: actives.length,
      pending: await db.subscription.count({ where: { status: 'PENDING' } }),
      expiringSoon: await db.subscription.count({
        where: { status: 'ACTIVE', endAt: { lte: new Date(Date.now() + 7 * 864e5), gte: new Date() } },
      }),
      mrrEstimate: Math.round(mrr),
    },
  });
}

const actionSchema = z.object({
  id: z.string().optional(),
  action: z.enum(['approve', 'reject', 'suspend', 'activate_now', 'cancel', 'extend', 'assign']),
  days: z.number().int().positive().optional(), // pour extend
  // assign : création manuelle d'un abonnement pour une entreprise
  companyId: z.string().optional(),
  planSlug: z.string().optional(),
  months: z.number().int().positive().optional(),
  price: z.number().nonnegative().nullable().optional(),
  activateNow: z.boolean().optional(),
});

// Actions super admin sur un abonnement. Toutes les dates sont calculées côté serveur.
export async function PATCH(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { id, action, days } = parsed.data;

  // --- Attribution manuelle (le super admin crée l'abonnement pour l'entreprise) ---
  if (action === 'assign') {
    if (!parsed.data.companyId || !parsed.data.planSlug) {
      return NextResponse.json({ error: 'companyId et planSlug requis.' }, { status: 400 });
    }
    const plan = await db.subscriptionPlan.findUnique({ where: { slug: parsed.data.planSlug } });
    if (!plan || !plan.active) return NextResponse.json({ error: 'Plan introuvable ou désactivé.' }, { status: 400 });

    const companyId = parsed.data.companyId;
    const months = parsed.data.months ?? 12;
    const now2 = new Date();
    const endAt = new Date(now2.getTime() + months * 30 * 864e5);

    // L'abonnement actif/approuvé précédent est annulé (jamais supprimé : historique)
    await db.subscription.updateMany({
      where: { companyId, status: { in: ['ACTIVE', 'APPROVED', 'PENDING'] } },
      data: { status: 'CANCELLED' },
    });

    const immediate = parsed.data.activateNow !== false;
    const created = await db.subscription.create({
      data: {
        companyId,
        planId: plan.id,
        status: immediate ? 'ACTIVE' : 'APPROVED',
        startAt: immediate ? now2 : null,
        activatedAt: immediate ? now2 : new Date(now2.getTime() + (plan.activationDelayDays ?? 0) * 864e5),
        endAt,
        activationDelayDays: immediate ? 0 : plan.activationDelayDays,
        priceMonthly: parsed.data.price != null ? parsed.data.price : plan.priceMonthly,
        currency: plan.currency,
        approvedBy: guard.admin.id,
        approvedAt: now2,
      },
    });
    await logAction(guard.admin.id, 'SUBSCRIPTION_ASSIGNED', 'Subscription', created.id);
    return NextResponse.json({ ok: true, subscription: { ...created, priceMonthly: created.priceMonthly == null ? null : Number(created.priceMonthly) } });
  }

  const sub = await db.subscription.findUnique({
    where: { id },
    include: { plan: true, company: { select: { name: true } } },
  });
  if (!sub) return NextResponse.json({ error: 'Abonnement introuvable.' }, { status: 404 });

  const now = new Date();
  let data = {};
  let audit = `SUBSCRIPTION_${action.toUpperCase()}`;

  switch (action) {
    case 'approve': {
      if (sub.status !== 'PENDING') return NextResponse.json({ error: 'Seule une demande PENDING peut être approuvée.' }, { status: 409 });
      const delay = sub.plan.activationDelayDays ?? 0;
      const activatedAt = new Date(now.getTime() + delay * 864e5);
      data = { status: delay === 0 ? 'ACTIVE' : 'APPROVED', approvedAt: now, approvedBy: guard.admin.id, activationDelayDays: delay, activatedAt, startAt: delay === 0 ? now : null, endAt: null };
      break;
    }
    case 'activate_now': {
      // Contourne le délai : activation immédiate
      data = { status: 'ACTIVE', approvedAt: sub.approvedAt ?? now, approvedBy: guard.admin.id, activatedAt: now, startAt: now };
      audit = 'SUBSCRIPTION_ACTIVATED';
      break;
    }
    case 'reject': data = { status: 'REJECTED', approvedBy: guard.admin.id }; break;
    case 'suspend': data = { status: 'SUSPENDED' }; break;
    case 'cancel': data = { status: 'CANCELLED' }; break;
    case 'extend': {
      if (!days) return NextResponse.json({ error: 'Nombre de jours requis.' }, { status: 400 });
      const base = sub.endAt && sub.endAt > now ? sub.endAt : now;
      data = { endAt: new Date(base.getTime() + days * 864e5), status: 'ACTIVE' };
      break;
    }
  }

  const updated = await db.subscription.update({ where: { id }, data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 });

  await logAction(guard.admin.id, audit, 'Subscription', id);
  return NextResponse.json({ ok: true, subscription: updated, company: sub.company.name, plan: sub.plan.name });
}
