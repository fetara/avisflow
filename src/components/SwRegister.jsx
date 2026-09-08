'use client';

import { useEffect } from 'react';

/* Enregistre le service worker (PWA) côté navigateur. */
export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
