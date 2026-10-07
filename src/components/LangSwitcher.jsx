'use client';

import { LOCALE_LABELS } from '@/i18n/dictionaries';

/* Sélecteur de langue FR / EN / عربي : écrit le cookie et recharge
 * (les composants serveur relisent la langue au refresh). */
export default function LangSwitcher({ current = 'fr', onSwitch }) {
  function switchTo(l) {
    if (l === current) return;
    document.cookie = `lang=${l};path=/;max-age=${365 * 86400};samesite=lax`;
    try { localStorage.setItem('lang', l); } catch {}
    if (onSwitch) onSwitch(l); else window.location.reload();
  }
  return (
    <div role="group" aria-label="Langue / Language / اللغة"
      className="inline-flex items-center gap-0.5 rounded-xl border border-gray-300 p-0.5 text-xs font-semibold dark:border-gray-700">
      {Object.entries(LOCALE_LABELS).map(([code, label]) => (
        <button key={code} onClick={() => switchTo(code)}
          aria-current={current === code ? 'true' : undefined}
          className={`rounded-lg px-2.5 py-1.5 transition ${current === code
            ? 'bg-brand-600 text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
