import { db } from '@/lib/db';
import DrawClient from './DrawClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tirage au sort' };

// Page publique du tirage : inscriptions pendant la période + écran de projection
// plein écran (roulement des noms, gagnants) adapté à un événement.
export default async function DrawPage({ params }) {
  const { companySlug } = await params;
  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-center text-gray-100">
        <div>
          <div className="text-5xl">🎲</div>
          <h1 className="mt-3 text-2xl font-bold">Tirage indisponible</h1>
          <Link href="/" className="mt-4 inline-block text-sm text-gray-400 hover:underline">Accueil</Link>
        </div>
      </main>
    );
  }

  const draw = await db.raffleDraw.findFirst({
    where: { companyId: company.id, status: { in: ['OPEN', 'DONE'] } },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const open = Boolean(draw && (!draw.startsAt || now >= draw.startsAt) && (!draw.endsAt || now <= draw.endsAt));

  return (
    <DrawClient
      companySlug={companySlug}
      companyName={company.name}
      drawName={draw?.name || 'Tirage au sort'}
      registrationOpen={open && draw?.status === 'OPEN'}
      hasWinners={Boolean(draw?.drawnAt)}
    />
  );
}
