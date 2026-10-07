import crypto from 'crypto';

// Chiffrement AES-256-GCM des secrets (clés API SMS…) avec ENCRYPTION_KEY serveur.
// Format stocké : v1:<iv hex>:<tag hex>:<data hex> — jamais renvoyé au frontend.
const KEY = crypto.createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-only-insecure')
  .digest();

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`;
}

export function decrypt(payload) {
  if (!payload || !payload.startsWith('v1:')) return payload; // valeur en clair historique
  try {
    const [, ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function maskSecret(v) {
  if (!v) return '';
  return v.length <= 6 ? '••••••' : `${v.slice(0, 4)}••••••••${v.slice(-4)}`;
}
