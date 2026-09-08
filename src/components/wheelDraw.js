// Rendu canvas de la roue, partagé entre le composant de jeu (Wheel)
// et la prévisualisation de l'éditeur (WheelPreview) — un seul algorithme de dessin.

// Palette par défaut (rose de la marque) si l'entreprise n'a rien personnalisé
export const DEFAULT_WHEEL_COLORS = ['#fbcfe8', '#fce7f3', '#f9a8d4', '#fdf2f8', '#f472b6', '#fbcfe8', '#fce7f3', '#f9a8d4'];

/**
 * Dessine la roue sur un canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{label:string}>} prizes segments (labels)
 * @param {string[]} colors couleurs hex des segments (alternées)
 * @param {HTMLImageElement|null} bgImg image de fond chargée (data URL), dessinée sous les segments
 * @param {number} rotation rotation en radians
 * @param {Array<HTMLImageElement|null>} [images] photos des lots chargées (alignées sur prizes)
 * @param {number} [pulse] phase d'animation 0..2π : fait « respirer » les vignettes au repos
 */
export function drawWheel(canvas, prizes, colors, bgImg, rotation = 0, images = null, pulse = 0, accent = '#db2777') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;
  const n = prizes.length || 1;
  const arc = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, size, size);

  // Image de fond : couvre tout le disque ("cover"), voile clair pour la lisibilité
  if (bgImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max((radius * 2) / bgImg.width, (radius * 2) / bgImg.height);
    const w = bgImg.width * scale;
    const h = bgImg.height * scale;
    ctx.drawImage(bgImg, center - w / 2, center - h / 2, w, h);
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
    ctx.globalAlpha = bgImg ? 0.82 : 1;
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

  // Cercle externe + moyeu + aiguille
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, center, size / 20, 0, Math.PI * 2);
  ctx.fillStyle = accent;
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

/** Charge une data URL en HTMLImageElement, avec callback à la fin (succès ou échec). */
export function loadImage(dataUrl, cb) {
  if (!dataUrl) { cb(null); return; }
  const img = new Image();
  img.onload = () => cb(img);
  img.onerror = () => cb(null);
  img.src = dataUrl;
}
