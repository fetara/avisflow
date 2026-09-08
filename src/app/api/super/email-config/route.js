import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, getSetting, setSetting } from '@/lib/db';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';
import { sendMail } from '@/lib/mailer';
import { mailConfig as mailCfg } from '@/lib/mailer';

// Configuration de l'envoi d'e-mails, gérée depuis l'écran super admin.
// Les valeurs sont stockées dans la table Setting (clés MAIL_*) et priment
// sur les variables d'environnement du serveur.

// Champs modifiables. SECRET : masqué en lecture (on ne renvoie jamais la valeur).
const FIELDS = [
  { key: 'MAIL_PROVIDER', label: 'Fournisseur (auto = détection, ou forcer resend / smtp)', secret: false },
  { key: 'MAIL_RESEND_API_KEY', label: 'Clé API Resend', secret: true },
  { key: 'MAIL_SMTP_HOST', label: 'Hôte SMTP', secret: false },
  { key: 'MAIL_SMTP_PORT', label: 'Port SMTP (587 ou 465)', secret: false },
  { key: 'MAIL_SMTP_USER', label: 'Utilisateur SMTP', secret: false },
  { key: 'MAIL_SMTP_PASS', label: 'Mot de passe SMTP', secret: true },
  { key: 'MAIL_FROM', label: 'Expéditeur (ex : Roue <no-reply@mon-site.fr>)', secret: false },
  { key: 'MAIL_DEMO_MODE', label: 'Mode démo (true = e-mails simulés en console)', secret: false },
];
const KEYS = FIELDS.map((f) => f.key);
const SECRET_KEYS = FIELDS.filter((f) => f.secret).map((f) => f.key);

function mask(value) {
  if (!value) return '';
  return value.length <= 4 ? '••••' : `••••••••${value.slice(-4)}`;
}

// État courant : valeurs non secrètes en clair, secrets masqués + flag "configured".
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const rows = await db.setting.findMany({ where: { key: { in: KEYS } } });
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const envFallback = {
    MAIL_PROVIDER: 'auto',
    MAIL_RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_SMTP_HOST: process.env.SMTP_HOST,
    MAIL_SMTP_PORT: process.env.SMTP_PORT,
    MAIL_SMTP_USER: process.env.SMTP_USER,
    MAIL_SMTP_PASS: process.env.SMTP_PASS,
    MAIL_FROM: process.env.MAIL_FROM,
    MAIL_DEMO_MODE: process.env.DEMO_MODE,
  };

  const fields = FIELDS.map(({ key, label, secret }) => {
    const raw = stored[key] ?? envFallback[key] ?? '';
    return {
      key, label, secret,
      value: secret ? mask(raw) : raw,
      configured: Boolean(raw),
      source: stored[key] !== undefined ? 'db' : (envFallback[key] ? 'env' : 'none'),
    };
  });

  return NextResponse.json({ fields });
}

const patchSchema = z.record(z.string()); // { clé de config: valeur }

// Enregistrement. Pour un champ secret : chaîne vide = inchangé, "-" = effacer.
export async function PATCH(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!KEYS.includes(key) || typeof value !== 'string') continue;
    if (SECRET_KEYS.includes(key) && value === '') continue; // inchangé
    if (SECRET_KEYS.includes(key) && value === '••••••••') continue; // masque non modifié
    await setSetting(key, value.slice(0, 500));
  }
  await logAction(guard.admin.id, 'email_config.update', 'Setting');
  return NextResponse.json({ ok: true });
}

// Envoi d'un e-mail de test avec la configuration enregistrée.
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => null);
  const to = body?.to;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Adresse e-mail de test invalide.' }, { status: 400 });
  }

  // Pré-vol : détecter les configurations incomplètes avec des messages actionnables
  const c = await mailCfg();
  if (c.demo) {
    return NextResponse.json({ error: 'Mode démo actif : désactivez-le pour envoyer réellement des e-mails.' }, { status: 400 });
  }
  if (!c.from || !/@/.test(c.from)) {
    return NextResponse.json({ error: 'Expéditeur (MAIL_FROM) manquant ou invalide. Avec Brevo, utilisez une adresse validée dans votre compte Brevo (ex : no-reply@votre-domaine.fr).' }, { status: 400 });
  }
  if (!c.resendKey && c.smtpHost && (!c.smtpUser || !c.smtpPass)) {
    return NextResponse.json({ error: 'Identifiants SMTP incomplets : utilisateur et mot de passe sont requis.' }, { status: 400 });
  }

  try {
    const result = await sendMail(to, '✅ Test de configuration e-mail — Roue de la Chance',
      `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#db2777">Ça marche !</h2>
        <p>Cet e-mail de test (envoyé depuis ${c.from}) confirme que votre configuration d'envoi est opérationnelle.</p>
      </div>`);
    await logAction(guard.admin.id, 'email_config.test', 'Setting', to);
    return NextResponse.json({ ok: true, transport: result?.transport || '?', detail: result || null });
  } catch (e) {
    // Inclure la réponse complète du serveur SMTP (Brevo) pour un diagnostic direct
    const detail = [e.message, e.response, e.responseCode].filter(Boolean).join(' | ');
    return NextResponse.json({ error: `Échec de l'envoi : ${String(detail).slice(0, 400)}` }, { status: 502 });
  }
}
