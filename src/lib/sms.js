import { db, setSetting, getSetting } from '@/lib/db';
import crypto from 'crypto';
import { decrypt } from '@/lib/crypto';

// ---------- Service SMS (abstraction provider, phase 3 de la roadmap marketing) ----------
// Provider actuel : OVH SMS (France). L'interface permet d'ajouter Twilio/Vonage
// plus tard sans réécrire l'application. Les clés sont chiffrées en base (AES-GCM).

const KEYS = ['SMS_OVH_APP_KEY', 'SMS_OVH_APP_SECRET', 'SMS_OVH_CONSUMER_KEY', 'SMS_OVH_SERVICE', 'SMS_SENDER'];

export async function getSmsConfig() {
  const rows = await db.setting.findMany({ where: { key: { in: KEYS } } });
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const enabledPlatform = (await getSetting('SMS_ENABLED', 'true')) === 'true';
  const cfg = {
    provider: 'ovh',
    appKey: decrypt(stored.SMS_OVH_APP_KEY || ''),
    appSecret: decrypt(stored.SMS_OVH_APP_SECRET || ''),
    consumerKey: decrypt(stored.SMS_OVH_CONSUMER_KEY || ''),
    service: stored.SMS_OVH_SERVICE || '',
    sender: stored.SMS_SENDER || '',
    enabledPlatform,
    configured: Boolean(stored.SMS_OVH_APP_KEY && stored.SMS_OVH_APP_SECRET && stored.SMS_OVH_CONSUMER_KEY && stored.SMS_OVH_SERVICE),
  };
  return cfg;
}

// Valeurs masquées pour l'affichage super admin.
export function maskConfig(cfg) {
  return {
    provider: cfg.provider,
    sender: cfg.sender,
    enabledPlatform: cfg.enabledPlatform,
    configured: cfg.configured,
    masked: {
      appKey: maskSecret(cfg.appKey),
      appSecret: maskSecret(cfg.appSecret),
      consumerKey: maskSecret(cfg.consumerKey),
      service: cfg.service,
    },
  };
}

export async function saveSmsConfig(values) {
  for (const [k, v] of Object.entries(values)) {
    if (!KEYS.includes(k)) continue;
    if (v === '' || v === '••••••••') continue; // vide = inchangé
    await setSetting(k, String(v).slice(0, 300));
  }
}

// Vérifie qu'une entreprise peut envoyer des SMS (côté serveur uniquement).
export async function canSendSms(companyId) {
  const cfg = await getSmsConfig();
  if (!cfg.enabledPlatform) return { ok: false, reason: 'Les SMS sont désactivés au niveau de la plateforme.' };
  if (!cfg.configured) return { ok: false, reason: 'Le service SMS n’est pas configuré par la plateforme.' };

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { smsEnabled: true, smsQuotaMonthly: true, name: true },
  });
  if (!company?.smsEnabled) {
    return { ok: false, reason: 'Les SMS sont désactivés pour votre entreprise. Contactez l’administrateur.' };
  }
  if (company.smsQuotaMonthly != null) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const used = await db.campaignRecipient.count({
      where: { status: 'SENT', sentAt: { gte: monthStart }, campaign: { companyId, channel: 'sms' } },
    });
    if (used >= company.smsQuotaMonthly) {
      return { ok: false, reason: `Quota mensuel SMS atteint (${company.smsQuotaMonthly}).` };
    }
  }
  return { ok: true, cfg };
}

// Envoi unitaire via OVH SMS (signature OVH API v1).
export async function sendSmsOvh(cfg, to, message) {
  const method = 'POST';
  const url = `https://eu.api.ovh.com/1.0/sms/${encodeURIComponent(cfg.service)}/jobs`;
  const body = JSON.stringify({
    message,
    receivers: [to],
    sender: cfg.sender || undefined,
    charset: 'UTF-8',
  });
  const ts = await getOvhTimestamp();
  const signature = '$1$' + cryptoSign(cfg.appSecret, cfg.consumerKey, method, url, body, ts);

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Ovh-Application': cfg.appKey,
      'X-Ovh-Consumer': cfg.consumerKey,
      'X-Ovh-Timestamp': String(ts),
      'X-Ovh-Signature': signature,
    },
    body,
  });
  if (!res.ok) throw new Error(`OVH SMS: ${await res.text()}`);
  return res.json();
}

function cryptoSign(secret, consumerKey, method, url, body, timestamp) {
  return crypto.createHash('sha1')
    .update([secret, consumerKey, method, url, body, timestamp].join('+'))
    .digest('hex');
}

async function getOvhTimestamp() {
  try {
    const res = await fetch('https://eu.api.ovh.com/1.0/auth/time', { method: 'GET' });
    return Number(await res.text());
  } catch {
    return Math.floor(Date.now() / 1000); // repli : horloge locale
  }
}
