import { db, getSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Règlement du jeu' };

export default async function ReglementJeu() {
  let prizes = [];
  try {
    prizes = await db.prize.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
  } catch (e) { /* base indisponible */ }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Règlement du jeu « Roue de la Chance »</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="font-bold text-gray-900">1. Organisation</h2>
          <p>[Nom du commerce] organise un jeu gratuit sans obligation d&apos;achat, réservé aux clients de la boutique, accessible via les QR codes affichés en magasin.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">2. Participation</h2>
          <p>La participation est ouverte à toute personne majeure, sur inscription (prénom, nom, e-mail validé, consentement RGPD). Un seul tour de roue par e-mail validé. La participation est gratuite et sans achat.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">3. Lots et probabilités</h2>
          <p>Le tirage est effectué équitablement par le système, selon les probabilités pondérées ci-dessous :</p>
          {prizes.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 font-semibold">
                  <tr><th className="p-2">Lot</th><th className="p-2">Probabilité</th><th className="p-2">Stock</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = prizes.reduce((s, p) => s + p.weight, 0) || 1;
                    return prizes.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-2">{p.label}</td>
                        <td className="p-2">{((p.weight / total) * 100).toFixed(1)} %</td>
                        <td className="p-2">{p.stock === null ? 'Illimité' : `${p.stock} restant(s)`}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 italic text-gray-500">Les lots en cours seront affichés ici.</p>
          )}
          <p className="mt-3">Les lots ne sont ni échangeables, ni remboursables, ni convertibles en espèces.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">4. Utilisation des gains</h2>
          <p>Chaque gain se matérialise par un code cadeau unique, à présenter en caisse. Valable [durée], sur présentation du code.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">5. Données personnelles</h2>
          <p>Les données collectées sont utilisées uniquement pour le fonctionnement du jeu et, avec votre accord, pour de futures communications. Voir la politique de confidentialité.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">6. Litiges</h2>
          <p>La participation implique l&apos;acceptation intégrale du présent règlement. Toute contestation sera examinée par l&apos;organisateur, dont la décision est souveraine.</p>
        </section>
      </div>
      <p className="mt-8 text-sm"><a href="/" className="text-brand-600 hover:underline">← Retour à l&apos;accueil</a></p>
    </main>
  );
}
