'use client';

import { useState } from 'react';
import Link from 'next/link';

/* Navigation responsive : liens horizontaux sur desktop, drawer burger sur mobile.
 * items : [{ href, label, icon? }] ; actions : contenu libre affiché en fin de barre (ex. thème, déconnexion). */
export default function NavBar({ brand, items = [], actions = null, brandClass = 'text-xl font-extrabold text-brand-700' }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className={`shrink-0 ${brandClass}`}>{brand}</Link>

        {/* Desktop */}
        <div className="ml-auto hidden items-center gap-1 md:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-brand-50 dark:text-gray-300 dark:hover:bg-gray-800">
              {it.icon && <span className="mr-1">{it.icon}</span>}{it.label}
            </Link>
          ))}
          {actions}
        </div>

        {/* Burger mobile */}
        <button
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-2xl hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
          aria-expanded={open} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-col">
            {items.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-800">
                {it.icon && <span className="mr-2">{it.icon}</span>}{it.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2" onClick={() => setOpen(false)}>{actions}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
