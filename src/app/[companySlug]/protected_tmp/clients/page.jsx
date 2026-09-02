'use client';

import { useCallback, useEffect, useState } from 'react';

export default function ClientsPage() {
  const [customers, setCustomers] = useState([]);
  const [sources, setSources] = useState([]);
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ ...(q && { q }), ...(source && { source }) });
    const res = await fetch(`/api/admin/customers?${qs}`);
    if (res.ok) setCustomers((await res.json()).customers || []);
  }, [q, source]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/admin/qrcodes').then((r) => r.json()).then((d) => setSources(d.qrs || [])); }, []);

  async function gdprDelete(c) {
    if (!confirm(`Droit à l'oubli RGPD : anonymiser définitivement ${c.firstName} ${c.lastName} (${c.email}) ?\nSes avis et parties seront supprimés.`)) return;
    await fetch(`/api/admin/customers?id=${c.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clients <span className="text-base font-normal text-gray-400">({customers.length})</span></h1>
        <a href={`/api/admin/customers?format=csv${q ? `&q=${encodeURIComponent(q)}` : ''}${source ? `&source=${source}` : ''}`}
          className="btn-secondary !py-2">⬇ Export CSV</a>
      </div>

      <div className="card !p-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Recherche (nom, e-mail, téléphone)</label>
          <input className="input !py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
        </div>
        <div>
          <label className="label">Source (QR code)</label>
          <select className="input !py-2" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Toutes</option>
            {sources.map((s) => <option key={s.id} value={s.slug}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Client</th><th className="p-3">E-mail</th><th className="p-3">Téléphone</th>
              <th className="p-3">Source</th><th className="p-3">Validé</th><th className="p-3">Joués</th>
              <th className="p-3">Avis</th><th className="p-3">Inscrit le</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className={`border-t ${c.anonymizedAt ? 'text-gray-400 italic' : ''}`}>
                <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone || '—'}</td>
                <td className="p-3">{c.sourceQr?.label || '—'}</td>
                <td className="p-3">{c.emailVerifiedAt ? '✅' : '⏳'}</td>
                <td className="p-3">{c._count.spins}</td>
                <td className="p-3">{c._count.reviews}</td>
                <td className="p-3">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">
                  {!c.anonymizedAt && (
                    <button onClick={() => gdprDelete(c)}
                      className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                      Droit à l&apos;oubli
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-400">Aucun client trouvé.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
