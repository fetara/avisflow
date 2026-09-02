'use client';

import { useParams } from 'next/navigation';

import { useEffect, useState } from 'react';

export default function ReglagesPage() {
  const { companySlug } = useParams();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tfa, setTfa] = useState(null);
  const [tfaForm, setTfaForm] = useState({ password: '', totp: '' });
  const [tfaMsg, setTfaMsg] = useState('');

  useEffect(() => {
    fetch(`/api/${companySlug}/settings`).then((r) => r.json()).then((d) => setSettings(d.settings || {})).catch(() => setError('Chargement impossible'));
    fetch(`/api/${companySlug}/twofa`).then((r) => r.json()).then(setTfa).catch(() => {});
  }, [companySlug]);

  async function toggle2fa(action) {
    setTfaMsg('');
    const res = await fetch(`/api/${companySlug}/twofa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, password: tfaForm.password, totp: tfaForm.totp || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setTfaMsg(data.error || 'Erreur'); return; }
    setTfaForm({ password: '', totp: '' });
    setTfa((prev) => ({ ...prev, userEnabled: data.twoFactorEnabled, active: action === 'enable' && prev.secretSet && prev.companyEnabled }));
    setTfaMsg(action === 'disable' ? '2FA désactivée.' : '2FA réactivée.');
  }

  async function save(e) {
    e.preventDefault();
    setError(''); setSaved(false);
    const res = await fetch(`/api/${companySlug}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) setError('Erreur lors de la sauvegarde');
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  if (!settings) return <p className="text-gray-400">Chargement…</p>;

  const FIELDS = [
    ['GAME_HEADLINE', "Accroche de la page d'accueil"],
    ['GAME_SUB', 'Sous-titre de la page d\'accueil'],
    ['AUTO_APPROVE_MIN_RATING', 'Auto-publier les avis ≥ ce nombre d\'étoiles (0 = désactivé)'],
    ['GOOGLE_REVIEW_URL', 'Lien « Laisser un avis sur Google »'],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <form onSubmit={save} className="card space-y-4">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input className="input" value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
            {key === 'AUTO_APPROVE_MIN_RATING' && <p className="mt-1 text-xs text-gray-400">Ex. 4 → les avis de 4 et 5 étoiles sont publiés automatiquement.</p>}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn-primary !py-2">Enregistrer</button>
          {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
      <div className="card !p-4 text-sm text-gray-600">
        <p className="font-semibold">Rappel jeu conforme :</p>
        <p className="mt-1">Le règlement du jeu (gratuit, sans achat, probabilités) est automatiquement alimenté par vos lots : <a href={`/reglement-jeu?src=${companySlug}`} className="text-brand-600 hover:underline" target="_blank">/reglement-jeu</a>.</p>
      </div>

      {/* Double authentification : état + toggle auto-service */}
      {tfa && (
        <div className="card space-y-3">
          <h2 className="font-bold">Double authentification (2FA)</h2>
          <p className="text-sm text-gray-500">
            {tfa.active
              ? '✅ Active : un code à 6 chiffres (application d\u2019authentification) est demandé à chaque connexion.'
              : tfa.secretSet && !tfa.companyEnabled
                ? '⚠️ Désactivée au niveau de votre entreprise par le super admin.'
                : tfa.secretSet
                  ? '⛔ Désactivée pour votre compte.'
                  : 'Aucun secret TOTP configuré — la 2FA vous sera proposée à la première connexion.'}
          </p>
          {tfa.secretSet && (
            <div className="space-y-2">
              <input type="password" className="input" placeholder="Mot de passe (confirmation)"
                value={tfaForm.password} onChange={(e) => setTfaForm({ ...tfaForm, password: e.target.value })} />
              {tfa.active && (
                <input className="input text-center tracking-widest" placeholder="Code 2FA actuel (6 chiffres)" maxLength={6}
                  value={tfaForm.totp} onChange={(e) => setTfaForm({ ...tfaForm, totp: e.target.value })} />
              )}
              <div className="flex gap-2">
                {tfa.userEnabled ? (
                  <button type="button" onClick={() => toggle2fa('disable')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                    Désactiver ma 2FA
                  </button>
                ) : (
                  <button type="button" onClick={() => toggle2fa('enable')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    Réactiver ma 2FA
                  </button>
                )}
                {tfaMsg && <span className="self-center text-sm text-gray-600">{tfaMsg}</span>}
              </div>
              <p className="text-xs text-gray-400">La désactivation est journalisée (qui, quand). Le super admin peut la forcer dans les deux sens.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
