import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, getSetting } from '@/lib/db';
import { getPlayerSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/utils';

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
  photo: z.string().max(3_000_000).optional().or(z.literal('')), // data URL optionnelle
  googleClick: z.boolean().optional(),
});

// Étape 4 : dépôt d'avis + règle d'auto-publication configurable.
export async function POST(req) {
  const session = await getPlayerSession();
  if (!session?.sub) return NextResponse.json({ error: 'Session expirée.' }, { status: 401 });

  const rl = rateLimit(`review:${session.sub}`, 3, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Avis invalide.' }, { status: 400 });
  const { rating, comment, photo } = parsed.data;

  const existing = await db.review.findFirst({ where: { customerId: session.sub } });
  if (existing) return NextResponse.json({ error: 'Un avis a déjà été déposé pour ce compte.' }, { status: 409 });

  const minRating = parseInt(await getSetting('AUTO_APPROVE_MIN_RATING', '0'), 10) || 0;
  const autoApprove = rating >= minRating;

  const review = await db.review.create({
    data: {
      customerId: session.sub,
      rating,
      comment: comment || null,
      photo: photo || null,
      status: autoApprove ? 'approved' : 'pending',
      autoApplied: autoApprove,
    },
  });

  const googleUrl = await getSetting('GOOGLE_REVIEW_URL', process.env.GOOGLE_REVIEW_URL || '');
  return NextResponse.json({ ok: true, status: review.status, googleUrl });
}

// Tracking du clic "Laisser un avis sur Google" (entonnoir de conversion).
export async function PATCH(req) {
  const session = await getPlayerSession();
  if (!session?.sub) return NextResponse.json({ error: 'Session expirée.' }, { status: 401 });
  await db.review.updateMany({ where: { customerId: session.sub }, data: { googleClick: true } });
  return NextResponse.json({ ok: true });
}
