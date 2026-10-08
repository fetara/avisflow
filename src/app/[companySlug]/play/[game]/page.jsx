import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function NotAvailable({ game, back, lang }) {
  const T = {
    fr: { r: 'La roulette de la chance', d: 'Le tirage au sort', t: 'Ce jeu n’est pas disponible actuellement', s: 'n’est pas activé par cette entreprise.', b: 'Retour au jeu' },
    en: { r: 'The wheel of fortune', d: 'The raffle draw', t: 'This game is currently unavailable', s: 'is not enabled by this business.', b: 'Back to the game' },
    ar: { r: 'عجلة الحظ', d: 'السحب', t: 'هذه اللعبة غير متاحة حاليًا', s: 'غير مُفعّلة من قبل هذه الشركة.', b: 'العودة إلى اللعبة' },
  }[lang] || {};
  const name = T[game === 'roulette' ? 'r' : 'd'];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">🚫</div>
      <h1 className="text-2xl font-bold">{T.t}</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">{name} {T.s}</p>
      <Link href={back} className="btn-primary mt-6 !py-2">{T.b}</Link>
    </main>
  );
}

// QR codes ciblés par jeu : /{slug}/play/roulette et /{slug}/play/tirage.
// Si le jeu demandé n’est pas activé -> page élégante (FR/EN/AR léger).
export default async function ForcedGamePage({ params }) {
  const { companySlug, game } = await params;
  const store = cookies();
  const lang = store.get('lang')?.value || 'fr';
  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-center">
        <div>
          <div className="text-5xl">🚫</div>
          <h1 className="mt-3 text-2xl font-bold">Entreprise introuvable</h1>
          <Link href="/" className="mt-4 inline-block text-sm text-gray-500 hover:underline">Accueil</Link>
        </div>
      </main>
    );
  }

  const settings = await db.companySetting.findMany({
    where: { companyId: company.id, key: 'GAME_MODE' },
    select: { value: true },
  });
  const gameMode = settings[0]?.value || 'wheel';
  const back = `/${companySlug}/play`;

  if (game === 'tirage') {
    if (gameMode === 'wheel') return <NotAvailable game="tirage" back={back} lang={lang} />;
    redirect(`/${companySlug}/draw`);
  }
  if (game === 'roulette') {
    if (gameMode === 'raffle') return <NotAvailable game="roulette" back={back} lang={lang} />;
    redirect(back);
  }
  redirect(back);
}
