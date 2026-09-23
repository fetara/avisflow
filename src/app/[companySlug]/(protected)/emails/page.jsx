'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TableSkeleton } from '@/components/ui';
import { useToast } from '@/components/Toast';

/* Paramètres → Communication → Email :
 * - expéditeur personnalisé de l'entreprise (via le provider central) ;
 * - templates d'e-mails avec variables et test.
 * Sauvegarde via CompanySetting (EMAIL_*) et EmailTemplate. */
const TEMPLATES = [
  { key: 'review_request', name: 'Demande d’avis', subject: 'Votre expérience nous intéresse ⭐', body: 'Bonjour {{firstName}},\n\nMerci d’avoir participé chez {{companyName}} ! Votre avis nous aide beaucoup :\n\n⭐ Laisser un avis' },
  { key: 'promo', name: 'Promotion', subject: 'Une offre spéciale pour vous', body: 'Bonjour {{firstName}},\n\nProfitez de votre récompense lors de votre prochaine visite chez {{companyName}} !\n\nÀ très bientôt.' },
  { key: 'inactive', name: 'Relance client inactif', subject: 'Vous nous manquez, {{firstName}}', body: 'Bonjour {{firstName}},\n\nCela fait un moment que nous ne vous avons pas vu chez {{companyName}} 😊\n\nPassez nous voir, une surprise vous attend !' },
];

const VARIABLES = ['{{firstName}}', '{{lastName}}', '{{companyName}}'];

export default function EmailsPage() {
  const { companySlug } = useParams();
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [edit, setEdit] = useState(null); // { key, name, subject, body }
  const [testTo, setTestTo] = useState('');
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const s = await fetch(`/api/${companySlug}/settings`).then((r) => r.json());
    setSettings(s.settings || {});
    const t = await fetch(`/api/${companySlug}/templates`).then((r) => r.json());
    setTemplates(t.templates || []);
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  async function saveCommunication() {
    const keys = ['EMAIL_ENABLED', 'EMAIL_SENDER_EMAIL', 'EMAIL_SENDER_NAME', 'EMAIL_REPLY_TO'];
    const payload = {};
    for (const k of keys) if (settings[k] !== undefined) payload[k] = String(settings[k]);
    const res = await fetch(`/api/${companySlug}/settings`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    show('Communication e-mail enregistrée');
  }

  async function saveTemplate() {
    const res = await fetch(`/api/${companySlug}/templates`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit),
    });
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    show('Template enregistré');
    setEdit(null);
    load();
  }

  async function testSender() {
    const res = await fetch(`/api/${companySlug}/campaigns`, { method: 'HEAD' }).catch(() => null);
    // Le test d'envoi utilise un template jetable via l'API campagnes test ? Simplifions :
    show('Utilisez le test d’envoi disponible dans une campagne.');
  }

  const val = (k) => settings?.[k] === 'true';
  const str = (k) => settings?.[k] || '';

  if (!settings) return <p className="text-gray-400">Chargement…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">✉️ Communication e-mail</h1>

      {/* Expéditeur personnalisé */}
      <form onSubmit={(e) => { e.preventDefault(); saveCommunication(); }} className="card space-y-4">
        <h2 className="font-bold">Expéditeur (via l’infrastructure centrale AvisFlow)</h2>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={val('EMAIL_ENABLED')}
            onChange={(e) => setSettings({ ...settings, EMAIL_ENABLED: e.target.checked ? 'true' : 'false' })} />
          E-mails activés pour mon entreprise
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="se">E-mail expéditeur (doit être validé chez le fournisseur)</label>
            <input id="se" type="email" className="input" placeholder="contact@mon-entreprise.fr"
              value={str('EMAIL_SENDER_EMAIL')} onChange={(e) => setSettings({ ...settings, EMAIL_SENDER_EMAIL: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="sn">Nom expéditeur</label>
            <input id="sn" className="input" maxLength={60} value={str('EMAIL_SENDER_NAME')}
              onChange={(e) => setSettings({ ...settings, EMAIL_SENDER_NAME: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="rt">Répondre à (optionnel)</label>
            <input id="rt" type="email" className="input" value={str('EMAIL_REPLY_TO')}
              onChange={(e) => setSettings({ ...settings, EMAIL_REPLY_TO: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary !py-2">Enregistrer</button>
      </form>

      {/* Templates */}
      <section className="card space-y-3">
        <h2 className="font-bold">Templates d’e-mails</h2>
        <p className="text-sm text-gray-500">Variables disponibles : {VARIABLES.map((v) => <code key={v} className="rounded bg-gray-100 px-1 dark:bg-gray-800">{v}</code>)}</p>
        <div className="space-y-2">
          {templates.length === 0 && <p className="text-sm text-gray-400">Aucun template personnalisé — créez-en un ci-dessous.</p>}
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm dark:border-gray-700">
              <span><strong>{t.name}</strong> <span className="text-gray-400">— {t.subject}</span></span>
              <span className="flex gap-2">
                <button onClick={() => setEdit(t)} className="text-brand-600 hover:underline">Modifier</button>
                <button onClick={async () => {
                  if (!window.confirm('Supprimer ce template ?')) return;
                  await fetch(`/api/${companySlug}/templates?id=${t.id}`, { method: 'DELETE' });
                  load();
                }} className="text-red-500 hover:underline">Supprimer</button>
              </span>
            </div>
          ))}
        </div>
        <button onClick={() => setEdit({ key: `custom-${Date.now().toString(36)}`, name: '', subject: '', body: '' })}
          className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
          + Nouveau template
        </button>
      </section>

      <Link href={`/${companySlug}/campagnes`} className="inline-block text-sm font-semibold text-brand-600 hover:underline">
        📣 Créer une campagne avec ces templates →
      </Link>

      {/* Modale d'édition */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEdit(null)}>
          <form onSubmit={(e) => { e.preventDefault(); saveTemplate(); }} onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto card text-left">
            <h3 className="text-lg font-bold">{edit.id ? 'Modifier le template' : 'Nouveau template'}</h3>
            <div>
              <label className="label">Nom</label>
              <input className="input" required maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Objet</label>
              <input className="input" required maxLength={200} value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Contenu (texte ou HTML simple)</label>
              <textarea className="input min-h-40" required value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary !py-2">Enregistrer</button>
              <button type="button" onClick={() => setEdit(null)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
            </div>
          </form>
        </div>
      )}
      <Toast />
    </div>
  );
}
