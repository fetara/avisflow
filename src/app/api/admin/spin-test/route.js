import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

const schema = z.object({ token: z.string().min(20) });

// Tirage en MODE TEST : réservoir pondéré identique au vrai tirage, mais AUCUNE
// écriture en base (pas de client, pas de Spin, pas de décrément de stock).
// Vérifications serveur : session admin valide + token signé correspondant au
// même admin et à la même entreprise.
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

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Token de test requis.' }, { status: 400 });

  let payload;
  try {
    payload = (await jwtVerify(parsed.data.token, secret())).payload;
  } catch {
    return NextResponse.json({ error: 'Token de test expiré. Régénérez-le depuis l’admin.' }, { status: 401 });
  }
  if (payload.test !== true || payload.adminId !== guard.admin.id) {
    return NextResponse.json({ error: 'Token de test invalide.' }, { status: 403 });
  }

  const prizes = await db.prize.findMany({
    where: { companyId: payload.companyId },
    orderBy: { sortOrder: 'asc' },
  });
  const prize = weightedPick(prizes);
  if (!prize) return NextResponse.json({ error: 'Aucun lot disponible.' }, { status: 503 });

  // Aucun stock décrémenté, aucun spin créé : tirage purement simulé
  return NextResponse.json({ test: true, prizeId: prize.id, label: prize.label, photo: prize.photo || null });
}
