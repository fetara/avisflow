'use client';

import { useParams } from 'next/navigation';

import { useCallback, useEffect, useState } from 'react';

export default function QrCodesPage() {
  const { companySlug } = useParams();
  const [qrs, setQrs] = useState([]);
  const [form, setForm] = useState({ label: '', slug: '', destination: '/jeu', expiresAt: '' });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, label, slug, destination, expiresAt }

  const load = useCallback(async () => {
    const res = await fetch(`/api/${companySlug}/qrcodes`);
    if (res.ok) setQrs((await res.json()).qrs || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/${companySlug}/qrcodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, active: true, expiresAt: form.expiresAt || null }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm({ label: '', slug: '', destination: '/jeu', expiresAt: '' });
    load();
  }

  async function toggle(qr) {
    await fetch(`/api/${companySlug}/qrcodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qr.id, label: qr.label, slug: qr.slug, destination: qr.destination, active: !qr.active, expiresAt: qr.expiresAt }),
    });
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch(`/api/${companySlug}/qrcodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, active: editing.active ?? true, expiresAt: editing.expiresAt || null }),
    });
    setEditing(null);
    load();
  }

  async function remove(qr) {
    if (!confirm(`Supprimer le QR code « ${qr.label} » ? Les statistiques associées seront perdues.`)) return;
    await fetch(`/api/${companySlug}/qrcodes?id=${qr.id}`, { method: 'DELETE' });
    load();
  }

  const APP = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">QR codes en boutique</h1>
      <a href={`/api/${companySlug}/play-qr`} download
        className="mb-4 inline-block rounded-lg border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
        ⬇️ QR de la page de jeu (/{companySlug}/play)
      </a>
      <p className="text-sm text-gray-500">
        QR dynamiques : le code encode <code className="rounded bg-gray-100 px-1">/r/{"{slug}"}</code> —
        changez la destination quand vous voulez sans réimprimer.
      </p>

      {/* Création */}
      <form onSubmit={create} className="card !p-4 grid gap-3 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <label className="label">Libellé *</label>
          <input className="input !py-2" required maxLength={60} value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex. Caisse 1, Comptoir, Opération Noël…" />
        </div>
        <div>
          <label className="label">Slug (optionnel)</label>
          <input className="input !py-2" maxLength={60} value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" />
        </div>
        <div>
          <label className="label">Destination</label>
          <input className="input !py-2" value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="/jeu" />
        </div>
        <div>
          <label className="label">Expire le (optionnel)</label>
          <input type="date" className="input !py-2" value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        <div className="sm:col-span-5 flex items-center gap-3">
          <button className="btn-primary !py-2">+ Créer le QR code</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      {/* Liste */}
      <div className="space-y-3">
        {qrs.map((qr) => (
          <div key={qr.id} className="card !p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-48">
                <p className="font-bold">{qr.label}</p>
                <p className="text-xs text-gray-500">
                  <a href={`${APP}/r/${qr.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    {APP}/r/{qr.slug}
                  </a>
                  {qr.expiresAt && <> · expire le {new Date(qr.expiresAt).toLocaleDateString('fr-FR')}</>}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${qr.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                {qr.active ? '● Actif' : '○ Désactivé'}
              </span>
              <span className="text-sm text-gray-600">👁 {qr._count.scans} scans · 👥 {qr._count.customers} inscrits</span>
              <div className="flex flex-wrap gap-2 text-sm">
                <button onClick={() => toggle(qr)} className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium hover:bg-gray-200">
                  {qr.active ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => setEditing({ ...qr, expiresAt: qr.expiresAt ? qr.expiresAt.slice(0, 10) : '' })}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-100">Éditer</button>
                <a href={`/api/${companySlug}/qrcodes/${qr.id}/visual?format=png`} className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100">PNG</a>
                <a href={`/api/${companySlug}/qrcodes/${qr.id}/visual?format=svg&logo=1`} className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100">SVG</a>
                <a href={`/api/${companySlug}/qrcodes/${qr.id}/visual?format=pdf&poster=comptoir&text=${encodeURIComponent('Scannez ce code et tentez de gagner un cadeau !')}`} className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100">PDF comptoir</a>
                <a href={`/api/${companySlug}/qrcodes/${qr.id}/visual?format=pdf&poster=tenture`} className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100">PDF tenture</a>
                <a href={`/api/${companySlug}/qrcodes/${qr.id}/visual?format=pdf&poster=sticker`} className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100">PDF sticker</a>
                <button onClick={() => remove(qr)} className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100">Suppr.</button>
              </div>
            </div>
          </div>
        ))}
        {qrs.length === 0 && <div className="card text-center text-gray-400">Aucun QR code créé.</div>}
      </div>

      {/* Modale d'édition */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} className="card w-full max-w-md space-y-3">
            <h2 className="text-lg font-bold">Éditer « {editing.label} »</h2>
            <div>
              <label className="label">Libellé</label>
              <input className="input" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </div>
            <div>
              <label className="label">Destination (modifiable sans réimprimer)</label>
              <input className="input" value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} />
            </div>
            <div>
              <label className="label">Expire le</label>
              <input type="date" className="input" value={editing.expiresAt} onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1 !py-2">Enregistrer</button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 !py-2">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
