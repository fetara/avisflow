import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Données publiques pour l'animation de tirage en direct (projection) :
// prénoms des participants pour le roulement + gagnants du dernier run.
// Les e-mails ne sont JAMAIS exposés.
export async function GET(req, { params }) {
  const { companySlug } = await params;
  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.active) return NextResponse.json({ error: 'Indisponible' }, { status: 404 });

  const draw = await db.raffleDraw.findFirst({
    where: { companyId: company.id, status: { in: ['OPEN', 'DONE'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (!draw) return NextResponse.json({ error: 'Aucun tirage' }, { status: 404 });

  const entries = await db.raffleEntry.findMany({
    where: { drawId: draw.id },
    select: { name: true },
    orderBy: { createdAt: 'asc' },
  });
  const lastRun = await db.raffleWinner.aggregate({ where: { drawId: draw.id }, _max: { run: true } });
  const winners = await db.raffleWinner.findMany({
    where: { drawId: draw.id, run: lastRun._max.run || 1 },
    orderBy: { rank: 'asc' },
    select: { rank: true, name: true, prize: true },
  });

  return NextResponse.json({
    draw: { name: draw.name, status: draw.status, drawnAt: draw.drawnAt },
    names: entries.map((e) => e.name),
    winners,
  });
}
