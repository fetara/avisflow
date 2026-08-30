import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getPlayerSession } from '@/lib/auth';
import GameFlow from './GameFlow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Roue de la chance' };

export default async function JeuPage({ searchParams }) {
  const src = searchParams?.src || '';
  const err = searchParams?.err || '';

  let initial = { step: 'identify', spin: null, reviewDone: false, prizes: [], email: null, demoToken: null };

  try {
    const prizes = await db.prize.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true },
    });

    const session = await getPlayerSession();
    if (session?.sub) {
      const customer = await db.customer.findUnique({ where: { id: session.sub } });
      if (customer?.emailVerifiedAt) {
        const spin = await db.spin.findFirst({ where: { customerId: customer.id }, include: { prize: true } });
        const review = await db.review.findFirst({ where: { customerId: customer.id } });
        initial = {
          step: spin ? (review ? 'done' : 'review') : 'wheel',
          spin: spin ? { label: spin.prize.label, giftCode: spin.giftCode } : null,
          reviewDone: Boolean(review),
          prizes,
          email: customer.email,
        };
        return <GameFlow initial={initial} src={src} err={err} />;
      }
    }
    initial.prizes = prizes;
  } catch (e) {
    // base indisponible
  }

  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-8"><div className="card animate-pulse" /></main>}>
      <GameFlow initial={initial} src={src} err={err} />
    </Suspense>
  );
}
