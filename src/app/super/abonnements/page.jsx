'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TableSkeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';

/* Gestion des abonnements (super admin) : plans + demandes + actions.
 * Toutes les dates/actions sont calculées côté serveur. */
export default function AbonnementsPage() {
  const [subs, setSubs] = useState(null);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState(null);
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // plan en cours d'édition/création
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status !== 'ALL') qs.set('status', status);
    if (q) qs.set('q', q);
    const [s, p] = await Promise.all([
      fetch(`/api/super/subscriptions?${qs}`).then((r) => r.json()),
      fetch('/api/super/plans').then((r) => r.json()),
    ]);
    setSubs(s.subscriptions || []);
    setStats(s.stats || null);
    setPlans(p.plans || []);
  }, [status, q]);

  useEffect(() => { load(); }, [load]);

  async function action(id, action, days) {
    const confirmMsg = {
      activate_now: 'Activer immédiatement cet abonnement ?\n\nCette action contournera le délai d’activation configuré.',
      reject: 'Rejeter cette demande ?',
      suspend: 'Suspendre cet abonnement ?',
      cancel: 'Annuler cet abonnement ?',
    }[action];
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const res = await fetch('/api/super/subscriptions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(days ? { id, action, days } : { id, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show('Action effectuée ✓');
    load();
  }

  // ---------- Plans : création/édition ----------
  const emptyPlan = { name: '', slug: '', description: '', priceMonthly: 29, priceYearly: null, maxQrCodes: 1, maxCustomers: 500, maxSpins: null, activationDelayDays: 0, features: [], active: true };
  const [form, setForm] = useState(null);

  function editPlan(p) { setEditing(p); setForm({ ...p, features: Array.isArray(p.features) ? p.features.join('\n') : '' }); }
  function newPlan() { setEditing({}); setForm({ ...emptyPlan, features: '' }); }

  async function savePlan(e) {
    e.preventDefault();
    const payload = {
      name: form.name, slug: form.slug, description: form.description,
      priceMonthly: form.priceMonthly === '' || form.priceMonthly == null ? null : Number(form.priceMonthly),
      priceYearly: form.priceYearly === '' || form.priceYearly == null ? null : Number(form.priceYearly),
      maxQrCodes: form.maxQrCodes === '' || form.maxQrCodes == null ? null : Number(form.maxQrCodes),
      maxCustomers: form.maxCustomers === '' || form.maxCustomers == null ? null : Number(form.maxCustomers),
      maxSpins: form.maxSpins === '' || form.maxSpins == null ? null : Number(form.maxSpins),
      activationDelayDays: Number(form.activationDelayDays || 0),
      features: String(form.features || '').split('\n').map((x) => x.trim()).filter(Boolean),
      active: Boolean(form.active),
    };
    const res = await fetch('/api/super/plans', {
      method: editing?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing?.id ? { id: editing.id, ...payload } : payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setEditing(null); setForm(null);
    show('Plan enregistré');
    load();
  }

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
  const STATUS_STYLE = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400', PENDING: 'bg-amber-500/15 text-amber-400',
    APPROVED: 'bg-sky-500/15 text-sky-400', SUSPENDED: 'bg-red-500/15 text-red-400',
    EXPIRED: 'bg-gray-500/15 text-gray-400', CANCELLED: 'bg-gray-500/15 text-gray-400', REJECTED: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Abonnements</h1>
          <p className="mt-1 text-sm text-gray-400">Plans, demandes des entreprises, activations et limites.</p>
        </div>
        <button onClick={newPlan} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400">+ Créer un plan</button>
      </div>

      {/* Stats contractuelles (pas de paiement réel intégré) */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Abonnements actifs', stats.active], ['Demandes en attente', stats.pending], ['Expirant sous 7 j', stats.expiringSoon], ['MRR contractuel estimé', `${stats.mrrEstimate} €`]].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{l}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Plans ---------- */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-200">Plans</h2>
        {!plans ? <TableSkeleton rows={3} cols={4} /> : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-4 ${p.active ? 'border-gray-700 bg-gray-950' : 'border-gray-800 bg-gray-950/50 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">{p.name}</h3>
                  <span className="text-lg font-extrabold text-amber-400">{p.priceMonthly == null ? '—' : `${Number(p.priceMonthly)}€`}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Délai d’activation : {p.activationDelayDays} j · QR : {p.maxQrCodes ?? '∞'} · Clients : {p.maxCustomers ?? '∞'} · Parties/mois : {p.maxSpins ?? '∞'}
                </p>
                <p className="mt-1 text-xs">{p.active ? <span className="text-emerald-400">● proposé</span> : <span className="text-gray-500">○ désactivé</span>}</p>
                <button onClick={() => editPlan(p)} className="mt-3 w-full rounded-lg border border-gray-700 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-800">✏️ Modifier</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Demandes / abonnements ---------- */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-200">Abonnements & demandes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrer par statut"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm">
            {['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'REJECTED'].map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'Tous' : s}</option>
            ))}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une entreprise…"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm" aria-label="Rechercher une entreprise" />
        </div>

        {!subs ? <TableSkeleton rows={5} cols={5} /> : subs.length === 0 ? (
          <EmptyState icon="📄" title="Aucun abonnement pour ce filtre" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-950 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3">Entreprise</th><th className="p-3">Plan</th><th className="p-3">Prix</th>
                  <th className="p-3">Statut</th><th className="p-3">Demande</th><th className="p-3">Activation</th>
                  <th className="p-3">Échéance</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/50">
                {subs.map((s2) => (
                  <tr key={s2.id} className="border-t border-gray-800">
                    <td className="p-3">
                      <Link href={`/${s2.company.slug}`} className="font-medium text-gray-100 hover:text-brand-400">{s2.company.name}</Link>
                      {s2.approvedBy && <span className="block text-xs text-gray-600">validé par admin</span>}
                    </td>
                    <td className="p-3">{s2.plan.name}</td>
                    <td className="p-3">{s2.priceMonthly == null ? '—' : `${Number(s2.priceMonthly)}€`}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s2.status] || ''}`}>{s2.status}</span></td>
                    <td className="p-3 text-gray-400">{fmt(s2.requestedAt)}</td>
                    <td className="p-3 text-gray-400">{fmt(s2.activatedAt)}</td>
                    <td className="p-3 text-gray-400">{fmt(s2.endAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {s2.status === 'PENDING' && (
                          <>
                            <button onClick={() => action(s2.id, 'approve')} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30">Approuver</button>
                            <button onClick={() => action(s2.id, 'reject')} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30">Rejeter</button>
                            <button onClick={() => action(s2.id, 'activate_now')} className="rounded bg-sky-500/20 px-2 py-1 text-xs text-sky-400 hover:bg-sky-500/30">⚡ Activer maintenant</button>
                          </>
                        )}
                        {s2.status === 'ACTIVE' && (
                          <>
                            <button onClick={() => action(s2.id, 'suspend')} className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">Suspendre</button>
                            <button onClick={() => { const d = window.prompt('Prolonger de combien de jours ?'); if (d) action(s2.id, 'extend', Number(d)); }}
                              className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">Prolonger</button>
                            <button onClick={() => action(s2.id, 'cancel')} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30">Annuler</button>
                          </>
                        )}
                        {(s2.status === 'SUSPENDED' || s2.status === 'EXPIRED') && (
                          <button onClick={() => action(s2.id, 'activate_now')} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30">Réactiver</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Modale plan ---------- */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setEditing(null); setForm(null); }}>
          <form onSubmit={savePlan} onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-gray-900 p-6 text-gray-100 shadow-2xl">
            <h3 className="text-lg font-bold">{editing?.id ? `Modifier — ${form.name}` : 'Nouveau plan'}</h3>
            {[['name', 'Nom', 'text'], ['slug', 'Slug (ex : business)', 'text'], ['description', 'Description', 'text']].map(([k, l, t]) => (
              <div key={k}>
                <label className="text-xs font-semibold uppercase text-gray-500">{l}</label>
                <input type={t} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                  value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[['priceMonthly', 'Prix mensuel €'], ['priceYearly', 'Prix annuel €'], ['maxQrCodes', 'QR max (∞ si vide)'], ['maxCustomers', 'Clients max'], ['maxSpins', 'Parties/mois max'], ['activationDelayDays', 'Délai d’activation (j)']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-xs font-semibold uppercase text-gray-500">{l}</label>
                  <input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                    value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Fonctionnalités (une par ligne)</label>
              <textarea className="mt-1 min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={Boolean(form.active)}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Plan proposé publiquement
            </label>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400">Enregistrer</button>
              <button type="button" onClick={() => { setEditing(null); setForm(null); }} className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">Annuler</button>
            </div>
          </form>
        </div>
      )}
      <Toast />
    </div>
  );
}
