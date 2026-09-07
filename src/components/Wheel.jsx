'use client';

import { useEffect, useRef, useState } from 'react';

// Palette par défaut (rose de la marque) si l'entreprise n'a rien personnalisé
const DEFAULT_COLORS = ['#fbcfe8', '#fce7f3', '#f9a8d4', '#fdf2f8', '#f472b6', '#fbcfe8', '#fce7f3', '#f9a8d4'];

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

  const colors = Array.isArray(colorsProp) && colorsProp.length > 0 ? colorsProp : DEFAULT_COLORS;
  const bgImageRef = useRef(null); // objet Image HTML chargé (null tant que non chargé)
  const [bgReady, setBgReady] = useState(0); // compteur pour redessiner après chargement

  // Chargement de l'image de fond (data URL) puis redessin
  useEffect(() => {
    if (!bgImageProp) { bgImageRef.current = null; setBgReady((v) => v + 1); return; }
    const img = new Image();
    img.onload = () => { bgImageRef.current = img; setBgReady((v) => v + 1); };
    img.onerror = () => { bgImageRef.current = null; setBgReady((v) => v + 1); };
    img.src = bgImageProp;
  }, [bgImageProp]);

  function draw(rotation) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const n = prizes.length || 1;
    const arc = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    // Image de fond : dessinée en cercle complet, sous les segments semi-transparents
    const bg = bgImageRef.current;
    if (bg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.clip();
      // "cover" : l'image couvre toujours tout le disque sans se déformer
      const scale = Math.max((radius * 2) / bg.width, (radius * 2) / bg.height);
      const w = bg.width * scale;
      const h = bg.height * scale;
      ctx.drawImage(bg, center - w / 2, center - h / 2, w, h);
      // voile léger pour garder les textes lisibles
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    }

    for (let i = 0; i < n; i++) {
      const angle = rotation + i * arc;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      // Avec une image de fond, les segments sont légèrement transparents
      ctx.globalAlpha = bg ? 0.82 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9d174d';
      ctx.font = `bold ${Math.max(11, size / 34)}px sans-serif`;
      const label = prizes[i]?.label || '';
      const maxChars = 18;
      ctx.fillText(label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label, radius - 16, 5);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#db2777';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center, size / 20, 0, Math.PI * 2);
    ctx.fillStyle = '#db2777';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size / 22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', center, center + 1);

    ctx.beginPath();
    ctx.moveTo(center - 14, 6);
    ctx.lineTo(center + 14, 6);
    ctx.lineTo(center, 34);
    ctx.closePath();
    ctx.fillStyle = '#111827';
    ctx.fill();
  }

  // Redessin quand les lots, les couleurs ou l'image de fond changent
  useEffect(() => { draw(rotationRef.current); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [prizes, colors, bgReady]);

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
      draw((rotationRef.current * Math.PI) / 180);
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
