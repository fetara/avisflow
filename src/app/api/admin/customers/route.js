import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';

// Liste + filtres + export CSV des clients.
export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const sp = new URL(req.url).searchParams;
  const where = {};
  const q = sp.get('q');
  const source = sp.get('source');
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }
  if (source) where.sourceQr = { slug: source };

  const customers = await db.customer.findMany({
    where,
    include: {
      sourceQr: { select: { label: true, slug: true } },
      _count: { select: { spins: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  if (sp.get('format') === 'csv') {
    const header = 'prenom;nom;email;telephone;consentement;valide_le;source;jeux;avis;cree_le';
    const rows = customers.map((c) =>
      [c.firstName, c.lastName, c.email, c.phone || '', c.consentAt.toISOString(),
       c.emailVerifiedAt?.toISOString() || '', c.sourceQr?.label || '', c._count.spins,
       c._count.reviews, c.createdAt.toISOString()].join(';')
    );
    return new NextResponse('\uFEFF' + [header, ...rows].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clients.csv"',
      },
    });
  }

  return NextResponse.json({ customers });
}

// Suppression RGPD : anonymisation du client (droit à l'oubli).
export async function DELETE(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });

  await db.$transaction([
    db.review.deleteMany({ where: { customerId: id } }),
    db.spin.deleteMany({ where: { customerId: id } }),
    db.customer.update({
      where: { id },
      data: {
        firstName: 'Anonymisé',
        lastName: 'Anonymisé',
        email: `efface+${id}@rgpd.local`,
        phone: null,
        anonymizedAt: new Date(),
      },
    }),
  ]);
  await logAction(guard.admin.id, 'customer.gdpr_delete', 'Customer', id);
  return NextResponse.json({ ok: true });
}
