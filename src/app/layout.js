import './globals.css';

export const metadata = {
  title: 'Avis & Roue de la Chance',
  description: 'Scannez, jouez et laissez votre avis !',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
