'use client';

import { useEffect, useState } from 'react';

const WHEEL_COLORS = ['#db2777', '#fbbf24', '#10b981', '#6366f1', '#db2777', '#f97316', '#10b981', '#6366f1'];
const DEMO_NAMES = ['Sophie', 'Karim', 'Léa', 'Thomas', 'Nadia', 'Julien', 'Emma', 'Youssef'];

/* Mockup téléphone de la landing : alterne automatiquement entre les DEUX jeux
 * de l'entreprise — la roue de la chance, puis le tirage au sort avec roulement
 * des noms et révélation du gagnant. Démonstration visuelle, noms fictifs. */
export default function PhoneMockup() {
  const [mode, setMode] = useState('wheel'); // 'wheel' | 'raffle-roll' | 'raffle-won'
  const [name, setName] = useState(DEMO_NAMES[0]);

  // Cycle : roue 5 s -> tirage (roulement 2,5 s puis gagnant 2,5 s) -> roue…
  useEffect(() => {
    let cancelled = false;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));

    function cycle() {
      if (cancelled) return;
      setMode('wheel');
      later(() => {
        setMode('raffle-roll');
        let i = 0;
        const roll = setInterval(() => {
          if (cancelled) { clearInterval(roll); return; }
          setName(DEMO_NAMES[i % DEMO_NAMES.length]);
          i++;
        }, 110);
        later(() => {
          clearInterval(roll);
          setName(DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)]);
          setMode('raffle-won');
          later(cycle, 2600);
        }, 2500);
      }, 5000);
    }
    cycle();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  const step = 360 / WHEEL_COLORS.length;
  const gradient = WHEEL_COLORS.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  const raffle = mode !== 'wheel';

  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl dark:border-gray-700">
      <div className="absolute left-1/2 top-2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
      <div className="flex min-h-[480px] flex-col items-center rounded-[2rem] bg-gradient-to-b from-brand-50 to-white px-5 pb-6 pt-12 dark:from-gray-800 dark:to-gray-900">
        {/* Onglets des 2 jeux (illustre la rotation automatique) */}
        <div className="flex gap-1 rounded-full bg-gray-200/70 p-1 text-[11px] font-bold dark:bg-gray-800">
          <span className={`rounded-full px-3 py-1 transition ${!raffle ? 'bg-white text-brand-700 shadow dark:bg-gray-900 dark:text-brand-300' : 'text-gray-400'}`}>🎡 Roue</span>
          <span className={`rounded-full px-3 py-1 transition ${raffle ? 'bg-white text-brand-700 shadow dark:bg-gray-900 dark:text-brand-300' : 'text-gray-400'}`}>🎲 Tirage</span>
        </div>

        {/* Roue de la chance */}
        {!raffle && (
          <div className="animate-fade-up relative mt-6 aspect-square w-56">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl" aria-hidden="true">▼</div>
            <div className="animate-wheel h-full w-full rounded-full border-[6px] border-white shadow-xl" style={{ background: `conic-gradient(${gradient})` }}>
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl shadow">🎡</div>
            </div>
            <p className="mt-5 text-center text-sm font-extrabold text-emerald-600">🎁 10% OFF</p>
            <button type="button" tabIndex={-1} className="mt-2 w-full rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white shadow">TOURNER LA ROUE</button>
          </div>
        )}

        {/* Tirage au sort : roulement des noms puis gagnant */}
        {raffle && (
          <div className="animate-fade-up mt-6 flex w-full flex-1 flex-col items-center justify-center">
            <div className="relative aspect-square w-44">
              <div
                className={`h-full w-full rounded-full border-[6px] border-white shadow-xl transition-transform duration-700 ${mode === 'raffle-won' ? 'scale-105' : 'animate-pulse'}`}
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg shadow">🎲</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className={`rounded-xl bg-white/95 px-3 py-2 text-center text-sm font-extrabold shadow-lg ${mode === 'raffle-won' ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {mode === 'raffle-won' ? `🎉 ${name}` : name}
                </p>
              </div>
            </div>
            <p className={`mt-5 rounded-full px-4 py-1.5 text-sm font-extrabold ${mode === 'raffle-won' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
              {mode === 'raffle-won' ? '🎁 Vous avez gagné !' : '🎲 Tirage des participants…'}
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-gray-400">Ce que vos clients verront sur leur téléphone</p>
      </div>
    </div>
  );
}
