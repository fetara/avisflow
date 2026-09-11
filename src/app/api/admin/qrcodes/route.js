import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission, companyScope, logAction, logCrossAttempt } from '@/lib/admin-guard';
import { slugify } from '@/lib/utils';

const qrSchema = z.object({
  label: z.string().trim().min(1).max(60),
  slug: z.string().trim().max(60).optional().or(z.literal('')),
  destination: z.string().trim().max(200).optional().or(z.literal('')),
  active: z.boolean().default(true),
  expiresAt: z.string().optional().nullable(),
});

export async function GET(req) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;
  const qrs = await db.qrCode.findMany({
    where: { companyId: companyScope(guard) },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { scans: true, customers: true } } },
  });
  return NextResponse.json({ qrs });
}

// Rend un slug de QR unique DANS l'entreprise (unicité par entreprise depuis la
// migration 20260911000000). En collision interne, on suffixe en numérique.
async function uniqueQrSlug(base, companyId) {
  const scope = companyId ? { companyId, slug: base } : { slug: base, companyId: null };
  if (!(await db.qrCode.findFirst({ where: scope }))) return base;
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    const sc = companyId ? { companyId, slug: candidate } : { slug: candidate, companyId: null };
    if (!(await db.qrCode.findFirst({ where: sc }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Destination par défaut d'un QR : la page joueur DE l'entreprise (/{slug}/play).
// Pour un super admin hors entreprise, repli sur l'entreprise du QR manipulé ou /.
async function defaultDestination(req, companyId = null) {
  let cid = companyId;
  if (cid == null) {
    const guard = await requirePermission(req, 'manage_qrcodes');
    cid = guard.error ? null : guard.companyId;
  }
  if (cid) {
    const company = await db.company.findUnique({ where: { id: cid }, select: { slug: true } });
    if (company?.slug) return `/${company.slug}/play`;
  }
  return '/';
}

export async function POST(req) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;
  const parsed = qrSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'QR code invalide.' }, { status: 400 });
  const { label, slug, destination, active, expiresAt } = parsed.data;

  const finalSlug = slugify(slug || label);
  const dest = destination || (await defaultDestination(req, guard.companyId));
  const exists = await db.qrCode.findUnique({ where: { slug: finalSlug } });
  if (exists) return NextResponse.json({ error: `Le slug "${finalSlug}" est déjà utilisé.` }, { status: 409 });

  const qr = await db.qrCode.create({
    data: {
      label,
      slug: finalSlug,
      destination: dest,
      active,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: guard.admin.id,
      companyId: guard.companyId,
    },
  });
  await logAction(guard.admin.id, 'qr.create', 'QrCode', qr.id);
  return NextResponse.json({ ok: true, qr });
}

export async function PATCH(req) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = qrSchema.extend({ id: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'QR code invalide.' }, { status: 400 });
  const { id, label, slug, destination, active, expiresAt } = parsed.data;

  const existing = await db.qrCode.findFirst({ where: { id, companyId: companyScope(guard) } });
  const data = { label, active, destination: destination || (await defaultDestination(req, existing?.companyId ?? guard.companyId)), expiresAt: expiresAt ? new Date(expiresAt) : null };
  if (slug) {
    const base = slugify(slug);
    data.slug = (await db.qrCode.findFirst({ where: { slug: base, companyId: companyScope(guard) } }))
      ? base // renommage vers son propre slug : inchangé
      : await uniqueQrSlug(base, existing?.companyId ?? guard.companyId);
  }
  const res = await db.qrCode.updateMany({ where: { id, companyId: companyScope(guard) }, data }).catch(() => null);
  if (!res || res.count === 0) {
    if (await db.qrCode.findUnique({ where: { id } })) await logCrossAttempt(guard.admin.id, 'QrCode', id);
    return NextResponse.json({ error: 'QR code introuvable.' }, { status: 404 });
  }
  await logAction(guard.admin.id, 'qr.update', 'QrCode', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;
  const id = new URL(req.url).searchParams.get('id');
  const res = await db.qrCode.deleteMany({ where: { id, companyId: companyScope(guard) } }).catch(() => null);
  if (!res || res.count === 0) {
    if (await db.qrCode.findUnique({ where: { id } })) await logCrossAttempt(guard.admin.id, 'QrCode', id);
    return NextResponse.json({ error: 'QR code introuvable.' }, { status: 404 });
  }
  await logAction(guard.admin.id, 'qr.delete', 'QrCode', id);
  return NextResponse.json({ ok: true });
}
