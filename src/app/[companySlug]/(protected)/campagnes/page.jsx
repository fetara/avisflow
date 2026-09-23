'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TableSkeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';

/* Campagnes e-mail : création (segment + contenu + date), confirmation du nombre
 * de destinataires, envoi par lots (cron ou déclenchement manuel), statistiques. */
export default function CampagnesPage() {
  const { companySlug } = useParams();
  const [campaigns, setCampaigns] = useState(null);
  const [segments, setSegments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: '', subject: '', body: '', segment: 'all', when: 'now', scheduledAt: '' });
  const [busy, setBusy] = useState(false);
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([
      fetch(`/api/${companySlug}/campaigns`).then((r) => r.json()),
      fetch(`/api/${companySlug}/templates`).then((r) => r.json()),
    ]);
    setCampaigns(c.campaigns || []);
    setSegments(c.segments || []);
    setTemplates(t.templates || []);
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  // Compte de destinataires en direct selon le segment choisi (via création refusée ? Non :
  // on affiche le compte depuis une campagne fictive impossible — on réutilise l'estimation
  // fournie après création ; ici simple indication textuelle).
  async function create(e) {
    e.preventDefault();
    const ok = window.confirm(
      `Confirmer la création et l'envoi de la campagne « ${form.name} » ?\n\nSeuls les clients ayant consenti aux e-mails marketing recevront la campagne. L'envoi est traité par lots.` 
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/${companySlug}/campaigns`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, subject: form.subject, body: form.body, segment: form.segment,
        scheduledAt: form.when === 'schedule' && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show(`Campagne créée — ${data.recipients} destinataire(s) qualifié(s). Envoi par lots en cours.`);
    setForm({ name: '', subject: '', body: '', segment: 'all', when: 'now', scheduledAt: '' });
    // Traite immédiatement un premier lot (le cron termine le reste)
    if (data.campaign?.id) {
      await fetch('/api/cron/campaigns', { method: 'GET' }).catch(() => {});
      load();
    }
  }

  const STATUS = {
    DRAFT: 'bg-gray-200 text-gray-600', SCHEDULED: 'bg-sky-100 text-sky-700',
    SENDING: 'bg-amber-100 text-amber-700', SENT: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-200 text-gray-500', FAILED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📣 Campagnes e-mail</h1>
        <Link href={`/${companySlug}/emails`} className="text-sm font-semibold text-brand-600 hover:underline">✉️ Gérer mes templates</Link>
      </div>

      {/* Création */}
      <form onSubmit={create} className="card space-y-4">
        <h2 className="font-bold">Nouvelle campagne</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cname">Nom de la campagne</label>
            <input id="cname" className="input" required maxLength={80} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Offre de septembre" />
          </div>
          <div>
            <label className="label" htmlFor="csegment">Segment de destinataires</label>
            <select id="csegment" className="input" value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}>
              {segments.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">Seuls les clients ayant consenti aux e-mails marketing sont inclus.</p>
          </div>
          <div>
            <label className="label" htmlFor="csubject">Objet</label>
            <input id="csubject" className="input" required maxLength={200} value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="ctemplate">Partir d’un template (optionnel)</label>
            <select id="ctemplate" className="input" value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setForm((f) => ({ ...f, subject: t.subject, body: t.body }));
              }}>
              <option value="">— choisir un template —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cbody">Contenu (variables : {'{{firstName}}'}, {'{{companyName}}'})</label>
          <textarea id="cbody" className="input min-h-36" required maxLength={20000} value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={'Bonjour {{firstName}},\n\nProfitez de -20% jusqu’à dimanche chez {{companyName}} !'} />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label" htmlFor="cwhen">Envoi</label>
            <select id="cwhen" className="input !py-2" value={form.when}
              onChange={(e) => setForm({ ...form, when: e.target.value })}>
              <option value="now">Maintenant</option>
              <option value="schedule">Programmer</option>
            </select>
          </div>
          {form.when === 'schedule' && (
            <div>
              <label className="label" htmlFor="csched">Date et heure</label>
              <input id="csched" type="datetime-local" className="input !py-2" value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
            </div>
          )}
          <button disabled={busy} className="btn-primary !py-2.5">
            {busy ? 'Création…' : 'Créer et lancer'}
          </button>
        </div>
      </form>

      {/* Liste */}
      {!campaigns ? <TableSkeleton rows={4} cols={5} /> : campaigns.length === 0 ? (
        <EmptyState icon="📣" title="Aucune campagne"
          text="Créez votre première campagne ci-dessus pour relancer vos clients." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950">
              <tr><th className="p-3">Campagne</th><th className="p-3">Segment</th><th className="p-3">Statut</th><th className="p-3">Envoyés</th><th className="p-3">Échecs</th><th className="p-3">Créée le</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t dark:border-gray-800">
                  <td className="p-3 font-medium">{c.name}<span className="block text-xs text-gray-400">{c.subject}</span></td>
                  <td className="p-3">{c.segment}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[c.status] || ''}`}>{c.status}</span></td>
                  <td className="p-3">{c.sentCount}</td>
                  <td className="p-3">{c.failedCount}</td>
                  <td className="p-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
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
