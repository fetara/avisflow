'use client';

import { useEffect, useState } from 'react';

/* Bascule clair/sombre : mémorisée en localStorage, suit le système par défaut. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  }

  return (
    <button onClick={toggle} aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 text-lg hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
