import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Le jeu n'est plus accessible génériquement : il faut le contexte d'une entreprise.
// /jeu?src={slug} (lien legacy / QR) redirige vers /{slug}/play ; sans contexte -> vitrine.
export default async function JeuRedirect({ searchParams }) {
  const src = searchParams?.src || '';
  if (src) {
    const qr = await db.qrCode.findUnique({
      where: { slug: src },
      select: { company: { select: { slug: true } } },
    });
    if (qr?.company?.slug) redirect(`/${qr.company.slug}/play`);
  }
  redirect('/');
}
