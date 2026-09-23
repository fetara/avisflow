'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/* Sidebar administrative : desktop fixe à gauche, drawer ☰ sur mobile.
 * sections : [{ title, items: [{ href, label, icon, badge? }] }] */
export default function Sidebar({ brand = 'AvisFlow', subtitle = null, sections = [], footer = null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => {
    const p = pathname || '';
    return href === '' || href === '/' ? p === href : p === href || p.startsWith(href + '/');
  };

  const nav = (
    <nav className="flex h-full w-64 flex-col border-r border-gray-800 bg-gray-950 text-gray-300">
      <div className="border-b border-gray-800 px-5 py-4">
        <p className="text-lg font-extrabold text-amber-400">🎡 {brand}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((sec) => (
          <div key={sec.title}>
            {sec.title && (
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">{sec.title}</p>
            )}
            <div className="space-y-0.5">
              {sec.items.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive(it.href)
                      ? 'bg-brand-600/20 text-brand-300'
                      : 'hover:bg-gray-800 hover:text-white'}`}>
                  <span aria-hidden="true" className="w-5 text-center">{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {it.badge != null && it.badge > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-2 text-xs font-bold text-amber-400">{it.badge}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-gray-800 px-3 py-3">{footer}</div>
    </nav>
  );

  return (
    <>
      {/* Burger mobile */}
      <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu"
        className="fixed left-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-xl text-white shadow-lg lg:hidden">
        ☰
      </button>

      {/* Desktop : sidebar fixe */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">{nav}</aside>

      {/* Mobile : drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 shadow-2xl" onClick={(e) => e.stopPropagation()}>{nav}</div>
        </div>
      )}
    </>
  );
}
