
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backoffice — Connexion' };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎡</div>
          <h1 className="text-xl font-bold">Backoffice — Avis & Roue de la Chance</h1>
        </div>
        <Suspense fallback={<div className="card animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
