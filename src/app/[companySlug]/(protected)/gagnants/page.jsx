'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TableSkeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';

/* Gestion des gagnants : liste des gains, statut à retirer/remis, QR du code cadeau. */
export default function GagnantsPage() {
  const { companySlug } = useParams();
  const [winners, setWinners] = useState(null);
  const [status, setStatus] = useState('all');
  const [code, setCode] = useState('');
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status !== 'all') qs.set('status', status);
    if (code) qs.set('code', code);
    const res = await fetch(`/api/${companySlug}/winners?${qs}`);
    if (res.ok) setWinners((await res.json()).winners || []);
    else setWinners([]);
  }, [companySlug, status, code]);

  useEffect(() => { load(); }, [load]);

  async function toggleRedeemed(w) {
    const res = await fetch(`/api/${companySlug}/winners`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, redeemed: !w.redeemedAt }),
    });
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    show(w.redeemedAt ? 'Remise annulée' : '✓ Gain marqué comme remis');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gagnants</h1>
      <p className="text-sm text-gray-500">
        Suivi des lots gagnés : marquez « Remis » quand le client présente son code en caisse.
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrer par statut" className="flex gap-1 rounded-xl border border-gray-200 p-1 dark:border-gray-700">
          {[['all', 'Tous'], ['pending', 'À retirer'], ['redeemed', 'Remis']].map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${status === v ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
        <input
          className="input !w-56 !py-2" placeholder="Rechercher un code…"
          value={code} onChange={(e) => setCode(e.target.value)} aria-label="Rechercher un code cadeau"
        />
      </div>

      {winners === null ? (
        <div className="card"><TableSkeleton rows={5} cols={5} /></div>
      ) : winners.length === 0 ? (
        <EmptyState icon="🏆" title="Aucun gain pour ce filtre"
          text="Les gains apparaissent ici dès que des joueurs font tourner la roue." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950">
              <tr>
                <th className="p-3">Lot</th><th className="p-3">Joueur</th><th className="p-3">Code</th>
                <th className="p-3">QR</th><th className="p-3">Gagné le</th><th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.id} className="border-t dark:border-gray-800">
                  <td className="p-3 font-medium">{w.prize.label}</td>
                  <td className="p-3">
                    {[w.customer.firstName, w.customer.lastName].filter(Boolean).join(' ') || '—'}
                    <span className="block text-xs text-gray-400">{w.customer.email}</span>
                  </td>
                  <td className="p-3 font-mono font-semibold">{w.giftCode}</td>
                  <td className="p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/${companySlug}/winners/qr?code=${w.giftCode}`} alt={`QR ${w.giftCode}`}
                      className="h-12 w-12 rounded border hover:scale-150 transition" loading="lazy" />
                  </td>
                  <td className="p-3 text-gray-500">{new Date(w.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    {w.redeemedAt ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        Remis
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        À retirer
                      </span>
                    )}
                    <button onClick={() => toggleRedeemed(w)} className="ml-2 text-xs text-brand-600 hover:underline">
                      {w.redeemedAt ? 'annuler' : '✓ remis'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast />
    </div>
  );
}
