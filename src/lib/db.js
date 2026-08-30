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
