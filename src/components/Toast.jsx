'use client';

/* Toast de feedback : succès / erreur, auto-fermé, accessible (role=status/alert). */
export function Toast({ kind = 'success', message, onClose }) {
  if (!message) return null;
  const styles = kind === 'error'
    ? 'bg-red-600 text-white'
    : 'bg-emerald-600 text-white';
  const icon = kind === 'error' ? '✕' : '✓';
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-2xl ${styles}`}
    >
      <span aria-hidden="true">{icon}</span>
      {message}
      {onClose && (
        <button onClick={onClose} aria-label="Fermer" className="ml-2 opacity-70 hover:opacity-100">✕</button>
      )}
    </div>
  );
}

/* Hook minimal : `const { toast, show } = useToast()` puis `show('Enregistré !')` */
import { useCallback, useEffect, useState } from 'react';

export function useToast(timeout = 3500) {
  const [toast, setToast] = useState({ kind: 'success', message: '' });

  const show = useCallback((message, kind = 'success') => {
    setToast({ kind, message });
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ kind: 'success', message: '' }), timeout);
    return () => clearTimeout(t);
  }, [toast, timeout]);

  return { toast, show, Toast: (props) => <Toast {...toast} {...props} /> };
}
