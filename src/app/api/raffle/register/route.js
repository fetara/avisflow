import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/utils';

const schema = z.object({
  companySlug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(60),
  email: z.string().email().max(120).toLowerCase(),
});

// Inscription publique au tirage (pendant la période d'ouverture).
// Anti-abus : rate-limit IP ; 1 inscription par e-mail et par tirage.
export async function POST(req) {
  const ip = getClientIp(req);
  if (!rateLimit(`raffle:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Trop de tentatives, réessayez dans quelques minutes.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Nom et e-mail valides requis.' }, { status: 400 });
  const { companySlug, name, email } = parsed.data;

  const company = await db.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.active) return NextResponse.json({ error: 'Tirage indisponible.' }, { status: 404 });

  const draw = await db.raffleDraw.findFirst({
    where: { companyId: company.id, status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
  });
  if (!draw) return NextResponse.json({ error: 'Aucun tirage en cours.' }, { status: 404 });

  const now = new Date();
  if ((draw.startsAt && now < draw.startsAt) || (draw.endsAt && now > draw.endsAt)) {
    return NextResponse.json({ error: 'Les inscriptions sont fermées pour ce tirage.' }, { status: 400 });
  }

  const existing = await db.raffleEntry.findUnique({
    where: { drawId_email: { drawId: draw.id, email } },
  });
  if (existing) return NextResponse.json({ error: 'Vous êtes déjà inscrit à ce tirage !' }, { status: 409 });

  await db.raffleEntry.create({ data: { drawId: draw.id, name, email, source: 'onsite' } });
  return NextResponse.json({ ok: true, message: 'Vous êtes inscrit au tirage — bonne chance !' });
}
