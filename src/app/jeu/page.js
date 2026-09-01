import { Suspense } from 'react';
import { db, getCompanySetting } from '@/lib/db';
import { getPlayerSession } from '@/lib/auth';
import GameFlow from './GameFlow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Roue de la chance' };

export default async function JeuPage({ searchParams }) {
  const src = searchParams?.src || '';
  const err = searchParams?.err || '';

  let initial = { step: 'identify', spin: null, reviewDone: false, prizes: [], email: null, demoToken: null };
  let company = null;
  let headline = null;
  let sub = null;

  try {
    // Entreprise résolue depuis le QR scanné (?src=slug posé par /r/[slug])
    if (src) {
      const qr = await db.qrCode.findUnique({ where: { slug: src }, include: { company: true } });
      if (qr?.company) company = qr.company;
    }

    // Si le joueur a déjà une session, son entreprise prime (elle vient du QR validé par e-mail)
    const session = await getPlayerSession();
    let companyId = company?.id || null;
    if (session?.sub) {
      const sessionCustomer = await db.customer.findUnique({ where: { id: session.sub }, include: { company: true } });
      if (sessionCustomer?.emailVerifiedAt) {
        companyId = sessionCustomer.companyId || companyId;
        if (sessionCustomer.company) company = sessionCustomer.company;
      }
    }

    // Lots de la roue de CETTE entreprise uniquement
    const prizes = await db.prize.findMany({
      where: { active: true, companyId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true },
    });

    // Textes personnalisés de l'entreprise (fallback réglages globaux)
    if (company) {
      headline = await getCompanySetting(company.id, 'GAME_HEADLINE', null);
      sub = await getCompanySetting(company.id, 'GAME_SUB', null);
    }

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
        return (
          <GameFlow initial={initial} src={src} err={err}
            companyName={company?.name || null} headline={headline} sub={sub} />
        );
      }
    }
    initial.prizes = prizes;
  } catch (e) {
    // base indisponible
  }

  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-8"><div className="card animate-pulse" /></main>}>
      <GameFlow initial={initial} src={src} err={err}
        companyName={company?.name || null} headline={headline} sub={sub} />
    </Suspense>
  );
}
