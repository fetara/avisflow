import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';
import { slugify } from '@/lib/utils';

const qrSchema = z.object({
  label: z.string().trim().min(1).max(60),
  slug: z.string().trim().max(60).optional().or(z.literal('')),
  destination: z.string().trim().max(200).optional().or(z.literal('')),
  active: z.boolean().default(true),
  expiresAt: z.string().optional().nullable(),
});

export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const qrs = await db.qrCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { scans: true, customers: true } } },
  });
  return NextResponse.json({ qrs });
}

export async function POST(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const parsed = qrSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'QR code invalide.' }, { status: 400 });
  const { label, slug, destination, active, expiresAt } = parsed.data;

  const finalSlug = slugify(slug || label);
  const exists = await db.qrCode.findUnique({ where: { slug: finalSlug } });
  if (exists) return NextResponse.json({ error: `Le slug "${finalSlug}" est déjà utilisé.` }, { status: 409 });

  const qr = await db.qrCode.create({
    data: {
      label,
      slug: finalSlug,
      destination: destination || '/jeu',
      active,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: guard.admin.id,
    },
  });
  await logAction(guard.admin.id, 'qr.create', 'QrCode', qr.id);
  return NextResponse.json({ ok: true, qr });
}

export async function PATCH(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = qrSchema.extend({ id: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'QR code invalide.' }, { status: 400 });
  const { id, label, slug, destination, active, expiresAt } = parsed.data;

  const data = { label, active, destination: destination || '/jeu', expiresAt: expiresAt ? new Date(expiresAt) : null };
  if (slug) data.slug = slugify(slug);
  const qr = await db.qrCode.update({ where: { id }, data }).catch(() => null);
  if (!qr) return NextResponse.json({ error: 'QR code introuvable.' }, { status: 404 });
  await logAction(guard.admin.id, 'qr.update', 'QrCode', id);
  return NextResponse.json({ ok: true, qr });
}

export async function DELETE(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const id = new URL(req.url).searchParams.get('id');
  await db.qrCode.delete({ where: { id } }).catch(() => null);
  await logAction(guard.admin.id, 'qr.delete', 'QrCode', id);
  return NextResponse.json({ ok: true });
}
