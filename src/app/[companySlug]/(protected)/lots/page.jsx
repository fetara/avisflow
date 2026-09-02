'use client';

import { useParams } from 'next/navigation';

import { useCallback, useEffect, useState } from 'react';
import { TableSkeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';

const EMPTY = { label: '', weight: 1, stock: '', active: true, sortOrder: 0 };

export default function LotsPage() {
  const { companySlug } = useParams();
  const [prizes, setPrizes] = useState(null); // null = chargement
  const [newPrize, setNewPrize] = useState(EMPTY);
  const [error, setError] = useState('');
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/${companySlug}/prizes`);
    if (res.ok) setPrizes((await res.json()).prizes || []);
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  const totalWeight = prizes.filter((p) => p.active).reduce((s, p) => s + p.weight, 0) || 1;

  async function update(p, patch) {
    setPrizes((cur) => cur.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    await fetch(`/api/${companySlug}/prizes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id, label: p.label,
        weight: Number(patch.weight ?? p.weight),
        stock: patch.stock === '' || patch.stock === null ? null : Number(patch.stock),
        active: patch.active ?? p.active,
        sortOrder: p.sortOrder,
      }),
    });
    load();
  }

  async function add(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/${companySlug}/prizes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newPrize.label,
        weight: Number(newPrize.weight),
        stock: newPrize.stock === '' ? null : Number(newPrize.stock),
        active: true,
        sortOrder: prizes.length,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); show(data.error, 'error'); return; }
    setNewPrize(EMPTY);
    show('Lot ajouté !');
    load();
  }

  async function remove(p) {
    if (!confirm(`Supprimer le lot « ${p.label} » ? (impossible s'il a déjà été gagné)`)) return;
    const res = await fetch(`/api/${companySlug}/prizes?id=${p.id}`, { method: 'DELETE' });
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    show('Lot supprimé');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lots de la roue</h1>
      <p className="text-sm text-gray-500">Poids = probabilité relative. Ex. poids 4 sur total 10 → 40 % de chances. Stock vide = illimité.</p>

      {prizes === null ? (
        <div className="card"><TableSkeleton rows={5} cols={6} /></div>
      ) : prizes.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="Aucun lot pour l'instant"
          text="Créez votre premier lot ci-dessous pour que votre roue devienne jouable. Pensez à un lot « Rejouez demain ! » pour les non-gagnants."
        />
      ) : (
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Lot</th><th className="p-3">Poids</th><th className="p-3">Probabilité</th>
              <th className="p-3">Stock</th><th className="p-3">Distribués</th><th className="p-3">Actif</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <input className="input !py-1.5 !w-56" defaultValue={p.label}
                    onBlur={(e) => e.target.value !== p.label && update(p, { label: e.target.value })} />
                </td>
                <td className="p-3">
                  <input type="number" min="0" max="100" className="input !py-1.5 !w-20" defaultValue={p.weight}
                    onBlur={(e) => Number(e.target.value) !== p.weight && update(p, { weight: e.target.value })} />
                </td>
                <td className="p-3 font-semibold text-brand-700">{p.active ? ((p.weight / totalWeight) * 100).toFixed(1) : 0} %</td>
                <td className="p-3">
                  <input type="number" min="0" placeholder="∞" className="input !py-1.5 !w-24" defaultValue={p.stock ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      if (v !== p.stock) update(p, { stock: v });
                    }} />
                </td>
                <td className="p-3">{p._count.spins}</td>
                <td className="p-3">
                  <input type="checkbox" className="h-5 w-5 accent-pink-600" checked={p.active}
                    onChange={(e) => update(p, { active: e.target.checked })} />
                </td>
                <td className="p-3">
                  <button onClick={() => remove(p)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <form onSubmit={add} className="card !p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="label">Nouveau lot</label>
          <input className="input !py-2" required maxLength={80} value={newPrize.label}
            onChange={(e) => setNewPrize({ ...newPrize, label: e.target.value })} placeholder="Ex. Dessert offert" />
        </div>
        <div>
          <label className="label">Poids</label>
          <input type="number" min="0" max="100" className="input !py-2 !w-24" value={newPrize.weight}
            onChange={(e) => setNewPrize({ ...newPrize, weight: e.target.value })} />
        </div>
        <div>
          <label className="label">Stock (∞ si vide)</label>
          <input type="number" min="0" className="input !py-2 !w-28" value={newPrize.stock}
            onChange={(e) => setNewPrize({ ...newPrize, stock: e.target.value })} />
        </div>
        <button className="btn-primary !py-2">Ajouter</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <Toast />
    </div>
  );
}
