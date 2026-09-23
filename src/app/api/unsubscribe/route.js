import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Désinscription publique (lien en bas de chaque campagne) :
// enregistre le refus marketing du client. Aucune donnée personnelle affichée.
export async function GET(req) {
  const customerId = new URL(req.url).searchParams.get('c');
  if (customerId) {
    await db.customer.update({
      where: { id: customerId },
      data: { emailMarketingConsent: false, emailOptedOutAt: new Date() },
    }).catch(() => {});
  }
  return new NextResponse(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Désinscription confirmée</title>
     <style>body{font-family:system-ui,sans-serif;background:#111827;color:#f9fafb;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center}main{padding:24px}h1{font-size:1.4rem}p{color:#9ca3af}</style>
     </head><body><main><div style="font-size:3rem">✅</div>
     <h1>Désinscription confirmée</h1>
     <p>Vous ne recevrez plus d’e-mails marketing. Votre participation aux jeux reste inchangée.</p>
     </main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
