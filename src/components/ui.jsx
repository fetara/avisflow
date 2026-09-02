'use client';

/* ------------------------------------------------------------------
 * Petits composants UI réutilisables (design system minimal)
 * - <Skeleton /> : état de chargement (squelette animé)
 * - <EmptyState /> : état vide avec guide d'action
 * - <Toast /> / useToast : feedback succès/erreur sur chaque action
 * - <Spinner /> : indicateur d'action en cours
 * ------------------------------------------------------------------ */

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div role="status" aria-label="Chargement en cours" className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = '📭', title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
      <div className="text-5xl" aria-hidden="true">{icon}</div>
      <h3 className="mt-4 font-bold text-gray-700">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-gray-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Chargement…' }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
