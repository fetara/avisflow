import Link from 'next/link';

export const metadata = { title: 'Opération terminée' };

export default function OperationTerminee() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-4xl">🍂</div>
        <h1 className="text-2xl font-bold">Opération terminée</h1>
        <p className="mt-3 text-gray-600">
          Merci de votre visite ! Cette opération est terminée ou n&apos;est plus disponible.
          Repassez nous voir, de nouvelles surprises arrivent bientôt.
        </p>
        <Link href="/" className="btn-secondary mt-6">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
