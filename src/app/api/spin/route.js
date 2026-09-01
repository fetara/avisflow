import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { giftCode } from '@/lib/utils';
import { getPlayerSession } from '@/lib/auth';

function weightedPick(prizes) {
  const pool = prizes.filter((p) => p.active && (p.stock === null || p.stock > 0));
  if (pool.length === 0) return prizes.find((p) => p.active) || null;
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

// Étape 2 : tirage au sort CÔTÉ SERVEUR (probabilités pondérées), enregistré en base.
export async function POST(req) {
  const session = await getPlayerSession();
  if (!session?.sub) {
    return NextResponse.json({ error: 'Session expirée, veuillez valider votre e-mail à nouveau.' }, { status: 401 });
  }

  const customer = await db.customer.findUnique({ where: { id: session.sub } });
  if (!customer) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });

  const already = await db.spin.findFirst({ where: { customerId: customer.id } });
  if (already) {
    return NextResponse.json({ error: 'Vous avez déjà joué.', already: true, prizeId: already.prizeId }, { status: 409 });
  }

  const prizes = await db.prize.findMany({ where: { companyId: customer.companyId }, orderBy: { sortOrder: 'asc' } });
  const prize = weightedPick(prizes);
  if (!prize) return NextResponse.json({ error: 'Aucun lot disponible.' }, { status: 503 });

  // Transaction : décrémente le stock et enregistre le spin de façon atomique
  const spin = await db.$transaction(async (tx) => {
    if (prize.stock !== null) {
      const updated = await tx.prize.updateMany({
        where: { id: prize.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (updated.count === 0) throw new Error('OUT_OF_STOCK');
    }
    return tx.spin.create({
      data: { customerId: customer.id, prizeId: prize.id, giftCode: giftCode() },
    });
  }).catch(() => null);

  if (!spin) {
    // Lot épuisé entre-temps : retente sur "rejouez" ou tout lot restant
    const fallback = prizes.find((p) => p.active && (p.stock === null || p.stock > 0) && p.id !== prize.id);
    if (!fallback) return NextResponse.json({ error: 'Stock épuisé, revenez bientôt !' }, { status: 503 });
    const spin2 = await db.spin.create({
      data: { customerId: customer.id, prizeId: fallback.id, giftCode: giftCode() },
    });
    return NextResponse.json({ prizeId: fallback.id, label: fallback.label, giftCode: spin2.giftCode, spinId: spin2.id });
  }

  return NextResponse.json({ prizeId: prize.id, label: prize.label, giftCode: spin.giftCode, spinId: spin.id });
}

// Segments pour dessiner la roue (avant tirage)
export async function GET(req) {
  const session = await getPlayerSession();
  const customer = session?.sub ? await db.customer.findUnique({ where: { id: session.sub } }) : null;
  const prizes = await db.prize.findMany({
    where: { active: true, companyId: customer?.companyId ?? null },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, label: true, weight: true },
  });
  return NextResponse.json({ prizes });
}
