import { NextResponse } from 'next/server';
import { runSubscriptionTransitions } from '@/lib/subscription';

// Cron Vercel : passe automatiquement APPROVED -> ACTIVE (à la date prévue) et
// ACTIVE -> EXPIRED (après endAt). Idempotent. Sécurisé par CRON_SECRET.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    const urlSecret = new URL(req.url).searchParams.get('key');
    if (auth !== `Bearer ${secret}` && urlSecret !== secret) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }
  const result = await runSubscriptionTransitions();
  return NextResponse.json({ ok: true, ...result });
}
