export const metadata = { title: 'Mentions légales' };

export default function MentionsLegales() {
  return (
    <main className="prose prose-sm mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Mentions légales</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-700">
        <p><strong>Éditeur du site :</strong> [Nom du commerce], [Adresse], [SIRET], [Téléphone], [E-mail].</p>
        <p><strong>Responsable de la publication :</strong> [Nom du gérant].</p>
        <p><strong>Hébergement :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA — vercel.com.</p>
        <p><strong>Propriété intellectuelle :</strong> l&apos;ensemble des contenus de ce site (textes, visuels, logos) est protégé. Toute reproduction sans autorisation est interdite.</p>
        <p>Pour toute question : contactez-nous en boutique ou par e-mail.</p>
      </div>
      <p className="mt-8 text-sm"><a href="/" className="text-brand-600 hover:underline">← Retour à l&apos;accueil</a></p>
    </main>
  );
}
