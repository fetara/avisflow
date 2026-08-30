import nodemailer from 'nodemailer';

const FROM = process.env.MAIL_FROM || 'Avis & Roue <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Transport : Resend (HTTP) si clé présente, sinon SMTP (Brevo), sinon mode démo (log console).
async function sendViaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
}

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail(to, subject, html) {
  if (process.env.DEMO_MODE === 'true' || (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST)) {
    console.log(`[DEMO MAIL] to=${to} subject=${subject}`);
    return;
  }
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(to, subject, html);
    } else {
      await smtpTransport().sendMail({ from: FROM, to, subject, html });
    }
  } catch (err) {
    // Fallback croisé Resend -> SMTP
    if (process.env.RESEND_API_KEY && process.env.SMTP_HOST) {
      await smtpTransport().sendMail({ from: FROM, to, subject, html });
    } else {
      throw err;
    }
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
  await sendMail(
    to,
    'Validez votre compte administrateur',
    layout('Validation requise', `<p>Bienvenue ! Cliquez pour valider votre compte (lien valable 24h) :</p>
      <p><a href="${link}" style="background:#db2777;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Valider mon compte</a></p>`)
  );
}

export async function sendLoginCode(to, code) {
  await sendMail(
    to,
    `Votre code de connexion : ${code}`,
    layout('Connexion backoffice', `<p>Votre code à 6 chiffres (valide 10 minutes) :</p>
      <p style="font-size:28px;letter-spacing:8px;font-weight:bold">${code}</p>`)
  );
}

export { APP_URL };
