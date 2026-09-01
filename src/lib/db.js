import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const db =
  globalForPrisma.__prisma || new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = db;

export async function getSetting(key, fallback = null) {
  const row = await db.setting.findUnique({ where: { key } });
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

// Réglages isolés par entreprise (roue, avis Google, textes du jeu)
export async function getCompanySetting(companyId, key, fallback = null) {
  if (!companyId) return getSetting(key, fallback);
  const row = await db.companySetting.findUnique({
    where: { companyId_key: { companyId, key } },
  });
  return row ? row.value : getSetting(key, fallback);
}

export async function setCompanySetting(companyId, key, value) {
  await db.companySetting.upsert({
    where: { companyId_key: { companyId, key } },
    update: { value },
    create: { companyId, key, value },
  });
}

export async function getCompanySettings(companyId) {
  if (!companyId) return {};
  const rows = await db.companySetting.findMany({ where: { companyId } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

