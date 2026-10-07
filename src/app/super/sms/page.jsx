'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

/* Paramètres SMS plateforme (super admin) : clés OVH chiffrées + test d’envoi. */
export default function SmsConfigPage() {
  const [config, setConfig] = useState(null);
  const [values, setValues] = useState({});
  const [enabled, setEnabled] = useState(true);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const { show, Toast } = useToast();

  async function load() {
    const d = await fetch('/api/super/sms').then((r) => r.json()).catch(() => null);
    if (d?.config) { setConfig(d.config); setEnabled(d.config.enabledPlatform); }
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const payload = { ...values, SMS_ENABLED: enabled ? 'true' : 'false' };
    const res = await fetch('/api/super/sms', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) { show((await res.json()).error || 'Erreur', 'error'); return; }
    show('Configuration SMS enregistrée (clés chiffrées en base)');
    setValues({});
    load();
  }

  async function test(e) {
    e.preventDefault();
    setTesting(true);
    const res = await fetch('/api/super/sms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) { show(data.error || 'Échec', 'error'); return; }
    show('SMS de test envoyé ✓');
  }

  if (!config) return <p className="text-gray-500">Chargement…</p>;

  const FIELDS = [
    ['SMS_OVH_APP_KEY', 'Clé application OVH', config.masked.appKey],
    ['SMS_OVH_APP_SECRET', 'Secret application OVH', config.masked.appSecret],
    ['SMS_OVH_CONSUMER_KEY', 'Clé consommateur OVH', config.masked.consumerKey],
    ['SMS_OVH_SERVICE', 'Nom du service SMS OVH', config.masked.service],
    ['SMS_SENDER', 'Expéditeur (nom déclaré chez OVH)', config.sender],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📱 Configuration SMS (OVH)</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Fournisseur central utilisé par toutes les entreprises. Les clés sont chiffrées en base
          et ne sont jamais exposées aux entreprises ni au navigateur.
          Créez vos identifiants sur ovh.com → SMS (clé application + secret + clé consommateur).
        </p>
      </div>

      {!config.configured && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          ⚠️ Configuration incomplète : les envois SMS sont bloqués jusqu’à la saisie complète des identifiants OVH.
        </p>
      )}

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-5">
        {FIELDS.map(([key, label, ph]) => (
          <div key={key}>
            <label className="text-xs font-semibold uppercase text-gray-500" htmlFor={key}>{label}</label>
            <input
              id={key}
              type="password"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
              placeholder={ph || 'Non configuré'}
              value={values[key] ?? ''}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-600">Champ vide = inchangé.</p>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400">Enregistrer</button>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            SMS {enabled ? 'activés' : 'désactivés'} sur la plateforme
          </span>
        </div>
      </form>
      <Toast />
    </div>
  );
}
