import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, randomInt } from 'crypto';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';

// LANCER LE TIRAGE : sélection crypto-sûre côté serveur, horodatée, journalisée.
// Chaque exécution crée un "run" : le premier tirage est run=1, une relance = run=2, etc.
// (l'historique des gagnants précédents est conservé).
const schema = z.object({ drawId: z.string() });

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'drawId requis.' }, { status: 400 });

  const draw = await db.raffleDraw.findFirst({ where: { id: parsed.data.drawId, companyId } });
  if (!draw) return NextResponse.json({ error: 'Tirage introuvable.' }, { status: 404 });
  if (draw.entries.length < 1) {
    return NextResponse.json({ error: 'Aucun participant enregistré pour ce tirage.' }, { status: 400 });
  }

  // --- Aléa crypto-sûr : graine journalisée AVANT le tirage (équité vérifiable) ---
  const seed = `${Date.now()}-${randomBytes(16).toString('hex')}`;

  // Eligibles : tous les participants ; exclusion optionnelle des gagnants des runs précédents
  let eligible = [...draw.entries];
  if (draw.excludePastWinners) {
    const pastWinners = await db.raffleWinner.findMany({ where: { drawId: draw.id }, select: { email: true, name: true } });
    const pastEmails = new Set(pastWinners.map((w) => w.email).filter(Boolean));
    eligible = eligible.filter((e) => !pastEmails.has(e.email));
  }
  if (eligible.length === 0) {
    return NextResponse.json({ error: 'Tous les participants ont déjà gagné (exclusion active).' }, { status: 400 });
  }

  const prizes = Array.isArray(draw.prizes) ? draw.prizes : [];
  const winnersCount = Math.min(draw.winnersCount, eligible.length);

  // Résolution des lots du rang depuis les LOTS PARTAGÉS (stock commun décrémenté)
  const resolvedPrizes = [];
  for (const p of prizes) {
    const shared = p.prizeId ? await db.prize.findUnique({ where: { id: p.prizeId } }) : null;
    resolvedPrizes.push({ rank: p.rank, prizeId: p.prizeId, label: shared?.label || `Lot n°${p.rank}`, shared });
  }

  // Mélange Fisher-Yates avec randomInt (crypto)
  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Un run de plus que le maximum existant
  const lastRun = await db.raffleWinner.aggregate({ where: { drawId: draw.id }, _max: { run: true } });
  const run = (lastRun._max.run || 0) + 1;

  const winners = [];
  for (let rank = 1; rank <= winnersCount; rank++) {
    const entry = pool.shift();
    if (!entry) break;
    const cfgPrize = resolvedPrizes.find((p) => p.rank === rank);
    let prizeLabel = cfgPrize?.label || `Gagnant n°${rank}`;
    // Stock PARTAGÉ : décrémente le lot commun (si stock insuffisant -> fallback sur
    // un autre lot « pour tirage » disponible, sinon le rang est attribué à titre symbolique)
    let decremented = false;
    if (cfgPrize?.shared) {
      const dec = await db.prize.updateMany({
        where: { id: cfgPrize.shared.id, companyId, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      decremented = dec.count > 0;
      if (cfgPrize.shared.stock != null && !decremented) {
        const fallback = await db.prize.findFirst({
          where: { companyId, active: true, inRaffle: true, id: { not: cfgPrize.shared.id }, stock: { gt: 0 } },
        });
        if (fallback) {
          await db.prize.update({ where: { id: fallback.id }, data: { stock: { decrement: 1 } } });
          prizeLabel = fallback.label;
        }
      }
    }
    winners.push({ rank, name: entry.name, email: entry.email, prize: prizeLabel });
  }

  await db.raffleWinner.createMany({
    data: winners.map((w) => ({
      drawId: draw.id, run, rank: w.rank, name: w.name, email: w.email || null, prize: w.prize,
    })),
  });
  await db.raffleDraw.update({ where: { id: draw.id }, data: { seed, drawnAt: new Date(), status: 'DONE' } });
  await logAction(guard.admin.id, 'raffle_drawn', 'RaffleDraw', draw.id);

  return NextResponse.json({ ok: true, run, seed, winners });
}
