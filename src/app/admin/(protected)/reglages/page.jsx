'use client';

import { useEffect, useState } from 'react';

export default function ReglagesPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => setSettings(d.settings || {})).catch(() => setError('Chargement impossible'));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError(''); setSaved(false);
    const res = await fetch('/api/admin/settings', {
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
        <p className="mt-1">Le règlement du jeu (gratuit, sans achat, probabilités) est automatiquement alimenté par vos lots : <a href="/reglement-jeu" className="text-brand-600 hover:underline" target="_blank">/reglement-jeu</a>.</p>
      </div>
    </div>
  );
}
