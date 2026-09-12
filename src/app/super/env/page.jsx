'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

/* Configuration serveur : .env (base, sécurité, e-mail de repli) + configuration
 * e-mail en base de données (prioritaire) avec test d'envoi.
 * Les secrets sont masqués ; le .env nécessite un redémarrage après sauvegarde. */
export default function EnvConfigPage() {
  const [groups, setGroups] = useState(null);
  const [values, setValues] = useState({});
  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState(null);

  // --- e-mail (base) ---
  const [mailFields, setMailFields] = useState(null);
  const [mailValues, setMailValues] = useState({});
  const [testTo, setTestTo] = useState('');
  const [testingMail, setTestingMail] = useState(false);
  const [savingMail, setSavingMail] = useState(false);

  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  async function load() {
    try {
      const [env, mail] = await Promise.all([
        fetch('/api/super/env-config').then((r) => r.json()),
        fetch('/api/super/email-config').then((r) => r.json()),
      ]);
      setGroups(env.groups || []);
      setMailFields(mail.fields || []);
    } catch {
      show('Chargement impossible', 'error');
    }
  }
  useEffect(() => { load(); }, []);

  const demoField = mailFields?.find((f) => f.key === 'MAIL_DEMO_MODE');
  const demoMode = (mailValues.MAIL_DEMO_MODE ?? demoField?.value) === 'true';

  async function saveEnv(e) {
    e.preventDefault();
    if (!window.confirm('Écrire ces valeurs dans le fichier .env ? Un redémarrage du serveur sera nécessaire pour appliquer la base de données.')) return;
    setSaving(true);
    const payload = {};
    for (const g of groups) for (const f of g.fields) {
      const v = values[f.key];
      if (v === undefined || v === '') continue;
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
    setTestingDb(true); setDbResult(null);
    const url = values.DATABASE_URL;
    if (!url) { setTestingDb(false); setDbResult({ ok: false, msg: 'Saisissez l’URL à tester (elle est masquée).' }); return; }
    const res = await fetch('/api/super/env-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ databaseUrl: url }),
    });
    const data = await res.json().catch(() => ({}));
    setTestingDb(false);
    setDbResult(res.ok
      ? { ok: true, msg: `✅ Connexion réussie — ${data.companies} entreprise(s) dans cette base.` }
      : { ok: false, msg: data.error || 'Connexion échouée' });
  }

  // --- e-mail ---
  async function saveMail(e) {
    e.preventDefault();
    setSavingMail(true);
    const payload = {};
    for (const f of mailFields) {
      const v = mailValues[f.key];
      if (v === undefined) continue;
      payload[f.key] = v; // '' sur un secret = inchangé ; '-' = effacer (repli .env)
    }
    const res = await fetch('/api/super/email-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSavingMail(false);
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setMailValues({});
    show('Configuration e-mail enregistrée');
    load();
  }

  async function testMail(e) {
    e.preventDefault();
    setTestingMail(true);
    const res = await fetch('/api/super/email-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }),
    });
    const data = await res.json().catch(() => ({}));
    setTestingMail(false);
    if (!res.ok) { show(data.error || 'Échec de l’envoi', 'error'); return; }
    if (data.transport === 'demo') {
      show('⚠️ MODE DÉMO : aucun e-mail réel n’a été envoyé (simulation console).', 'error');
    } else {
      show(`E-mail envoyé via ${data.transport} à ${testTo} — vérifiez la boîte (et les spams).`);
    }
  }

  async function resetMailToEnv() {
    if (!window.confirm('Supprimer toute la configuration e-mail enregistrée en base ? Les variables d’environnement (.env) redeviennent la source active.')) return;
    const res = await fetch('/api/super/email-config/reset', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setMailValues({});
    show(`Configuration e-mail réinitialisée (${data.deleted} clé(s)) — le .env redevient maître.`);
    load();
  }

  if (!groups || !mailFields) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration serveur</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Fichier <code className="text-gray-300">.env</code> et configuration e-mail en base.
          Le contenu de la base prime sur le <code className="text-gray-300">.env</code> pour les e-mails ;
          les variables du <code className="text-gray-300">.env</code> sont lues au démarrage du serveur.
        </p>
      </div>

      {/* ================= .env ================= */}
      <form onSubmit={saveEnv} className="space-y-6">
        <h2 className="text-lg font-bold text-gray-200">📄 Fichier .env</h2>
        {groups.map((g) => (
          <section key={g.group} className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="mb-4 font-bold text-amber-400">{g.group}</h3>
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

            {g.group === 'Base de données' && (
              <div className="mt-4 rounded-xl border border-gray-800 p-4">
                <p className="text-sm text-gray-400">Tester la connexion avec l’URL saisie (sans redémarrer) :</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={testingDb} onClick={testDb}
                    className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                    {testingDb ? 'Test…' : '🔌 Tester la connexion'}
                  </button>
                  {dbResult && <span className={`text-sm ${dbResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{dbResult.msg}</span>}
                </div>
              </div>
            )}
          </section>
        ))}
        <div className="flex items-center gap-3">
          <button disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Écriture…' : '💾 Enregistrer dans .env'}
          </button>
          <p className="text-xs text-gray-500">Champs vides = inchangés. Redémarrez le serveur après avoir changé la base.</p>
        </div>
      </form>

      {/* ================= E-mails (base, prioritaire) ================= */}
      <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-200">✉️ E-mails (base de données — prioritaire sur le .env)</h2>
            <p className="mt-1 text-sm text-gray-400">
              Appliqué immédiatement, sans redémarrage. Champ vide = inchangé pour les secrets ; « - » = effacer (repli .env).
            </p>
          </div>
          <button type="button" onClick={resetMailToEnv}
            className="rounded-lg border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
            title="Supprime les clés MAIL_* enregistrées en base">
            ♻️ Restaurer le .env
          </button>
        </div>

        {demoMode && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            <span>⚠️ <strong>Mode démo actif</strong> — aucun e-mail réel n’est envoyé.</span>
            <button type="button"
              onClick={() => setMailValues((v) => ({ ...v, MAIL_DEMO_MODE: 'false' }))}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-amber-400">
              Mettre sur false ci-dessous
            </button>
          </div>
        )}

        <form onSubmit={saveMail} className="grid gap-4 sm:grid-cols-2">
          {mailFields.map((f) => (
            <div key={f.key} className={f.key === 'MAIL_FROM' ? 'sm:col-span-2' : ''}>
              <label className="text-xs font-semibold uppercase text-gray-500" htmlFor={f.key}>
                {f.label}{f.secret && <span className="ml-2 text-gray-600">(masqué)</span>}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id={f.key}
                  type={f.secret ? 'password' : 'text'}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                  placeholder={f.secret
                    ? (f.configured ? `Configuré (${f.value}) — vide = inchangé` : 'Non configuré')
                    : f.value}
                  value={mailValues[f.key] ?? ''}
                  onChange={(e) => setMailValues({ ...mailValues, [f.key]: e.target.value })}
                />
                {f.key === 'MAIL_DEMO_MODE' && (
                  <button type="button"
                    onClick={() => setMailValues((v) => ({ ...v, MAIL_DEMO_MODE: demoMode ? 'false' : 'true' }))}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${demoMode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {demoMode ? 'Démo ON' : 'Démo OFF'}
                  </button>
                )}
              </div>
              {f.source === 'env' && <p className="mt-1 text-xs text-gray-600">Actuellement fourni par le .env du serveur.</p>}
            </div>
          ))}
          <div className="sm:col-span-2">
            <button disabled={savingMail} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50">
              {savingMail ? 'Enregistrement…' : '💾 Enregistrer la config e-mail'}
            </button>
          </div>
        </form>

        {/* Test d'envoi */}
        <form onSubmit={testMail} className="rounded-xl border border-gray-800 p-4">
          <p className="text-sm text-gray-400">Tester l’envoi avec la configuration enregistrée ci-dessus :</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input type="email" required placeholder="votre@email.fr"
              className="min-w-56 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
              value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="E-mail de test" />
            <button disabled={testingMail}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
              {testingMail ? 'Envoi…' : '✉️ Envoyer le test'}
            </button>
          </div>
        </form>
      </section>

      <Toast />
    </div>
  );
}
