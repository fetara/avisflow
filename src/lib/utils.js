import crypto from 'crypto';

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashIp(ip) {
  const secret = process.env.IP_HASH_SECRET || 'dev-secret';
  return sha256(`${secret}:${ip}`);
}

export function giftCode(prefix = 'GIFT') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[crypto.randomInt(chars.length)];
  return `${prefix}-${code}`;
}

export function slugify(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60) || randomToken(4);
}

export function getClientIp(req) {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    '0.0.0.0'
  );
}
