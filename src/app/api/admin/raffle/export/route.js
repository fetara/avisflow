import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { resolveCompanyId } from '@/lib/company-scope';

// Export CSV des gagnants (dernier run par défaut, ou tous avec ?all=1).
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const companyId = await resolveCompanyId(req, guard);
  if (!companyId) return new NextResponse('Entreprise introuvable', { status: 404 });

  const sp = new URL(req.url).searchParams;
  const drawId = sp.get('drawId');
  if (!drawId) return new NextResponse('drawId requis', { status: 400 });

  const draw = await db.raffleDraw.findFirst({ where: { id: drawId, companyId } });
  if (!draw) return new NextResponse('Tirage introuvable', { status: 404 });

  const winners = await db.raffleWinner.findMany({
    where: { drawId },
    orderBy: [{ run: 'desc' }, { rank: 'asc' }],
  });

  const header = 'run;rang;gagnant;email;lot;tire_le';
  const rows = winners.map((w) =>
    [w.run, w.rank, w.name, w.email || '', w.prize, w.drawnAt.toISOString()].join(';'));
  return new NextResponse('\uFEFF' + [header, ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gagnants-${draw.name.replace(/\W+/g, '_')}.csv"`,
    },
  });
}
