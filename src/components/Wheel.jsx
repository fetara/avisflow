'use client';

import { useEffect, useRef, useState } from 'react';
import { drawWheel, loadImage, DEFAULT_WHEEL_COLORS } from './wheelDraw';

// Roue de la chance animée en Canvas. Le tirage est déterminé côté serveur :
// au clic, onLaunch() appelle l'API (/api/spin) qui retourne le lot gagnant,
// puis la roue s'arrête visuellement sur le segment correspondant.
// Props de personnalisation (par entreprise) :
// - colors : tableau de couleurs hex des segments
// - bgImage : data URL d'une image de fond dessinée sous les segments
export default function Wheel({ prizes, onLaunch, onDone, colors: colorsProp, bgImage: bgImageProp, accent = '#db2777' }) {
  const canvasRef = useRef(null);
  const [rotating, setRotating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const rotationRef = useRef(0);

  const colors = Array.isArray(colorsProp) && colorsProp.length > 0 ? colorsProp : DEFAULT_WHEEL_COLORS;
  const bgImgRef = useRef(null); // image de fond chargée (null tant que non chargée)
  const imagesRef = useRef([]);  // photos des lots chargées, alignées sur prizes
  const [ready, setReady] = useState(0); // compteur pour redessiner après chargements

  // Chargement de l'image de fond (data URL) puis redessin
  useEffect(() => {
    loadImage(bgImageProp, (img) => { bgImgRef.current = img; setReady((v) => v + 1); });
  }, [bgImageProp]);

  // Chargement des photos des lots (une par segment ayant une photo)
  useEffect(() => {
    let alive = true;
    Promise.all(prizes.map((p) => new Promise((res) => (p.photo ? loadImage(p.photo, res) : res(null)))))
      .then((imgs) => { if (alive) { imagesRef.current = imgs; setReady((v) => v + 1); } });
    return () => { alive = false; };
  }, [prizes]);

  // Redessin quand les lots, les couleurs ou l'image de fond changent
  useEffect(() => {
    drawWheel(canvasRef.current, prizes, colors, bgImgRef.current, rotationRef.current * Math.PI / 180, imagesRef.current, 0, accent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prizes, colors, ready]);

  // Animation douce au repos : les vignettes photos « respirent » (suspendue pendant la rotation)
  useEffect(() => {
    if (rotating || launching) return;
    let raf;
    const start = performance.now();
    const loop = (now) => {
      drawWheel(canvasRef.current, prizes, colors, bgImgRef.current,
        rotationRef.current * Math.PI / 180, imagesRef.current, ((now - start) / 500) % (Math.PI * 2), accent);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotating, launching, prizes, colors, ready]);

  // Passage des photos à chaque frame de rotation
  function draw(rotation) {
    drawWheel(canvasRef.current, prizes, colors, bgImgRef.current, rotation, imagesRef.current, 0, accent);
  }

  async function launch() {
    if (rotating || launching) return;
    setError('');
    setLaunching(true);
    let winnerId;
    try {
      // Tirage CÔTÉ SERVEUR (probabilités pondérées, stock, 1 tour/e-mail)
      const res = await fetch('/api/spin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur du tirage');
      winnerId = data.prizeId;
      onLaunch?.(data);
    } catch (e2) {
      setError(e2.message);
      setLaunching(false);
      return;
    }
    setLaunching(false);

    // Animation : arrêt sur le segment gagnant
    const winnerIndex = Math.max(0, prizes.findIndex((p) => p.id === winnerId));
    const n = prizes.length;
    const arc = 360 / n;
    const targetBase = 360 - (winnerIndex * arc + arc / 2);
    const turns = 5 * 360;
    const from = rotationRef.current % 360;
    const delta = turns + ((targetBase - from) % 360 + 360) % 360;

    setRotating(true);
    const start = performance.now();
    const duration = 4600;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      rotationRef.current = from + delta * easeOut(t);
      drawWheel(canvasRef.current, prizes, colors, bgImgRef.current, (rotationRef.current * Math.PI) / 180, imagesRef.current, 0, accent);
      if (t < 1) requestAnimationFrame(frame);
      else {
        setRotating(false);
        // Retour haptique à l'arrêt (mobiles compatibles)
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 40, 120]);
      }
    }
    requestAnimationFrame(frame);
    setTimeout(() => onDone?.(), duration + 250);
  }

  // Spin au swipe : un geste tactile horizontal significatif lance la roue
  const touchStartX = useRef(null);
  function onTouchStart(e) { touchStartX.current = e.touches[0]?.clientX ?? null; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = Math.abs((e.changedTouches[0]?.clientX ?? 0) - touchStartX.current);
    touchStartX.current = null;
    if (dx > 40) launch();
  }

  return (
    <div className="flex flex-col items-center">
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas
          ref={canvasRef} width={340} height={340}
          className="h-auto w-[min(86vw,340px)] drop-shadow-xl sm:w-[340px]"
          role="img" aria-label="Roue de la chance"
        />
      </div>
      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button onClick={launch} disabled={rotating || launching} className="btn-primary mt-6 w-full max-w-xs">
        {rotating ? 'La roue tourne…' : launching ? 'Tirage en cours…' : 'Lancer la roue !'}
      </button>
      <p className="mt-2 text-xs text-gray-400 sm:hidden">Astuce : balayez la roue pour la lancer.</p>
    </div>
  );
}
