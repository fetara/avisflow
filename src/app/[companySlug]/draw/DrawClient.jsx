'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* Page publique du tirage : inscription + écran de projection plein écran.
 * Animation « roue » : disque rotatif (ease-out identique à la roue de la chance)
 * avec roulement des noms, puis révélation des gagnants rang par rang. */
export default function DrawClient({ companySlug, companyName, drawName, registrationOpen, hasWinners }) {
  const [live, setLive] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null); // { names, winners }
  const [rolling, setRolling] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const angleRef = useRef(0);
  const discRef = useRef(null);
  const timers = useRef([]);

  const loadLive = useCallback(async () => {
    const d = await fetch(`/api/raffle/live/${companySlug}`).then((r) => r.json()).catch(() => null);
    if (d && d.names) setData(d);
    return d;
  }, [companySlug]);

  useEffect(() => { if (live) loadLive(); }, [live, loadLive]);
  // Nettoyage des timers/rAF au démontage
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);
  const rafRef = useRef(null);

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

  // Animation « roue » : le disque tourne (5 tours + aléa, ease-out cubic comme la
  // roue de la chance) pendant que les noms défilent de plus en plus lentement,
  // jusqu'à l'arrêt sur le gagnant du rang courant.
  function startRoll() {
    if (!data || !data.names.length || rolling) return;
    const names = data.names;
    const winner = data.winners[winnerIdx];
    if (!winner) return;
    setRolling(true);
    setDisplayName(names[0]);

    const start = performance.now();
    const duration = 4600;
    const from = angleRef.current;
    const turns = 5 * 360 + Math.random() * 360;
    let lastTick = 0;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = from + turns * ease;
      angleRef.current = angle;
      if (discRef.current) discRef.current.style.transform = `rotate(${angle}deg)`;

      // Les noms défilent d'autant plus lentement que la roue ralentit
      const tickDelay = 50 + ease * 320;
      if (now - lastTick >= tickDelay) {
        setDisplayName(names[Math.floor(Math.random() * names.length)]);
        lastTick = now;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setRolling(false);
        setDisplayName(winner.name);
        if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  if (live) {
    const winner = data?.winners?.[winnerIdx] || null;
    const rollingNames = rolling || (!data && true);
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 text-center text-gray-100">
        <p className="text-sm uppercase tracking-widest text-brand-400">{companyName} — {drawName}</p>

        {/* Disque rotatif « roue de la chance » + nom au centre */}
        <div className="relative mt-8 aspect-square w-[min(80vw,420px)]">
          <div
            ref={discRef}
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-[10px] border-white/90 shadow-2xl will-change-transform"
            style={{
              background: `conic-gradient(#db2777, #fbbf24, #10b981, #6366f1, #db2777, #f97316, #10b981, #6366f1, #db2777)`,
            }}
          />
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl drop-shadow" aria-hidden="true">▼</div>
          {/* Pastille centrale : le nom courant / gagnant (reste droit pendant la rotation) */}
          <div className="absolute left-1/2 top-1/2 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white p-2 shadow-2xl">
            <p className={`break-words px-2 font-extrabold leading-tight ${rolling ? 'text-2xl text-gray-700' : 'text-3xl text-brand-700'}`}>
              {rolling ? displayName || '…' : winner ? winner.name : (data?.names?.length ? 'Prêt !' : '—')}
            </p>
          </div>
        </div>

        {/* Rang + lot du gagnant révélé */}
        {!rolling && winner && (
          <div className="animate-fade-up mt-6">
            <p className="text-xs uppercase tracking-widest text-gray-400">Gagnant rang {winner.rank}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">🎉 {winner.prize}</p>
            {data.winners[winnerIdx + 1] && (
              <button onClick={() => setWinnerIdx(winnerIdx + 1)}
                className="mt-5 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-500">
                Gagnant suivant →
              </button>
            )}
          </div>
        )}
        {!rolling && data?.winners?.length === 0 && (
          <p className="mt-6 text-gray-400">Le tirage n’a pas encore été effectué.</p>
        )}

        <div className="absolute bottom-6 flex flex-wrap justify-center gap-3">
          {!rolling && data?.names?.length > 0 && data.winners.length > 0 && (
            <button onClick={startRoll} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-500">
              🎲 {winnerIdx + 1 < (data.winners.length || 0) ? 'Tirer le gagnant suivant' : 'Relancer l’animation'}
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
