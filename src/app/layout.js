import './globals.css';
import { cookies } from 'next/headers';
import LangProvider from '@/components/LangProvider';
import SwRegister from '@/components/SwRegister';
import { getLangFromCookies, isRtl } from '@/i18n';

export const metadata = {
  title: 'AvisFlow — Transformez vos clients en clients fidèles',
  description: 'Engagez vos clients avec des jeux, récompenses et QR codes. Obtenez plus d’avis et encouragez vos clients à revenir.',
  manifest: '/manifest.json',
};

// Anti-FOUC thème + langue : appliqués avant le premier rendu.
const themeInit = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }) {
  // Langue : cookie utilisateur (sélecteur) — le layout miroite en RTL pour l'arabe
  const store = cookies();
  const lang = store.get('lang')?.value || 'fr';
  const dir = isRtl(lang) ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <meta name="theme-color" content="#db2777" />
        {lang === 'ar' && (
          <link rel="preconnect" href="https://fonts.googleapis.com" />
        )}
      </head>
      <body className={lang === 'ar' ? 'font-arabic' : ''}>
        <LangProvider lang={lang}>{children}</LangProvider>
        <SwRegister />
      </body>
    </html>
  );
}
