import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendCustomerValidation } from '@/lib/mailer';
import { randomToken, sha256 } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/utils';
import { getCompanySettings } from '@/lib/db';

// Prénom/nom/téléphone sont rendus optionnels AU NIVEAU ZOD : c'est la configuration
// de l'entreprise (FORM_* dans CompanySetting) qui impose ou non les champs côté serveur.
const schema = z.object({
  firstName: z.string().trim().max(60).optional().or(z.literal('')),
  lastName: z.string().trim().max(60).optional().or(z.literal('')),
  email: z.string().email().max(120).toLowerCase(),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  consent: z.literal(true),
  sourceSlug: z.string().max(60).optional().or(z.literal('')),
  companySlug: z.string().max(80).optional().or(z.literal('')),
});

// Étape 1 : identification du client + envoi de l'e-mail de validation.
export async function POST(req) {
  const ip = getClientIp(req);
  const rl = rateLimit(`identify:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Trop de tentatives, réessayez dans quelques minutes.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Formulaire invalide (consentement RGPD obligatoire).' }, { status: 400 });
  }
  const { firstName, lastName, email, phone, consent, sourceSlug, companySlug } = parsed.data;

  // Entreprise du jeu : résolue depuis le QR scanné, sinon depuis le slug d'entreprise
  // de l'URL de jeu (/{slug}/play). Un joueur peut ainsi participer chez plusieurs commerces.
  // Les slugs de QR étant uniques par entreprise, la recherche est scopée.
  let sourceQrId = null;
  let companyId = null;
  if (companySlug) {
    const company = await db.company.findUnique({ where: { slug: companySlug }, select: { id: true } });
    companyId = company?.id ?? null;
  }
  if (sourceSlug) {
    const qr = await db.qrCode.findFirst({
      where: { slug: sourceSlug, ...(companyId ? { companyId } : {}) },
    });
    if (qr && qr.active) {
      sourceQrId = qr.id;
      companyId = qr.companyId ?? companyId;
    }
  }

  // Champs requis = uniquement ceux activés par l'entreprise (prénom & nom activés par défaut)
  const cs = await getCompanySettings(companyId);
  const needFirst = cs.FORM_FIRSTNAME !== 'false';
  const needLast = cs.FORM_LASTNAME !== 'false';
  if ((needFirst && !firstName) || (needLast && !lastName)) {
    return NextResponse.json({ error: 'Formulaire incomplet.' }, { status: 400 });
  }

  // Un seul tour par e-mail ET PAR ENTREPRISE : déjà validé chez ce commerçant ?
  const existing = await db.customer.findFirst({ where: { email, companyId } });
  if (existing?.emailVerifiedAt) {
    return NextResponse.json({ error: 'Cet e-mail a déjà participé au jeu. Un seul tour par e-mail !' }, { status: 409 });
  }

  // Token de validation (30 min)
  const token = randomToken(24);
  await db.emailToken.create({
    data: {
      email,
      tokenHash: sha256(token),
      type: 'CUSTOMER_VERIFY',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      payload: JSON.stringify({ firstName, lastName, email, phone: phone || null, consentAt: new Date().toISOString(), sourceQrId, companyId, firstName: firstName || '', lastName: lastName || '' }),
    },
  });

  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  const link = `${appUrl}/api/verify?token=${token}`;
  try {
    await sendCustomerValidation(email, firstName, link);
  } catch (e) {
    console.error('mail error', e);
    return NextResponse.json({ error: "Impossible d'envoyer l'e-mail pour le moment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, demoToken: process.env.DEMO_MODE === 'true' ? token : undefined });
}
