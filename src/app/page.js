import Link from 'next/link';
import { db, getSetting } from '@/lib/db';
import ReviewWall from '@/components/ReviewWall';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let reviews = [];
  let headline = 'Bienvenue chez nous !';
  try {
    reviews = await db.review.findMany({
      where: { status: 'approved' },
      include: { customer: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    headline = (await getSetting('GAME_HEADLINE')) || headline;
  } catch (e) {
    // Base indisponible (ex: build) -> page statique
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎡</div>
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{headline}</h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          Scannez le QR code en boutique, validez votre e-mail et tentez de gagner un cadeau. Gratis.
        </p>
        <Link href="/jeu" className="btn-primary mt-6">Jouer maintenant</Link>
      </header>

      <section className="mt-14">
        <h2 className="mb-6 text-center text-2xl font-bold">Ils nous ont fait confiance</h2>
        <ReviewWall reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
      </section>

      <footer className="mt-16 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm text-gray-500">
        <Link href="/mentions-legales" className="hover:text-brand-600">Mentions légales</Link>
        <Link href="/reglement-jeu" className="hover:text-brand-600">Règlement du jeu</Link>
        <Link href="/confidentialite" className="hover:text-brand-600">Confidentialité</Link>
        <Link href="/admin" className="hover:text-brand-600">Backoffice</Link>
      </footer>
    </main>
  );
}
