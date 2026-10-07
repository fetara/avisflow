'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* Page publique du tirage : inscription + écran de projection plein écran.
 * Animation : boule de tirage (billes qui culbutent, style loto) + ticket du nom.
 * Les boutons sont en FLUX NORMAL (pas de barre fixe) pour éviter tout chevauchement
 * avec la barre du navigateur mobile. */
const BALL_COLORS = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#f97316', '#0ea5e9', '#a855f7', '#ef4444'];
const BALL_POS = [
  { x: 18, y: 22 }, { x: 52, y: 14 }, { x: 74, y: 38 }, { x: 60, y: 62 },
  { x: 30, y: 66 }, { x: 12, y: 48 }, { x: 42, y: 40 }, { x: 68, y: 18 },
];

export default function DrawClient({ companySlug, companyName, drawName, registrationOpen, hasWinners }) {
  const [live, setLive] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null); // { names, winners }
  const [rolling, setRolling] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const timers = useRef([]);

  const loadLive = useCallback(async () => {
    const d = await fetch(`/api/raffle/live/${companySlug}`).then((r) => r.json()).catch(() => null);
    if (d && d.names) setData(d);
    return d;
  }, [companySlug]);

  useEffect(() => { if (live) loadLive(); }, [live, loadLive]);
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

  // Roulement : les billes culbutent vite puis se posent ; le nom ralentit avant l'arrêt
  function startRoll() {
    if (!data || !data.names.length || rolling) return;
    const names = data.names;
    const winner = data.winners[winnerIdx];
    if (!winner) return;
    setRolling(true);
    setDisplayName(names[0]);

    const start = performance.now();
    const duration = 4600;
    let last = 0;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const gap = 60 + ease * 380; // ralentit progressivement
      if (now - last >= gap) {
        setDisplayName(names[Math.floor(Math.random() * names.length)]);
        last = now;
      }
      if (t < 1) {
        timers.current.push(setTimeout(frame, 16));
      } else {
        setRolling(false);
        setDisplayName(winner.name);
        if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
      }
    }
    timers.current.push(setTimeout(frame, 16));
  }

  if (live) {
    const winner = data?.winners?.[winnerIdx] || null;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-gray-900 px-4 py-10 text-gray-100">
        <p className="text-sm uppercase tracking-widest text-brand-400">{companyName} — {drawName}</p>

        {/* Boule de tirage : sphère en verre avec billes qui culbutent */}
        <div className="relative mt-8 aspect-square w-[min(78vw,360px)]">
          <div className={`absolute inset-0 overflow-hidden rounded-full border-8 border-white/90 bg-gradient-to-br from-sky-200/30 via-white/10 to-brand-300/30 shadow-2xl ${rolling ? '' : 'ball-paused'}`}>
            {/* reflets « verre » */}
            <div className="absolute -left-4 -top-6 h-20 w-32 rotate-[-18deg] rounded-full bg-white/40 blur-md" aria-hidden="true" />
            <div className="absolute bottom-2 right-4 h-8 w-20 rotate-[15deg] rounded-full bg-white/20 blur" aria-hidden="true" />
            {BALL_POS.map((pos, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="ball h-9 w-9"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  background: BALL_COLORS[i % BALL_COLORS.length],
                  animationDuration: `${0.9 + i * 0.13}s`,
                  animationDelay: `${-i * 0.22}s`,
                }}
              />
            ))}
          </div>
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl drop-shadow" aria-hidden="true">▼</div>
        </div>

        {/* Ticket du nom tiré */}
        <div className="raffle-ticket mt-6 w-full max-w-sm px-5 py-4 text-center shadow-xl">
          <p className="text-xs uppercase tracking-widest text-gray-400">
            {rolling ? 'Tirage en cours…' : winner ? `Gagnant rang ${winner.rank}` : 'En attente du tirage'}
          </p>
          <p className={`mt-1 break-words font-extrabold ${rolling ? 'text-xl text-gray-700' : 'text-3xl text-brand-700'}`}>
            {rolling || !data ? displayName || '…' : winner ? winner.name : (data?.names?.length ? 'Prêt !' : '—')}
          </p>
          {!rolling && winner && <p className="mt-1 text-lg font-bold text-emerald-600">🎉 {winner.prize}</p>}
        </div>

        {/* Actions : flux normal (jamais de barre fixe -> plus de tremblement mobile) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!rolling && data?.winners?.length > 0 && winnerIdx + 1 < data.winners.length && (
            <button onClick={startRoll} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-500">
              Gagnant suivant →
            </button>
          )}
          {!rolling && data?.winners?.length > 0 && (
            <button onClick={startRoll} className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800">
              🎲 Relancer l’animation
            </button>
          )}
          <button onClick={() => setLive(false)} className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800">
            ← Retour
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
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
