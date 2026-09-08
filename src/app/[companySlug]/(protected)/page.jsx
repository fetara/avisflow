import Link from 'next/link';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import BarChart from '@/components/BarChart';

export const dynamic = 'force-dynamic';

function FunnelCard({ label, value, hint, accent }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${accent || 'text-gray-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default async function Dashboard({ params, searchParams }) {
  const { companySlug } = await params;
  const days = Math.min(90, Math.max(7, parseInt(searchParams?.days || '30', 10)));
  // Isolation multi-entreprise : le super admin voit tout, l'admin entreprise son périmètre
  const session = await getAdminSession();
  const companyId = session?.companyId || null;
  const customerWhere = { companyId };
  const [scanCount, customers, verified, spins, reviews, approved, googleClicks, ratingDist, prizes, qrs, spinRows, reviewRows] =
    await Promise.all([
      db.qrScan.count({ where: { qrCode: { companyId } } }),
      db.customer.count({ where: customerWhere }),
      db.customer.count({ where: { ...customerWhere, emailVerifiedAt: { not: null } } }),
      db.spin.count({ where: { customer: { companyId } } }),
      db.review.count({ where: { customer: { companyId } } }),
      db.review.count({ where: { customer: { companyId }, status: 'approved' } }),
      db.review.count({ where: { customer: { companyId }, googleClick: true } }),
      db.review.groupBy({ by: ['rating'], _count: { _all: true }, where: { customer: { companyId } } }),
      db.prize.findMany({ where: { companyId }, include: { _count: { select: { spins: true } } }, orderBy: { sortOrder: 'asc' } }),
      db.qrCode.findMany({ where: { companyId }, include: { _count: { select: { scans: true } } }, orderBy: { createdAt: 'desc' } }),
      db.spin.findMany({ where: { customer: { companyId } }, select: { customer: { select: { sourceQrId: true } } } }),
      db.review.findMany({ where: { customer: { companyId } }, select: { googleClick: true, customer: { select: { sourceQrId: true } } } }),
    ]);

  // Série journalière pour le graphique (derniers N jours)
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const [recentSpinRows, recentCustomerRows] = await Promise.all([
    db.spin.findMany({ where: { customer: { companyId }, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.customer.findMany({ where: { companyId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const buckets = [];
  const idx = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    idx[key] = buckets.length;
    buckets.push({ label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: 0 });
  }
  for (const r of recentSpinRows) buckets[idx[r.createdAt.toISOString().slice(0, 10)]].value++;
  const recentSpins = await db.spin.findMany({
    where: { customer: { companyId } },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { prize: { select: { label: true } }, customer: { select: { firstName: true, lastName: true } } },
  });

  const maxRating = Math.max(1, ...ratingDist.map((r) => r._count._all));
  const totalWeight = prizes.filter((p) => p.active).reduce((s, p) => s + p.weight, 0) || 1;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      {/* Entonnoir global */}
      <section>
        <h2 className="mb-3 font-semibold text-gray-700">Entonnoir de conversion global</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <FunnelCard label="Scans QR" value={scanCount} />
          <FunnelCard label="Inscrits" value={customers} hint={`${customers ? Math.round((verified / customers) * 100) : 0} % validés`} />
          <FunnelCard label="E-mails validés" value={verified} />
          <FunnelCard label="Parties jouées" value={spins} />
          <FunnelCard label="Avis déposés" value={reviews} hint={`${spins ? Math.round((reviews / spins) * 100) : 0} % des joueurs`} />
          <FunnelCard label="Clics Google" value={googleClicks} hint="bouton avis Google" />
        </div>
      </section>

      {/* Graphique : parties jouées par jour + filtre période */}
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-700">Parties jouées par jour</h2>
          <div className="flex gap-1 text-xs" role="group" aria-label="Période">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`?days=${d}`}
                className={`rounded-lg px-2.5 py-1.5 font-semibold ${days === d ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {d} j
              </Link>
            ))}
          </div>
        </div>
        <BarChart data={buckets} ariaLabel={`Parties jouées par jour sur ${days} jours`} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Répartition des notes */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Répartition des notes ({reviews})</h2>
          {[5, 4, 3, 2, 1].map((n) => {
            const row = ratingDist.find((r) => r.rating === n);
            const count = row?._count._all || 0;
            return (
              <div key={n} className="mb-2 flex items-center gap-3 text-sm">
                <span className="w-14 text-amber-400">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / maxRating) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-semibold">{count}</span>
              </div>
            );
          })}
          <p className="mt-4 text-xs text-gray-500">Avis approuvés : <strong>{approved}</strong> / {reviews}</p>
        </section>

        {/* Lots */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Lots distribués</h2>
          {prizes.map((p) => (
            <div key={p.id} className="mb-2 flex items-center justify-between text-sm">
              <span className={p.active ? '' : 'text-gray-400 line-through'}>
                {p.label}
                <span className="ml-2 text-xs text-gray-400">({((p.weight / totalWeight) * 100).toFixed(0)} %)</span>
              </span>
              <span className="font-semibold">{p._count.spins}{p.stock !== null ? <span className="text-gray-400"> / stock {p.stock}</span> : ''}</span>
            </div>
          ))}
          <Link href={`/${companySlug}/lots`} className="mt-3 inline-block text-sm text-brand-600 hover:underline">Gérer les lots →</Link>
        </section>
      </div>

      {/* Entonnoir par QR code */}
      <section>
        <h2 className="mb-3 font-semibold text-gray-700">Performance par QR code</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Emplacement</th><th className="p-3">Scans</th><th className="p-3">Inscrits</th>
                <th className="p-3">Validés</th><th className="p-3">Joués</th><th className="p-3">Avis</th>
                <th className="p-3">Google</th><th className="p-3">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {qrs.map((q) => {
                const ins = q._count.scans;
                const playedQ = spinRows.filter((s) => s.customer.sourceQrId === q.id).length;
                const reviewsQ = reviewRows.filter((r) => r.customer.sourceQrId === q.id).length;
                const googleQ = reviewRows.filter((r) => r.googleClick && r.customer.sourceQrId === q.id).length;
                const conv = ins ? Math.round((reviewsQ / ins) * 100) : 0;
                return (
                  <tr key={q.id} className="border-t">
                    <td className="p-3 font-medium">{q.label} {q.active ? '' : <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">désactivé</span>}</td>
                    <td className="p-3">{ins}</td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3">{playedQ}</td>
                    <td className="p-3">{reviewsQ}</td>
                    <td className="p-3">{googleQ}</td>
                    <td className="p-3"><span className={`font-semibold ${conv >= 10 ? 'text-emerald-600' : conv >= 3 ? 'text-amber-600' : 'text-gray-400'}`}>{conv} %</span></td>
                  </tr>
                );
              })}
              {qrs.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-400">Aucun QR code — <Link className="text-brand-600" href={`/${companySlug}/qr-codes`}>créez-en un</Link></td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">Astuce : les inscrits/validés par source sont visibles dans l&apos;onglet Clients (filtre par source).</p>
      </section>

      {/* Feed : dernières parties jouées */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Dernières parties</h2>
        {recentSpins.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune partie pour le moment.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {recentSpins.map((sp) => (
              <li key={sp.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span>
                  <span className="font-medium">{sp.prize.label}</span>
                  <span className="ml-2 text-gray-500">
                    {[sp.customer.firstName, sp.customer.lastName].filter(Boolean).join(' ') || sp.customer.email}
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(sp.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}