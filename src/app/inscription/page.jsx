'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation côté client avec messages clairs
  function validate() {
    const e = {};
    if (form.companyName.trim().length < 2) e.companyName = 'Le nom de votre entreprise (2 caractères minimum).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Entrez un e-mail valide.';
    if (form.password.length < 8) e.password = '8 caractères minimum.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setServerError(data.error || 'Erreur inattendue.'); return; }
      // Succès : on connecte directement l'utilisateur vers son espace
      router.push(`/admin/login?ok=created&next=${data.slug}`);
    } finally {
      setLoading(false);
    }
  }

  const field = (name, label, type = 'text', autoComplete) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name} type={type} className="input" autoComplete={autoComplete}
        value={form[name]}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-600">{errors[name]}</p>}
    </div>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎡</div>
          <h1 className="text-2xl font-bold">Créez votre entreprise</h1>
          <p className="mt-1 text-sm text-gray-500">Essai gratuit · Sans carte bancaire · Votre roue en 2 minutes</p>
        </div>

        <form onSubmit={submit} className="card space-y-4" noValidate>
          {field('companyName', 'Nom de votre entreprise', 'text', 'organization')}
          <p className="-mt-2 text-xs text-gray-400">
            Votre espace sera accessible sur /{form.companyName ? 'votre-entreprise' : 'votre-entreprise'} (slug généré automatiquement).
          </p>
          {field('email', 'E-mail administrateur', 'email', 'email')}
          {field('password', 'Mot de passe', 'password', 'new-password')}

          {serverError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Création en cours…' : '🚀 Démarrer mon essai gratuit'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ? <Link href="/admin/login" className="font-semibold text-brand-600 hover:underline">Se connecter</Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          En créant votre espace, vous acceptez les <Link href="/mentions-legales" className="underline">mentions légales</Link> et la
          <Link href="/confidentialite" className="underline"> politique de confidentialité</Link>.
        </p>
      </div>
    </main>
  );
}
