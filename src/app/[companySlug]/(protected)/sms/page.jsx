'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Send, Ticket, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

/* 📱 Messagerie SMS : campagne massive aux clients consentants (segments),
 * bons de réduction (génération + validation en caisse), historique. */
export default function SmsPage() {
  const { companySlug } = useParams();
  const [campaigns, setCampaigns] = useState(null);
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState({ name: '', body: '', segment: 'all', confirm: false });
  const [recipients, setRecipients] = useState(null);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState({ kind: 'percent', value: 10, maxUses: '' });
  const [checkCode, setCheckCode] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const [c, cp] = await Promise.all([
      fetch(`/api/${companySlug}/sms/campaigns`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/${companySlug}/coupons`).then((r) => r.json()).catch(() => ({})),
    ]);
    setCampaigns(Array.isArray(c) ? c : c.campaigns || []);
    setCoupons(cp.coupons || []);
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  // Estimation des destinataires : renvoyée par l'API quand confirm=false
  async function createSms(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/${companySlug}/sms/campaigns`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, confirm: form.confirm }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.needConfirm) {
      setRecipients(data.recipients);
      setForm((f) => ({ ...f, confirm: true }));
      return;
    }
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setForm({ name: '', body: '', segment: 'all', confirm: false });
    setRecipients(null);
    show(`Campagne SMS créée — ${data.recipients} destinataire(s). Envoi par lots en cours.`);
    load();
  }

  async function generateCoupon() {
    const res = await fetch(`/api/${companySlug}/coupons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: coupon.kind, value: Number(coupon.value), maxUses: coupon.maxUses ? Number(coupon.maxUses) : null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show(`Bon ${data.coupon.code} généré`);
    load();
  }

  async function checkCoupon(e) {
    e.preventDefault();
    const res = await fetch(`/api/${companySlug}/coupons`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: checkCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setCheckResult({ ok: false, msg: data.error || 'Code invalide' }); return; }
    setCheckResult({ ok: true, msg: `✓ Code valide — utilisations restantes : ${data.remaining ?? '∞'}` });
    load();
  }

  const STATUS = { SCHEDULED: 'bg-sky-100 text-sky-700', SENDING: 'bg-amber-100 text-amber-700', SENT: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-gray-200 text-gray-500', FAILED: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📱 Messagerie SMS</h1>
        <Link href={`/${companySlug}/emails`} className="text-sm font-semibold text-brand-600 hover:underline">✉️ E-mails →</Link>
      </div>

      {/* Campagne massive */}
      <form onSubmit={createSms} className="card space-y-4">
        <h2 className="font-bold">Campagne SMS (envoi massif)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sname">Nom interne</label>
            <input id="sname" className="input" required maxLength={80} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Relance septembre" />
          </div>
          <div>
            <label className="label" htmlFor="ssegment">Segment</label>
            <select id="ssegment" className="input" value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}>
              <option value="all">Tous les clients (consentement SMS)</option>
              <option value="reviewed">Ayant laissé un avis</option>
              <option value="not_reviewed">Sans avis</option>
              <option value="won">Ayant gagné une récompense</option>
              <option value="inactive30">Inactifs 30 jours ou plus</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">RGPD : seuls les clients ayant consenti aux SMS (case à la collecte) sont inclus.</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sbody">Message (160 caractères = 1 SMS) — variables : {'{{prenom}} {{entreprise}} {{code_reduction}}'}</label>
          <textarea id="sbody" className="input min-h-24 font-mono text-sm" required maxLength={1000} value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={'Bonjour {{prenom}}, revenez tenter votre chance chez {{entreprise}} : -10% sur votre prochaine visite !'} />
        </div>
        {recipients != null && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            ⚠️ Cette campagne sera envoyée à <strong>{recipients} client(s)</strong>. Confirmez l’envoi ci-dessous.
          </p>
        )}
        <button disabled={busy} className="btn-primary !py-2.5">
          <Send className="h-4 w-4" /> {form.confirm && recipients != null ? `Confirmer l’envoi à ${recipients} client(s)` : busy ? 'Création…' : 'Vérifier les destinataires'}
        </button>
      </form>

      {/* Bons de réduction */}
      <section className="card space-y-4">
        <h2 className="font-bold inline-flex items-center gap-2"><Ticket className="h-5 w-5" /> Bons de réduction</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <select className="input" aria-label="Type" value={coupon.kind} onChange={(e) => setCoupon({ ...coupon, kind: e.target.value })}>
            <option value="percent">% réduction</option>
            <option value="amount">€ montant</option>
          </select>
          <input type="number" min="1" className="input" aria-label="Valeur" value={coupon.value}
            onChange={(e) => setCoupon({ ...coupon, value: e.target.value })} />
          <input type="number" min="1" className="input" aria-label="Utilisations max" placeholder="Utilisations max (∞ si vide)"
            value={coupon.maxUses ?? ''} onChange={(e) => setCoupon({ ...coupon, maxUses: e.target.value })} />
          <button type="button" onClick={generateCoupon} className="btn-primary !py-2"><Ticket className="h-4 w-4" /> Générer</button>
        </div>

        <form onSubmit={checkCoupon} className="flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
          <div className="flex-1 min-w-48">
            <label className="label" htmlFor="checkcode">Valider un code en caisse</label>
            <input id="checkcode" className="input !py-2 font-mono uppercase" placeholder="AVIS-XXXXXX" value={checkCode}
              onChange={(e) => setCheckCode(e.target.value)} />
          </div>
          <button className="btn-secondary !py-2"><CheckCircle2 className="h-4 w-4" /> Valider</button>
          {checkResult && <span className={`text-sm ${checkResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>{checkResult.msg}</span>}
        </form>

        {coupons && coupons.length > 0 && (
          <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950">
                <tr><th className="p-2.5">Code</th><th className="p-2.5">Valeur</th><th className="p-2.5">Utilisé</th><th className="p-2.5">Expire</th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t dark:border-gray-800">
                    <td className="p-2.5 font-mono font-semibold">{c.code}</td>
                    <td className="p-2.5">{c.kind === 'percent' ? `-${c.value} %` : `-${c.value} €`}</td>
                    <td className="p-2.5">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="p-2.5 text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historique */}
      {campaigns && campaigns.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-bold">Historique des campagnes SMS</h2>
          <ul className="space-y-2 text-sm">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="font-medium">{c.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[c.status] || ''}`}>{c.status}</span>
                <span className="text-gray-500">{c.sentCount} envoyés{c.failedCount ? ` · ${c.failedCount} échecs` : ''}</span>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Toast />
    </div>
  );
}
