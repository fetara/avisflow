import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processCampaignBatch } from '@/lib/email-campaigns';

// Cron : traite les campagnes programmées / en cours, par lots de 25.
// Idempotent — peut être appelé aussi souvent que nécessaire.
// Sécurisé par CRON_SECRET (Vercel envoie Authorization: Bearer $CRON_SECRET).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    const key = new URL(req.url).searchParams.get('key');
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  // Campagnes à traiter : programmées dont la date est passée + en cours d'envoi
  const due = await db.campaign.findMany({
    where: {
      status: { in: ['SCHEDULED', 'SENDING'] },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    select: { id: true },
    take: 10,
  });

  const results = [];
  for (const c of due) {
    // Un lot par campagne par passage (le prochain cron continue)
    results.push(await processCampaignBatch(c.id, 25));
  }
  return NextResponse.json({ ok: true, campaigns: due.length, results });
}
