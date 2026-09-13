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
 * @param {string} [accent] couleur principale (cercle extérieur, moyeu)
 * @param {number} [highlight] index du segment gagnant : vignette agrandie + halo lumineux
 */
export function drawWheel(canvas, prizes, colors, bgImg, rotation = 0, images = null, pulse = 0, accent = '#db2777', highlight = -1) {
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

  const rImg = size / 13;   // rayon des vignettes photo
  const padImg = 8;         // espace photo <-> texte

  for (let i = 0; i < n; i++) {
    const angle = rotation + i * arc;
    const mid = rotation + i * arc + arc / 2;
    const isWinner = i === highlight;
    // La photo est calée près du bord, sur le MÊME rayon que le texte
    const imgX = radius - 16 - rImg;

    // --- Segment coloré ---
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

    // --- Vignette photo du lot, à côté du texte ---
    if (images[i]) {
      const img = images[i];
      const r = rImg * (1 + 0.1 * Math.sin(pulse + i * 0.9)) * (isWinner ? 1.2 : 1);

      // Halo lumineux autour du gagnant
      if (isWinner) {
        const gx = center + Math.cos(mid) * imgX;
        const gy = center + Math.sin(mid) * imgX;
        const glow = r + 8 + 3 * Math.sin(pulse * 2);
        ctx.beginPath();
        ctx.arc(gx, gy, glow, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(gx, gy, r, gx, gy, glow);
        grad.addColorStop(0, accent + 'cc');
        grad.addColorStop(1, accent + '00');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gx, gy, r + 4, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = accent;
        ctx.stroke();
      }

      // Photo en cercle (espace tourné du segment)
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(mid);
      ctx.beginPath();
      ctx.arc(imgX, 0, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const sc = Math.max((r * 2) / img.width, (r * 2) / img.height);
      ctx.drawImage(img, imgX - (img.width * sc) / 2, -(img.height * sc) / 2, img.width * sc, img.height * sc);
      ctx.restore();

      // Liseré blanc (double pour le gagnant) + ombre douce
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(mid);
      ctx.beginPath();
      ctx.arc(imgX, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = isWinner ? 5 : 3;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }

    // --- Libellé du lot, juste à côté de la photo (vers le centre) ---
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(mid);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9d174d';
    ctx.font = `bold ${Math.max(13, size / 26)}px sans-serif`;
    const label = prizes[i]?.label || '';
    const maxChars = images[i] ? 13 : 18; // texte raccourci quand la photo occupe l'espace
    const textX = images[i] ? imgX - rImg - padImg : radius - 16;
    ctx.fillText(label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label, textX, 5);
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
