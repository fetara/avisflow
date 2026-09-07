'use client';

import { useEffect, useRef, useState } from 'react';
import { drawWheel, loadImage, DEFAULT_WHEEL_COLORS } from './wheelDraw';

/**
 * Prévisualisation statique de la roue pour l'éditeur de Réglages.
 * Même rendu que la vraie roue (Wheel), sans interaction ni tirage :
 * les couleurs et l'image de fond se mettent à jour en direct pendant l'édition.
 */
export default function WheelPreview({ prizes = [], colors = null, bgImage = null, size = 280 }) {
  const canvasRef = useRef(null);
  const [bgImg, setBgImg] = useState(null);

  // Chargement de l'image de fond (data URL)
  useEffect(() => {
    loadImage(bgImage, setBgImg);
  }, [bgImage]);

  // Redessin à chaque changement (couleurs, image, lots)
  useEffect(() => {
    drawWheel(canvasRef.current, prizes, Array.isArray(colors) && colors.length ? colors : DEFAULT_WHEEL_COLORS, bgImg, -Math.PI / 2);
  }, [prizes, colors, bgImg]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        aria-label="Prévisualisation de la roue"
        role="img"
        className="drop-shadow-xl"
      />
      <p className="mt-2 text-xs text-gray-400">Aperçu en direct — les joueurs verront cette roue.</p>
    </div>
  );
}
