'use client';

import { useEffect, useRef, useState } from 'react';
import { drawWheel, loadImage, DEFAULT_WHEEL_COLORS } from './wheelDraw';

// Roue de la chance animée en Canvas. Le tirage est déterminé côté serveur :
// au clic, onLaunch() appelle l'API (/api/spin) qui retourne le lot gagnant,
// puis la roue s'arrête visuellement sur le segment correspondant.
// Props de personnalisation (par entreprise) :
// - colors : tableau de couleurs hex des segments
// - bgImage : data URL d'une image de fond dessinée sous les segments
export default function Wheel({ prizes, onLaunch, onDone, colors: colorsProp, bgImage: bgImageProp }) {
  const canvasRef = useRef(null);
  const [rotating, setRotating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const rotationRef = useRef(0);

  const colors = Array.isArray(colorsProp) && colorsProp.length > 0 ? colorsProp : DEFAULT_WHEEL_COLORS;
  const bgImgRef = useRef(null); // image de fond chargée (null tant que non chargée)
  const [bgReady, setBgReady] = useState(0); // compteur pour redessiner après chargement

  // Chargement de l'image de fond (data URL) puis redessin
  useEffect(() => {
    loadImage(bgImageProp, (img) => { bgImgRef.current = img; setBgReady((v) => v + 1); });
  }, [bgImageProp]);

  // Redessin quand les lots, les couleurs ou l'image de fond changent
  useEffect(() => {
    drawWheel(canvasRef.current, prizes, colors, bgImgRef.current, rotationRef.current * Math.PI / 180);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prizes, colors, bgReady]);

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
      drawWheel(canvasRef.current, prizes, colors, bgImgRef.current, (rotationRef.current * Math.PI) / 180);
      if (t < 1) requestAnimationFrame(frame);
      else setRotating(false);
    }
    requestAnimationFrame(frame);
    setTimeout(() => onDone?.(), duration + 250);
  }

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={340} height={340} className="h-[300px] w-[300px] drop-shadow-xl sm:h-[340px] sm:w-[340px]" />
      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button onClick={launch} disabled={rotating || launching} className="btn-primary mt-6 w-full max-w-xs">
        {rotating ? 'La roue tourne…' : launching ? 'Tirage en cours…' : 'Lancer la roue !'}
      </button>
    </div>
  );
}
