'use client';

import { useEffect, useRef, useState } from 'react';

// Roue de la chance animée en Canvas. Le tirage est déterminé côté serveur :
// au clic, onLaunch() appelle l'API (/api/spin) qui retourne le lot gagnant,
// puis la roue s'arrête visuellement sur le segment correspondant.
export default function Wheel({ prizes, onLaunch, onDone }) {
  const canvasRef = useRef(null);
  const [rotating, setRotating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const rotationRef = useRef(0);

  const colors = ['#fbcfe8', '#fce7f3', '#f9a8d4', '#fdf2f8', '#f472b6', '#fbcfe8', '#fce7f3', '#f9a8d4'];

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
    for (let i = 0; i < n; i++) {
      const angle = rotation + i * arc;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
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

  useEffect(() => { draw(rotationRef.current); }, [prizes]);

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
