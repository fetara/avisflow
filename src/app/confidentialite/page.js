export const metadata = { title: 'Politique de confidentialité' };

export default function Confidentialite() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Politique de confidentialité (RGPD)</h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="font-bold text-gray-900">Données collectées</h2>
          <p>Lors de votre participation, nous collectons : prénom, nom, e-mail, téléphone (facultatif), l&apos;horodatage de votre consentement, le point de contact (QR code scanné), vos éventuels avis et votre résultat au jeu. Votre adresse IP est uniquement conservée sous forme <strong>hachée</strong> à des fins de protection contre les abus.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Finalités et base légale</h2>
          <p>Les données servent au fonctionnement du jeu (attribution des gains, prévention de la fraude) et à l&apos;amélioration de notre service (statistiques anonymisées par emplacement). Le consentement horodaté constitue la base légale du traitement.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Durée de conservation</h2>
          <p>Les données de participation sont conservées 3 ans après le dernier contact, sauf exercice de vos droits avant cette échéance.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Vos droits</h2>
          <p>Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement (droit à l&apos;oubli), de portabilité et d&apos;opposition. Adressez votre demande en boutique ou par e-mail : nous traiterons votre demande sous 30 jours. Les demandes d&apos;effacement entraînent l&apos;anonymisation irréversible de vos données.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Sous-traitants</h2>
          <p>Nos e-mails transitent par un prestataire d&apos;envoi d&apos;e-mails transactionnels (Resend ou Brevo). Aucune donnée n&apos;est vendue ni cédée à des tiers à des fins commerciales.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Cookies</h2>
          <p>Le site utilise uniquement des cookies techniques strictement nécessaires (session de jeu, source du QR code). Aucun cookie publicitaire ni traceur tiers.</p>
        </section>
      </div>
      <p className="mt-8 text-sm"><a href="/" className="text-brand-600 hover:underline">← Retour à l&apos;accueil</a></p>
    </main>
  );
}
