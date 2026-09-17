'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* Cartes de tarification publiques. Les prix/fonctionnalités viennent de la base
 * (SubscriptionPlan). Le choix déclenche une demande PENDING validée par le super admin. */
export default function PlanCards({ plans, currentPlanSlug, canSubscribe }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  async function choose(slug) {
    if (!canSubscribe) {
      router.push(`/admin/login?next=tarifs&plan=${slug}`);
      return;
    }
    setBusy(slug);
    const res = await fetch('/api/subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planSlug: slug }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMessage({ ok: res.ok, text: data.error || data.message || '' });
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id}
            className={`relative flex flex-col rounded-3xl border p-7 shadow-sm ${p.slug === 'business' ? 'border-brand-600 shadow-xl ring-2 ring-brand-600/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'}`}>
            {p.slug === 'business' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Le plus populaire</span>
            )}
            <h3 className="text-lg font-bold">{p.name}</h3>
            {p.description && <p className="mt-1 text-sm text-gray-500">{p.description}</p>}
            <p className="mt-3">
              <span className="text-4xl font-extrabold">
                {p.priceMonthly == null ? 'Sur devis' : `${Number(p.priceMonthly)}€`}
              </span>
              {p.priceMonthly != null && <span className="text-gray-500"> /mois</span>}
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {(Array.isArray(p.features) ? p.features : []).map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-emerald-500">✓</span>{label}
                </li>
              ))}
              {p.maxQrCodes != null && <li className="flex items-center gap-2"><span aria-hidden="true" className="text-emerald-500">✓</span>{p.maxQrCodes} QR code(s) max.</li>}
              {p.maxCustomers != null && <li className="flex items-center gap-2"><span aria-hidden="true" className="text-emerald-500">✓</span>{p.maxCustomers} clients max.</li>}
            </ul>
            <button onClick={() => choose(p.slug)} disabled={busy === p.slug || currentPlanSlug === p.slug}
              className={`mt-6 rounded-xl py-3 text-center text-sm font-bold transition disabled:opacity-60 ${p.slug === 'business' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
              {currentPlanSlug === p.slug ? '✓ Plan actuel' : busy === p.slug ? 'Envoi…' : 'Choisir ce plan'}
            </button>
          </div>
        ))}
      </div>

      {message && (
        <div role={message.ok ? 'status' : 'alert'}
          className={`mt-6 rounded-xl p-4 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
          {message.text}
          {message.ok && <> Consultez « Mon abonnement » dans votre tableau de bord.</>}
        </div>
      )}

      {!canSubscribe && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Vous êtes déjà une entreprise ? <Link href="/admin/login" className="font-semibold text-brand-600 hover:underline">Connectez-vous</Link> puis choisissez votre plan.
        </p>
      )}
    </div>
  );
}
