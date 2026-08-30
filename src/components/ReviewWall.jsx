'use client';

import { useEffect, useState } from 'react';

function Stars({ n }) {
  return <span className="text-amber-400" aria-label={`${n} étoiles`}>{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>;
}

// Carrousel des avis approuvés uniquement (mur de témoignages).
export default function ReviewWall({ reviews }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (reviews.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        <p className="text-lg">Aucun avis pour le moment — soyez le premier à en laisser un !</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
          {reviews.map((r) => (
            <figure key={r.id} className="card w-full shrink-0 text-center">
              <Stars n={r.rating} />
              <blockquote className="mt-3 text-gray-700">« {r.comment || 'Merci pour votre visite !'} »</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-gray-500">
                {r.customer?.firstName || 'Client'} · {new Date(r.createdAt).toLocaleDateString('fr-FR')}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {reviews.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={`Avis ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${i === index ? 'bg-brand-600' : 'bg-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}
