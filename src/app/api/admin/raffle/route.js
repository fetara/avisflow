import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';

// Configuration du tirage de l'entreprise (création / mise à jour du tirage courant).
const upsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  winnersCount: z.number().int().min(1).max(50),
  prizes: z.array(z.object({ rank: z.number().int().min(1), label: z.string().trim().max(120) })).max(50),
  excludePastWinners: z.boolean().default(true),
  open: z.boolean().default(true), // true = inscriptions ouvertes (status OPEN)
});

async function currentDraw(companyId) {
  return db.raffleDraw.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      entries: { orderBy: { createdAt: 'asc' } },
      winners: { orderBy: [{ run: 'desc' }, { rank: 'asc' }] },
    },
  });
}

// GET : tirage courant + entrées + gagnants + mode de jeu.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const [draw, settings] = await Promise.all([
    currentDraw(companyId),
    db.companySetting.findMany({ where: { companyId, key: 'GAME_MODE' }, select: { value: true } }),
  ]);
  return NextResponse.json({ draw, gameMode: settings[0]?.value || 'wheel' });
}

// PUT : créer/mettre à jour la configuration du tirage.
export async function PUT(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Configuration invalide.' }, { status: 400 });
  const d = parsed.data;

  const existing = await currentDraw(companyId);
  // Un tirage déjà joué ne se modifie plus : on crée un nouveau tirage
  const data = {
    name: d.name,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    winnersCount: d.winnersCount,
    prizes: d.prizes.sort((a, b) => a.rank - b.rank),
    excludePastWinners: d.excludePastWinners,
    status: d.open ? 'OPEN' : 'DRAFT',
  };

  const draw = existing && existing.status !== 'DONE'
    ? await db.raffleDraw.update({ where: { id: existing.id }, data })
    : await db.raffleDraw.create({ data: { ...data, companyId } });

  await db.companySetting.upsert({
    where: { companyId_key: { companyId, key: 'GAME_MODE' } },
    update: { value: d.open ? 'both' : 'wheel' },
    create: { companyId, key: 'GAME_MODE', value: d.open ? 'both' : 'wheel' },
  });

  await logAction(guard.admin.id, 'raffle_config_saved', 'RaffleDraw', draw.id);
  return NextResponse.json({ ok: true, draw });
}
