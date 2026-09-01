'use client';

import { useCallback, useEffect, useState } from 'react';

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${accent || 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', adminEmail: '', adminPassword: '' });
  const [permEdit, setPermEdit] = useState(null); // { company, selected:Set }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        fetch('/api/super/stats').then((r) => r.json()),
        fetch('/api/super/companies').then((r) => r.json()),
      ]);
      setStats(s.totals ? s : null);
      if (s.recentLogs) setStats((prev) => ({ ...(prev || {}), ...s }));
      setData(c);
    } catch {
      setError('Chargement impossible.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCompany(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/super/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Erreur'); return; }
    setForm({ name: '', adminEmail: '', adminPassword: '' });
    load();
  }

  async function toggleActive(c) {
    await fetch(`/api/super/companies/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }),
    });
    load();
  }

  async function removeCompany(c) {
    if (!window.confirm(`Supprimer « ${c.name} » et TOUTES ses données (admins, lots, QR, clients) ? Action irréversible.`)) return;
    await fetch(`/api/super/companies/${c.id}`, { method: 'DELETE' });
    load();
  }

  async function resetPassword(c) {
    const pwd = window.prompt(`Nouveau mot de passe pour les admins de « ${c.name} » (8 caractères min) :`);
    if (!pwd || pwd.length < 8) return;
    const res = await fetch(`/api/super/companies/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: pwd }),
    });
    if (!res.ok) alert('Échec de la réinitialisation.');
  }

  async function impersonate(c) {
    const res = await fetch(`/api/super/companies/${c.id}/impersonate`, { method: 'POST' });
    if (res.ok) window.location.href = '/admin';
  }

  async function savePermissions() {
    await fetch(`/api/super/companies/${permEdit.company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: [...permEdit.selected] }),
    });
    setPermEdit(null);
    load();
  }

  if (!data) return <p className="text-gray-500">Chargement…</p>;

  const companies = data.companies || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gestion des entreprises</h1>
        <p className="mt-1 text-sm text-gray-400">Créez les comptes entreprises, configurez leurs droits et suivez l'activité globale.</p>
      </div>

      {stats?.totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Entreprises" value={stats.totals.companies} accent="text-amber-400" />
          <Stat label="Actives" value={stats.totals.activeCompanies} accent="text-emerald-400" />
          <Stat label="Admins entreprise" value={stats.totals.admins} />
          <Stat label="Clients" value={stats.totals.customers} />
          <Stat label="Parties jouées" value={stats.totals.spins} />
          <Stat label="Avis en attente" value={stats.totals.pendingReviews} accent="text-amber-400" />
        </div>
      )}

      {/* Création */}
      <form onSubmit={createCompany} className="grid gap-3 rounded-2xl border border-gray-800 bg-gray-950 p-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold uppercase text-gray-500">Nom entreprise</label>
          <input className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Boulangerie Martin" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">E-mail admin</label>
          <input type="email" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm" required
            value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@martin.fr" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Mot de passe (8+)</label>
          <input className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm" required minLength={8}
            value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button disabled={busy} className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50">
            + Créer l'entreprise
          </button>
        </div>
        {error && <p className="text-sm text-red-400 sm:col-span-4">{error}</p>}
      </form>

      {/* Liste */}
      <div className="overflow-x-auto rounded-2xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Entreprise</th><th className="p-3">Statut</th><th className="p-3">Admin(s)</th>
              <th className="p-3">QR</th><th className="p-3">Lots</th><th className="p-3">Clients</th><th className="p-3">Parties</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/50">
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-gray-800">
                <td className="p-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-gray-500">/{c.slug}</p>
                </td>
                <td className="p-3">
                  <button onClick={() => toggleActive(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                    {c.active ? '● active' : '○ désactivée'}
                  </button>
                </td>
                <td className="p-3 text-xs text-gray-400">{c.admins.map((a) => a.email).join(', ') || '—'}</td>
                <td className="p-3">{c.counts.qrCodes}</td>
                <td className="p-3">{c.counts.prizes}</td>
                <td className="p-3">{c.counts.customers}</td>
                <td className="p-3">{c.counts.spins}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setPermEdit({ company: c, selected: new Set(JSON.parse(c.admins[0]?.permissions || '[]')) })}
                      className="rounded-lg border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800">🔐 Droits</button>
                    <button onClick={() => impersonate(c)}
                      className="rounded-lg border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800">🕵️ Support</button>
                    <button onClick={() => resetPassword(c)}
                      className="rounded-lg border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800">🔑 MDP</button>
                    <button onClick={() => removeCompany(c)}
                      className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-gray-500">Aucune entreprise. Créez la première ci-dessus.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {stats?.recentLogs?.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Dernières actions</h2>
          <ul className="space-y-1 text-sm text-gray-400">
            {stats.recentLogs.map((l) => (
              <li key={l.id} className="rounded-lg bg-gray-950 px-3 py-2">
                <span className="text-gray-500">{new Date(l.createdAt).toLocaleString('fr-FR')}</span> —{' '}
                <span className="font-mono text-amber-400">{l.action}</span> par {l.adminEmail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modale matrice de droits */}
      {permEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPermEdit(null)}>
          <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 text-gray-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Permissions — {permEdit.company.name}</h3>
            <p className="mt-1 text-xs text-gray-500">Matrice de droits appliquée aux comptes admin de cette entreprise.</p>
            <div className="mt-4 space-y-2">
              {data.availablePermissions.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-800 px-3 py-2 text-sm hover:bg-gray-800">
                  <input type="checkbox" className="h-4 w-4 accent-amber-500"
                    checked={permEdit.selected.has(key)}
                    onChange={(e) => {
                      const s = new Set(permEdit.selected);
                      e.target.checked ? s.add(key) : s.delete(key);
                      setPermEdit({ ...permEdit, selected: s });
                    }} />
                  {LABELS[key] || key}
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={savePermissions} className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400">
                Enregistrer
              </button>
              <button onClick={() => setPermEdit(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LABELS = {
  manage_prizes: '🎁 Gérer les lots',
  configure_wheel: '⚙️ Configurer la roue / réglages',
  manage_qrcodes: '📱 Gérer les QR codes',
  view_customers: '👥 Voir les clients',
  moderate_reviews: '⭐ Modérer les avis',
  view_stats: '📊 Voir les statistiques',
};
