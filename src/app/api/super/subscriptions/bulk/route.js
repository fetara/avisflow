import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { runSubscriptionTransitions } from '@/lib/subscription';

// Actions EN MASSE sur les abonnements (super admin) — idempotentes.
const schema = z.object({
  action: z.enum(['expire_overdue', 'activate_approved']),
});

export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const now = new Date();

  if (parsed.data.action === 'expire_overdue') {
    // Expirer TOUS les abonnements actifs dont la date d'échéance est dépassée (1 clic)
    const r = await db.subscription.updateMany({
      where: { status: 'ACTIVE', endAt: { lt: now } },
      data: { status: 'EXPIRED' },
    });
    await logAction(guard.admin.id, 'SUBSCRIPTION_BULK_EXPIRED', 'Subscription', `${r.count} expirés`);
    return NextResponse.json({ ok: true, count: r.count, message: `${r.count} abonnement(s) passé(s) en EXPIRED.` });
  }

  if (parsed.data.action === 'activate_approved') {
    // Activer immédiatement TOUTES les demandes approuvées (contourne les délais)
    const r = await db.subscription.updateMany({
      where: { status: 'APPROVED' },
      data: { status: 'ACTIVE', activatedAt: now, startAt: now },
    });
    await logAction(guard.admin.id, 'SUBSCRIPTION_BULK_ACTIVATED', 'Subscription', `${r.count} activés`);
    return NextResponse.json({ ok: true, count: r.count, message: `${r.count} abonnement(s) activé(s) immédiatement.` });
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}
