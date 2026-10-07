import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';

// Import CSV de participants : une ligne "Nom;Email" (ou "Nom,Email") par participant.
const schema = z.object({ drawId: z.string(), csv: z.string().max(200_000) });

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return NextResponse.json({ error: 'Entreprise introuvable.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'CSV requis.' }, { status: 400 });

  const draw = await db.raffleDraw.findFirst({ where: { id: parsed.data.drawId, companyId } });
  if (!draw) return NextResponse.json({ error: 'Tirage introuvable.' }, { status: 404 });

  const rows = parsed.data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let added = 0;
  for (const line of rows) {
    const [name, email] = line.split(/[;,\t]/).map((x) => (x || '').trim());
    if (!name) continue;
    const res = await db.raffleEntry.upsert({
      where: { drawId_email: { drawId: draw.id, email: email || name } },
      update: { name },
      create: { drawId: draw.id, name, email: email || name, source: 'imported' },
    }).catch(() => null);
    if (res) added++;
  }
  await logAction(guard.admin.id, 'raffle_import', 'RaffleDraw', draw.id);
  return NextResponse.json({ ok: true, added, total: await db.raffleEntry.count({ where: { drawId: draw.id } }) });
}
