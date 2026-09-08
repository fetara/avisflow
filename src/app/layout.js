import './globals.css';
import SwRegister from '@/components/SwRegister';

export const metadata = {
  title: 'Avis & Roue de la Chance',
  description: 'Scannez, jouez et laissez votre avis !',
  manifest: '/manifest.json',
};

// Anti-FOUC : applique le thème mémorisé (ou préférence système) avant le premier rendu.
const themeInit = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <meta name="theme-color" content="#db2777" />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
