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
      role: 'SUPER_ADMIN',
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

// Plans d'abonnement initiaux (upserts : jamais écrasés au redéploiement)
  const plans = [
    { name: 'Starter', slug: 'starter', priceMonthly: 29, maxQrCodes: 1, maxCustomers: 500, maxSpins: null,
      activationDelayDays: 1, sortOrder: 1,
      features: ['QR code', 'Roue personnalisable', 'Récompenses & stocks', 'Avis + modération', 'Statistiques essentielles', 'Export CSV clients'] },
    { name: 'Business', slug: 'business', priceMonthly: 59, maxQrCodes: 10, maxCustomers: 2000, maxSpins: null,
      activationDelayDays: 2, sortOrder: 2,
      features: ['Tout Starter', '10 QR codes', 'Statistiques avancées', 'Gestion des gagnants', 'Campagnes datées', 'Export CSV clients'] },
    { name: 'Premium', slug: 'premium', priceMonthly: 99, maxQrCodes: null, maxCustomers: null, maxSpins: null,
      activationDelayDays: 3, sortOrder: 3,
      features: ['QR codes illimités', 'Clients illimités', 'Statistiques avancées', 'Support prioritaire', 'Multi-établissements'] },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {}, // ne modifie jamais un plan déjà ajusté par le super admin
      create: { ...plan, description: null, priceYearly: null, features: plan.features },
    });
  }
  console.log('Plans d'abonnement initiaux :', plans.length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
