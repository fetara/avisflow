'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState('login'); // login | 2fa | register
  const [form, setForm] = useState({ email: '', password: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    params.get('err') === 'validation' ? 'Lien de validation invalide ou expiré.' : ''
  );
  const [info, setInfo] = useState(
    params.get('ok') === 'validated' ? 'Compte validé ! Vous pouvez vous connecter.' : ''
  );

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setInfo('');
    try {
      if (mode === 'register') {
        const res = await fetch('/api/admin/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInfo(data.message || 'Vérifiez vos e-mails.');
        setMode('login');
        return;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, totp: mode === '2fa' ? form.code : undefined }),
      });
      const data = await res.json();
      if (res.status === 401 && data.twoFactor === 'email') {
        setInfo(data.message || 'Un code à 6 chiffres vous a été envoyé par e-mail.');
        setMode('2fa');
        return;
      }
      if (res.status === 401 && data.twoFactor === 'totp') {
        setInfo('Entrez votre code TOTP (application d\'authentification).');
        setMode('2fa');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
      router.push('/admin');
      router.refresh();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      {mode !== '2fa' && (
        <>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" className="input" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" className="input" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {mode === 'register' && <p className="mt-1 text-xs text-gray-400">10 caractères minimum.</p>}
          </div>
        </>
      )}
      {mode === '2fa' && (
        <div>
          <label className="label" htmlFor="code">Code à 6 chiffres (2FA)</label>
          <input id="code" inputMode="numeric" pattern="[0-9a-zA-Z]{6}" maxLength={6} className="input text-center text-xl tracking-[0.5em]" required
            value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
      )}
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {info && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? '…' : mode === 'register' ? 'Créer le compte' : mode === '2fa' ? 'Valider le code' : 'Se connecter'}
      </button>
      {mode === 'login' && (
        <button type="button" onClick={() => setMode('register')} className="w-full text-center text-sm text-gray-500 hover:text-brand-600">
          Créer un compte administrateur →
        </button>
      )}
    </form>
  );
}
