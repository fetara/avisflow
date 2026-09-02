'use client';

import { useParams } from 'next/navigation';

import { useCallback, useEffect, useState } from 'react';

const STATUS = { pending: ['En attente', 'bg-amber-100 text-amber-800'], approved: ['Approuvé', 'bg-emerald-100 text-emerald-800'], rejected: ['Rejeté', 'bg-red-100 text-red-800'], hidden: ['Masqué', 'bg-gray-200 text-gray-600'] };

export default function AvisPage() {
  const { companySlug } = useParams();
  const [data, setData] = useState({ reviews: [], total: 0 });
  const [filters, setFilters] = useState({ status: 'all', minRating: 0, keyword: '', source: '' });
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v !== 0));
    const res = await fetch(`/api/${companySlug}/reviews?${qs}`);
    if (res.ok) setData(await res.json());
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch(`/api/${companySlug}/qrcodes`).then((r) => r.json()).then((d) => setSources(d.qrs || [])); }, []);

  async function act(id, action, reply) {
    setBusy(true);
    await fetch(`/api/${companySlug}/reviews`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reply }),
    });
    await load();
    setBusy(false);
  }

  function replyTo(r) {
    const reply = prompt(`Répondre à l'avis de ${r.customer?.firstName || ''} :`, r.reply || '');
    if (reply !== null) act(r.id, 'reply', reply);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Modération des avis <span className="text-base font-normal text-gray-400">({data.total})</span></h1>
      </div>

      {/* Filtres */}
      <div className="card !p-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Statut</label>
          <select className="input !py-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
            <option value="hidden">Masqués</option>
          </select>
        </div>
        <div>
          <label className="label">Note minimale</label>
          <select className="input !py-2" value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}>
            <option value={0}>Toutes</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>≥ {n} ★</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mot-clé</label>
          <input className="input !py-2" placeholder="Commentaire, nom…" value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        </div>
        <div>
          <label className="label">Source (QR)</label>
          <select className="input !py-2" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option value="">Toutes</option>
            {sources.map((s) => <option key={s.id} value={s.slug}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {data.reviews.map((r) => {
          const [label, cls] = STATUS[r.status] || STATUS.pending;
          return (
            <div key={r.id} className="card !p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-amber-400">{'★'.repeat(r.rating)}<span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                {r.autoApplied && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">auto-publié</span>}
                {r.googleClick && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">clic Google ✓</span>}
                <span className="text-sm font-semibold">{r.customer?.firstName} {r.customer?.lastName?.[0]}.</span>
                <span className="text-xs text-gray-400">
                  {r.customer?.sourceQr ? `via ${r.customer.sourceQr.label}` : 'sans source'} · {new Date(r.createdAt).toLocaleString('fr-FR')}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-gray-700">{r.comment}</p>}
              {r.reply && <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm"><strong>Réponse du commerce :</strong> {r.reply}</p>}
              {r.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt="Photo du client" className="mt-2 max-h-40 rounded-lg" />
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {r.status !== 'approved' && <button disabled={busy} onClick={() => act(r.id, 'approve')} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100">✓ Approuver</button>}
                {r.status !== 'rejected' && <button disabled={busy} onClick={() => act(r.id, 'reject')} className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100">✗ Rejeter</button>}
                {r.status !== 'hidden' && <button disabled={busy} onClick={() => act(r.id, 'hide')} className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-200">🙈 Masquer</button>}
                <button disabled={busy} onClick={() => replyTo(r)} className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-100">↩ Répondre</button>
              </div>
            </div>
          );
        })}
        {data.reviews.length === 0 && <div className="card text-center text-gray-400">Aucun avis ne correspond aux filtres.</div>}
      </div>
    </div>
  );
}
