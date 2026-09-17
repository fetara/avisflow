import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { runSubscriptionTransitions, getUsage } from '@/lib/subscription';

const schema = z.object({ planSlug: z.string().trim().min(1).max(60) });

// Mon abonnement : statut effectif, historique, utilisation vs limites.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  await runSubscriptionTransitions();

  const companyId = guard.companyId;
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const [history, usage] = await Promise.all([
    db.subscription.findMany({
      where: { companyId },
      orderBy: { requestedAt: 'desc' },
      include: { plan: { select: { name: true, slug: true } } },
    }),
    getUsage(companyId),
  ]);

  return NextResponse.json({
    history: history.map((h) => ({ ...h, priceMonthly: h.priceMonthly == null ? null : Number(h.priceMonthly) })),
    usage,
  });
}

// Demande d'abonnement : crée une Subscription PENDING (validation super admin).
// Vérifications 100 % serveur : session admin entreprise + plan actif + pas de conflit.
export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  if (!guard.companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Plan requis.' }, { status: 400 });

  const plan = await db.subscriptionPlan.findUnique({ where: { slug: parsed.data.planSlug } });
  if (!plan || !plan.active) return NextResponse.json({ error: 'Ce plan n’est pas disponible.' }, { status: 400 });

  await runSubscriptionTransitions();
  const blocking = await db.subscription.findFirst({
    where: { companyId: guard.companyId, status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } },
  });
  if (blocking) {
    return NextResponse.json({ error: 'Un abonnement est déjà en cours ou en attente pour votre entreprise.' }, { status: 409 });
  }

  const sub = await db.subscription.create({
    data: {
      companyId: guard.companyId,
      planId: plan.id,
      status: 'PENDING',
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
    },
  });
  await logAction(guard.admin.id, 'SUBSCRIPTION_CREATED', 'Subscription', sub.id);

  return NextResponse.json({
    ok: true,
    message: `Votre demande a bien été enregistrée. Notre équipe va valider votre abonnement. Activation prévue après validation : ${plan.activationDelayDays} jour(s).`,
  });
}
