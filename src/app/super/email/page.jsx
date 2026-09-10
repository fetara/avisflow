'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

/* Configuration de l'envoi d'e-mails (Resend / SMTP / mode démo) + envoi de test.
 * Les secrets sont masqués côté serveur : champ vide = inchangé, « - » = effacer. */
export default function EmailConfigPage() {
  const [fields, setFields] = useState(null);
  const [values, setValues] = useState({}); // saisie utilisateur, vide = inchangé pour les secrets
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  async function load() {
    try {
      const d = await fetch('/api/super/email-config').then((r) => r.json());
      setFields(d.fields || []);
    } catch {
      show('Chargement impossible', 'error');
    }
  }
  useEffect(() => { load(); }, []);

  // Réinitialisation complète : supprime toutes les clés MAIL_* de la base,
  // les variables d'environnement du serveur redeviennent la configuration active.
  async function resetToEnv() {
    if (!window.confirm('Supprimer toute la configuration e-mail enregistrée en base ? Les variables d’environnement du serveur (RESEND_API_KEY, SMTP_*, DEMO_MODE…) redeviennent la source active.')) return;
    const res = await fetch('/api/super/email-config/reset', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setValues({});
    show(`Configuration réinitialisée (${data.deleted} clé(s) supprimée(s)) — l’environnement redevient maître.`);
    load();
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined) continue;
      payload[f.key] = v; // '' sur un secret = inchangé ; '-' = effacer
    }
    const res = await fetch('/api/super/email-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    setValues({});
    show('Configuration enregistrée');
    load();
  }

  async function sendTest(e) {
    e.preventDefault();
    setTesting(true);
    const res = await fetch('/api/super/email-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) { show(data.error || 'Échec de l’envoi', 'error'); return; }
    if (data.transport === 'demo') {
      show('⚠️ MODE DÉMO : aucun e-mail réel n’a été envoyé (simulation console). Vérifiez la config ci-dessus.', 'error');
    } else {
      show(`E-mail envoyé via ${data.transport} à ${testTo} — vérifiez la boîte (et les spams).`);
    }
  }

  if (!fields) return <p className="text-gray-500">Chargement…</p>;

  const demoMode = (values.MAIL_DEMO_MODE ?? fields.find((f) => f.key === 'MAIL_DEMO_MODE')?.value) === 'true';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Configuration e-mail</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Fournisseur d’envoi des e-mails joueurs (validation) et admins (codes 2FA).
            Ces réglages priment sur les variables d’environnement du serveur.
          </p>
        </div>
        <button type="button" onClick={resetToEnv}
          className="rounded-lg border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
          title="Supprime les clés MAIL_* enregistrées en base">
          ♻️ Restaurer l’environnement
        </button>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-5">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-semibold uppercase text-gray-500" htmlFor={f.key}>
              {f.label}
              {f.secret && <span className="ml-2 text-gray-600">(masqué)</span>}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={f.key}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                type={f.secret ? 'password' : 'text'}
                placeholder={f.secret
                  ? (f.configured ? `Configuré (${f.value}) — laisser vide pour conserver` : 'Non configuré')
                  : f.value}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
              {f.key === 'MAIL_DEMO_MODE' && (
                <button type="button"
                  onClick={() => setValues({ ...values, MAIL_DEMO_MODE: demoMode ? 'false' : 'true' })}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${demoMode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {demoMode ? 'Mode démo ON' : 'Mode démo OFF'}
                </button>
              )}
            </div>
            {f.secret && f.configured && (
              <p className="mt-1 text-xs text-gray-600">Tapez « - » pour effacer la valeur enregistrée.</p>
            )}
            {f.source === 'env' && (
              <p className="mt-1 text-xs text-gray-600">Actuellement fourni par les variables d’environnement du serveur.</p>
            )}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <p className="text-xs text-gray-500">Les champs laissés vides ne modifient rien.</p>
        </div>
      </form>

      {/* Envoi de test avec la configuration enregistrée */}
      <form onSubmit={sendTest} className="space-y-3 rounded-2xl border border-gray-800 bg-gray-950 p-5">
        <h2 className="font-bold">Tester l’envoi</h2>
        <p className="text-sm text-gray-400">Envoie un e-mail de test avec la configuration ci-dessus (enregistrez d’abord).</p>
        <div className="flex gap-2">
          <input type="email" required placeholder="votre@email.fr"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
            value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button disabled={testing} className="whitespace-nowrap rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
            {testing ? 'Envoi…' : '✉️ Envoyer le test'}
          </button>
        </div>
        {demoMode && <p className="text-xs text-amber-400">⚠️ Mode démo actif : les e-mails sont simulés (console du serveur), rien ne part réellement.</p>}
      </form>
      <Toast />
    </div>
  );
}
