'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

/* Configuration serveur (.env) : édition des variables, test de connexion base.
 * Les secrets sont masqués ; une sauvegarde nécessite un redémarrage du serveur. */
export default function EnvConfigPage() {
  const [groups, setGroups] = useState(null);
  const [values, setValues] = useState({});
  const [dbUrl, setDbUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  async function load() {
    try {
      const d = await fetch('/api/super/env-config').then((r) => r.json());
      setGroups(d.groups || []);
    } catch {
      show('Chargement impossible', 'error');
    }
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    if (!window.confirm('Écrire ces valeurs dans le fichier .env ? Un redémarrage du serveur sera nécessaire pour appliquer la base de données.')) return;
    setSaving(true);
    const payload = {};
    for (const g of groups) for (const f of g.fields) {
      const v = values[f.key];
      if (v === undefined || v === '') continue; // vide = inchangé
      payload[f.key] = v;
    }
    const res = await fetch('/api/super/env-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setValues({});
    show('Config enregistrée dans .env — redémarrez le serveur pour appliquer');
    load();
  }

  async function testDb() {
    setTesting(true); setTestResult(null);
    let url = values.DATABASE_URL;
    // Si le champ est vide : tester l'URL actuellement enregistrée (masquée) -> on la retape
    if (!url) { setTesting(false); setTestResult({ ok: false, msg: 'Saisissez l’URL à tester (elle est masquée).' }); return; }
    const res = await fetch('/api/super/env-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ databaseUrl: url }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    setTestResult(res.ok
      ? { ok: true, msg: `✅ Connexion réussie — ${data.companies} entreprise(s) dans cette base.` }
      : { ok: false, msg: data.error || 'Connexion échouée' });
  }

  if (!groups) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration serveur (.env)</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Édition directe du fichier <code className="text-gray-300">.env</code> du serveur.
          Les variables sont lues <strong>au démarrage</strong> : après sauvegarde, redémarrez le serveur.
          Les valeurs secrètes sont masquées — laissez un champ vide pour ne rien changer.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {groups.map((g) => (
          <section key={g.group} className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <h2 className="mb-4 font-bold text-amber-400">{g.group}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map((f) => (
                <div key={f.key} className={f.key === 'DATABASE_URL' ? 'sm:col-span-2' : ''}>
                  <label className="text-xs font-semibold uppercase text-gray-500" htmlFor={f.key}>
                    {f.key}{f.secret && <span className="ml-2 text-gray-600">(masqué)</span>}
                  </label>
                  <input
                    id={f.key}
                    type={f.secret ? 'password' : 'text'}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                    placeholder={f.secret
                      ? (f.configured ? `Configuré (${f.value}) — vide = inchangé` : 'Non configuré')
                      : f.value}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                  {!f.set && <p className="mt-1 text-xs text-gray-600">Absente du fichier — sera ajoutée à la sauvegarde.</p>}
                </div>
              ))}
            </div>

            {/* Test de connexion base */}
            {g.group === 'Base de données' && (
              <div className="mt-4 rounded-xl border border-gray-800 p-4">
                <p className="text-sm text-gray-400">Tester la connexion avec l’URL saisie (sans redémarrer) :</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={testing} onClick={testDb}
                    className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                    {testing ? 'Test…' : '🔌 Tester la connexion'}
                  </button>
                  {testResult && (
                    <span className={`text-sm ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{testResult.msg}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  ⚠️ Après avoir changé DATABASE_URL et redémarré, l’application utilisera la nouvelle base.
                  Testez toujours AVANT de sauvegarder.
                </p>
              </div>
            )}
          </section>
        ))}

        <div className="flex items-center gap-3">
          <button disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Écriture…' : '💾 Enregistrer dans .env'}
          </button>
          <p className="text-xs text-gray-500">Les champs laissés vides ne modifient rien.</p>
        </div>
      </form>
      <Toast />
    </div>
  );
}
