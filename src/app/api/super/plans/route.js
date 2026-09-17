import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';

const planSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  priceMonthly: z.number().nonnegative().nullable(),
  priceYearly: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(6).default('EUR'),
  maxQrCodes: z.number().int().nonnegative().nullable(),
  maxCustomers: z.number().int().nonnegative().nullable(),
  maxSpins: z.number().int().nonnegative().nullable(),
  activationDelayDays: z.number().int().nonnegative().default(0),
  features: z.array(z.string().max(60)).max(24).optional(),
  active: z.boolean().default(true),
});

// Liste des plans (super admin) — y compris désactivés.
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const plans = await db.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({
    plans: plans.map((p) => ({
      ...p,
      priceMonthly: p.priceMonthly == null ? null : Number(p.priceMonthly),
      priceYearly: p.priceYearly == null ? null : Number(p.priceYearly),
    })),
  });
}

// Création d'un plan.
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const parsed = planSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Données de plan invalides.' }, { status: 400 });
  const d = parsed.data;

  if (await db.subscriptionPlan.findUnique({ where: { slug: d.slug } })) {
    return NextResponse.json({ error: 'Ce slug de plan existe déjà.' }, { status: 409 });
  }
  const plan = await db.subscriptionPlan.create({
    data: { ...d, description: d.description || null, features: d.features ?? {} },
  });
  await logAction(guard.admin.id, 'SUBSCRIPTION_PLAN_CREATED', 'SubscriptionPlan', plan.id);
  return NextResponse.json({ ok: true, plan });
}

// Modification d'un plan (prix, limites, délai, activation). Les abonnements
// existants conservent leur prix historique (snapshot sur la Subscription).
export async function PATCH(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id requis.' }, { status: 400 });
  const parsed = planSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  const d = parsed.data;

  const plan = await db.subscriptionPlan.update({
    where: { id: body.id },
    data: { ...d, description: d.description === '' ? null : d.description, features: d.features ?? undefined },
  }).catch(() => null);
  if (!plan) return NextResponse.json({ error: 'Plan introuvable.' }, { status: 404 });

  await logAction(guard.admin.id, 'SUBSCRIPTION_PLAN_CHANGED', 'SubscriptionPlan', plan.id);
  return NextResponse.json({ ok: true, plan });
}
