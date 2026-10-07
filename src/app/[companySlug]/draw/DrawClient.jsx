'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* Page publique du tirage : inscription + écran de projection plein écran
 * (roulement accéléré des noms, puis révélation des gagnants rang par rang). */
export default function DrawClient({ companySlug, companyName, drawName, registrationOpen, hasWinners }) {
  const [live, setLive] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null); // { names, winners }
  const [rolling, setRolling] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [winnerIdx, setWinnerIdx] = useState(-1); // rang en cours de révélation
  const timers = useRef([]);

  const loadLive = useCallback(async () => {
    const d = await fetch(`/api/raffle/live/${companySlug}`).then((r) => r.json()).catch(() => null);
    if (d && d.names) setData(d);
    return d;
  }, [companySlug]);

  useEffect(() => { if (live) loadLive(); }, [live, loadLive]);
  // Nettoyage des timers au démontage
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function register(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/raffle/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companySlug, name: form.name, email: form.email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg({ ok: res.ok, text: data.message || data.error || '' });
    if (res.ok) setForm({ name: '', email: '' });
  }

  // Animation : roulement des noms (ralenti progressif) puis révélation rang par rang
  function startRoll() {
    if (!data || data.names.length === 0) return;
    setRolling(true);
    setWinnerIdx(0);
    const names = data.names;
    let i = 0, delay = 40, elapsed = 0;
    const total = 3200;
    function tick() {
      setDisplayName(names[i % names.length]);
      i++; elapsed += delay;
      delay = 40 + Math.pow(elapsed / total, 6) * 420; // ralenti de fin
      if (elapsed < total) {
        timers.current.push(setTimeout(tick, delay));
      } else {
        setRolling(false);
      }
    }
    tick();
  }

  if (live) {
    const winner = data?.winners?.[winnerIdx] || null;
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 px-4 text-center text-gray-100">
        <p className="text-sm uppercase tracking-widest text-brand-400">{companyName} — {drawName}</p>
        <div className="mt-8 min-h-28 flex items-center justify-center">
          <p className={`font-extrabold ${rolling ? 'text-4xl text-gray-300 blur-[1px]' : 'text-6xl text-amber-400'} transition-all`}>
            {rolling || !data ? (data?.names?.length ? displayName || data.names[0] : '—') : winner ? winner.name : (data.names.length ? 'Prêt !' : 'Aucun participant')}
          </p>
        </div>
        {!rolling && winner && (
          <div className="animate-fade-up mt-4">
            <p className="text-2xl font-bold text-emerald-400">🎉 {winner.prize}</p>
            {data.winners[winnerIdx + 1] && (
              <button onClick={() => setWinnerIdx(winnerIdx + 1)}
                className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-500">
                Gagnant suivant →
              </button>
            )}
          </div>
        )}
        {!rolling && data?.winners?.length === 0 && (
          <p className="mt-6 text-gray-400">Le tirage n’a pas encore été effectué.</p>
        )}
        <div className="absolute bottom-6 flex gap-3">
          {!rolling && data?.names?.length > 0 && (
            <button onClick={startRoll} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-500">
              🎲 {data.winners.length ? 'Relancer l’animation' : 'Lancer l’animation'}
            </button>
          )}
          <button onClick={() => setLive(false)} className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800">
            ← Retour
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-gray-900 px-4 py-10 text-gray-100">
      <p className="text-sm uppercase tracking-widest text-brand-400">{companyName}</p>
      <h1 className="mt-2 text-center text-4xl font-extrabold">🎲 {drawName}</h1>

      {registrationOpen ? (
        <form onSubmit={register} className="card mt-8 w-full max-w-md space-y-4 !bg-gray-900 dark:!bg-gray-900">
          <h2 className="font-bold">Inscrivez-vous au tirage</h2>
          <div>
            <label className="label" htmlFor="dname">Nom *</label>
            <input id="dname" className="input" required maxLength={60} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="demail">E-mail *</label>
            <input id="demail" type="email" className="input" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Inscription…' : '🎲 M’inscrire au tirage'}
          </button>
          {msg && (
            <p role={msg.ok ? 'status' : 'alert'}
              className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}
          <p className="text-center text-xs text-gray-500">Une seule inscription par e-mail. Le tirage est effectué de façon équitable et vérifiable.</p>
        </form>
      ) : (
        <p className="card mt-8 text-center text-sm text-gray-400">
          {hasWinners
            ? 'Les inscriptions sont fermées — consultez l’écran de projection pour découvrir les gagnants.'
            : 'Les inscriptions ne sont pas ouvertes pour le moment.'}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {hasWinners && (
          <button onClick={() => setLive(true)} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-500">
            📺 Écran de projection
          </button>
        )}
        <Link href={`/${companySlug}/play`} className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800">
          🎡 Jouer à la roue
        </Link>
        <Link href="/" className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800">
          ← Accueil
        </Link>
      </div>
    </main>
  );
}
