'use client';

import { useEffect, useRef, useState } from 'react';

/* Démo animée du tirage au sort pour la page d'accueil :
 * disque rotatif (mêmes couleurs que la roue), les noms défilent de plus
 * en plus lentement, arrêt sur le gagnant, puis boucle automatiquement.
 * Noms de démonstration — aucune donnée réelle. */
const DEMO_NAMES = [
  'Sophie', 'Karim', 'Léa', 'Thomas', 'Nadia', 'Julien', 'Emma', 'Youssef',
  'Chloé', 'Mehdi', 'Alice', 'Hugo',
];
const DEMO_PRIZES = ['🎁 10% OFF', '☕ Café offert', '🎁 Dessert offert'];

export default function DrawDemo({ size = 300 }) {
  const [displayName, setDisplayName] = useState(DEMO_NAMES[0]);
  const [winner, setWinner] = useState(null);
  const [rolling, setRolling] = useState(false);
  const angleRef = useRef(0);
  const discRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);

  // Boucle automatique : spin -> gagnant -> pause -> spin…
  useEffect(() => {
    let cancelled = false;

    function spin() {
      if (cancelled) return;
      const names = DEMO_NAMES;
      const winnerName = names[Math.floor(Math.random() * names.length)];
      const prize = DEMO_PRIZES[Math.floor(Math.random() * DEMO_PRIZES.length)];
      setWinner(null);
      setRolling(true);
      setDisplayName(names[0]);

      const start = performance.now();
      const duration = 4200;
      const from = angleRef.current;
      const turns = 5 * 360 + Math.random() * 360;
      let lastTick = 0;

      function frame(now) {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        const angle = from + turns * ease;
        angleRef.current = angle;
        if (discRef.current) discRef.current.style.transform = `rotate(${angle}deg)`;

        const tickDelay = 50 + ease * 320;
        if (now - lastTick >= tickDelay) {
          setDisplayName(names[Math.floor(Math.random() * names.length)]);
          lastTick = now;
        }
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          setRolling(false);
          setDisplayName(winnerName);
          setWinner(prize);
          timeoutRef.current = setTimeout(spin, 3200); // boucle
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    spin();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-[min(78vw,300px)]" aria-label="Démonstration du tirage au sort" role="img">
        <div
          ref={discRef}
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-[10px] border-white/90 shadow-2xl will-change-transform"
          style={{
            background: 'conic-gradient(#db2777, #fbbf24, #10b981, #6366f1, #db2777, #f97316, #10b981, #6366f1, #db2777)',
          }}
        />
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl" aria-hidden="true">▼</div>
        <div className="absolute left-1/2 top-1/2 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white p-2 text-center shadow-2xl">
          <p className={`break-words px-1 font-extrabold leading-tight text-brand-700 ${rolling ? 'text-xl text-gray-700' : 'text-2xl'}`}>
            {displayName}
          </p>
        </div>
      </div>
      <p className={`mt-4 text-sm font-bold ${winner ? 'text-emerald-600' : 'text-gray-400'}`}>
        {winner ? `🎉 Gagnant : ${winner}` : '🎲 Tirage au sort en cours…'}
      </p>
      <p className="mt-1 text-xs text-gray-400">Démonstration — noms fictifs</p>
    </div>
  );
}
