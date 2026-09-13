import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Le jeu n'est plus accessible génériquement : il faut le contexte d'une entreprise.
// /jeu?src={slug} (lien legacy / QR) redirige vers /{slug}/play ; sans contexte -> vitrine.
export default async function JeuRedirect({ searchParams }) {
  const src = searchParams?.src || '';
  if (src) {
    // src peut être un slug d'entreprise (URL /{slug}/play) ou un slug de QR
    // (slugs uniques PAR entreprise -> findFirst, jamais findUnique sur le slug seul)
    const company = await db.company.findUnique({ where: { slug: src }, select: { slug: true } });
    if (company?.slug) redirect(`/${company.slug}/play`);
    const qr = await db.qrCode.findFirst({
      where: { slug: src },
      orderBy: { createdAt: 'desc' },
      select: { company: { select: { slug: true } } },
    });
    if (qr?.company?.slug) redirect(`/${qr.company.slug}/play`);
  }
  redirect('/');
}
