import nodemailer from 'nodemailer';
import { getSetting, getAppUrl } from '@/lib/db';

let APP_URL_CACHE = null;

// Configuration e-mail : lue en priorité depuis la table Setting (modifiable dans
// l'écran super admin), avec repli sur les variables d'environnement d'origine.
async function cfg(key, envVar, fallback = '') {
  const fromDb = await getSetting(key, null);
  if (fromDb !== null && fromDb !== '') return fromDb;
  return process.env[envVar] || fallback;
}

export async function mailConfig() {
  const [provider, resendKey, smtpHost, smtpPort, smtpUser, smtpPass, from, demo] = await Promise.all([
    cfg('MAIL_PROVIDER', 'MAIL_PROVIDER', 'auto'),
    cfg('MAIL_RESEND_API_KEY', 'RESEND_API_KEY'),
    cfg('MAIL_SMTP_HOST', 'SMTP_HOST'),
    cfg('MAIL_SMTP_PORT', 'SMTP_PORT', '587'),
    cfg('MAIL_SMTP_USER', 'SMTP_USER'),
    cfg('MAIL_SMTP_PASS', 'SMTP_PASS'),
    cfg('MAIL_FROM', 'MAIL_FROM', 'Avis & Roue <onboarding@resend.dev>'),
    cfg('MAIL_DEMO_MODE', 'DEMO_MODE'),
  ]);
  const c = {
    provider: provider.trim().toLowerCase(),
    resendKey: resendKey.trim(), smtpHost: smtpHost.trim(), smtpPort: String(smtpPort).trim(),
    smtpUser: smtpUser.trim(), smtpPass: smtpPass.trim(), from: from.trim(), demo,
  };
  // Sélection du transport : le choix explicite (MAIL_PROVIDER) prime sur la détection auto.
  if (c.provider === 'smtp') c.resendKey = '';
  if (c.provider === 'resend') c.smtpHost = '';
  return c;
}

// Transport : Resend (HTTP) si clé présente, sinon SMTP (Brevo), sinon mode démo (log console).
// Renvoie un détail du transport utilisé pour le diagnostic dans l'écran super admin.
async function sendViaResend(cfg, to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: cfg.from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
  const json = await res.json().catch(() => ({}));
  return { transport: 'resend', id: json.id || null };
}

function smtpTransport(cfg) {
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: Number(cfg.smtpPort || 587),
    secure: Number(cfg.smtpPort) === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });
}

// APP_URL persistante (ServerConfig) avec repli env ; résolue à chaque envoi
export async function resolveAppUrl() {
  APP_URL_CACHE = await getAppUrl();
  return APP_URL_CACHE;
}

export async function sendMail(to, subject, html) {
  const c = await mailConfig();
  const demo = c.demo === 'true' || (!c.resendKey && !c.smtpHost);
  if (demo) {
    console.log(`[DEMO MAIL] to=${to} subject=${subject}`);
    return { transport: 'demo' };
  }
  try {
    if (c.resendKey) {
      return await sendViaResend(c, to, subject, html);
    }
    const info = await smtpTransport(c).sendMail({ from: c.from, to, subject, html });
    return { transport: 'smtp', messageId: info.messageId, response: info.response };
  } catch (err) {
    // Fallback croisé Resend -> SMTP (uniquement en sélection auto avec les deux configurés)
    if ((!c.provider || c.provider === 'auto') && c.resendKey && c.smtpHost) {
      const info = await smtpTransport(c).sendMail({ from: c.from, to, subject, html });
      return { transport: 'smtp (fallback Resend)', messageId: info.messageId, response: info.response };
    }
    throw err;
  }
}

function layout(title, body) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#db2777">${title}</h2>
    ${body}
    <p style="color:#888;font-size:12px;margin-top:32px">Cet e-mail est automatique, merci de ne pas y répondre.</p>
  </div>`;
}

export async function sendCustomerValidation(to, firstName, link) {
  await resolveAppUrl();
  await sendMail(
    to,
    'Confirmez votre e-mail pour jouer 🎡',
    layout('Un dernier clic !', `<p>Bonjour ${firstName},</p>
      <p>Cliquez sur le bouton ci-dessous (valide 30 minutes) pour confirmer votre e-mail et lancer la roue de la chance :</p>
      <p><a href="${link}" style="background:#db2777;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Confirmer et jouer</a></p>
      <p style="font-size:12px;color:#888">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`)
  );
}

export async function sendAdminValidation(to, link) {
  await resolveAppUrl();
  await sendMail(
    to,
    'Validez votre compte administrateur',
    layout('Validation requise', `<p>Bienvenue ! Cliquez pour valider votre compte (lien valable 24h) :</p>
      <p><a href="${link}" style="background:#db2777;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Valider mon compte</a></p>`)
  );
}

export async function sendLoginCode(to, code) {
  await resolveAppUrl();
  await sendMail(
    to,
    `Votre code de connexion : ${code}`,
    layout('Connexion backoffice', `<p>Votre code à 6 chiffres (valide 10 minutes) :</p>
      <p style="font-size:28px;letter-spacing:8px;font-weight:bold">${code}</p>`)
  );
}

export { APP_URL_CACHE as APP_URL };

