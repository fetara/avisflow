/* eslint-disable no-console */
// Seed : compte admin de démo, lots de la roue, réglages, 3 QR codes de démonstration.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Admin créé : ${email} / ${password}`);

  const prizes = [
    { label: 'Bon d\u2019achat 10€', weight: 1, stock: 20, sortOrder: 1 },
    { label: 'Boisson offerte', weight: 3, stock: 100, sortOrder: 2 },
    { label: 'Réduction 20%', weight: 4, stock: null, sortOrder: 3 },
    { label: 'Rejouez demain !', weight: 6, stock: null, sortOrder: 4 },
    { label: 'Gâteau offert', weight: 2, stock: 50, sortOrder: 5 },
    { label: 'Jackpot : lot surprise', weight: 1, stock: 5, sortOrder: 6 },
  ];
  for (const p of prizes) {
    await prisma.prize.upsert({
      where: { id: `seed-prize-${p.sortOrder}` },
      update: p,
      create: { id: `seed-prize-${p.sortOrder}`, ...p },
    });
  }
  console.log('Lots créés :', prizes.length);

  const settings = {
    GOOGLE_REVIEW_URL: process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/VOTRE-ETABLISSEMENT/review',
    AUTO_APPROVE_MIN_RATING: '4',
    GAME_HEADLINE: 'Scannez, jouez, gagnez !',
    GAME_SUB: 'Tentez de gagner un cadeau et laissez-nous votre avis.',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const demoQrs = [
    { label: 'Caisse 1', slug: 'caisse-1' },
    { label: 'Comptoir', slug: 'comptoir' },
    { label: 'Opération Noël', slug: 'operation-noel', expiresAt: new Date('2027-01-15') },
  ];
  for (const q of demoQrs) {
    await prisma.qrCode.upsert({
      where: { slug: q.slug },
      update: {},
      create: { ...q, createdBy: admin.id },
    });
  }
  console.log('QR codes de démo créés :', demoQrs.map((q) => `/r/${q.slug}`).join(', '));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
