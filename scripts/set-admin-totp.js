/* eslint-disable no-console */
// Provisionne (ou réinitialise) le secret TOTP d'un compte admin.
// Usage :  DATABASE_URL="postgresql://..." node scripts/set-admin-totp.js [email-admin]
// Sans email fourni : utilise le premier admin trouvé.
// Génère un QR (admin-totp-qr.png) à scanner avec Google Authenticator / Authy,
// affiche le secret et un code valide immédiatement.
const { PrismaClient } = require('@prisma/client');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const path = require('path');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Erreur : renseignez DATABASE_URL (postgresql://...)');
    process.exit(1);
  }
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

  const emailArg = process.argv[2];
  let admin = emailArg
    ? await prisma.admin.findUnique({ where: { email: emailArg.toLowerCase() } })
    : await prisma.admin.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!admin && emailArg) {
    const all = await prisma.admin.findMany({ select: { email: true } });
    console.error(`Admin "${emailArg}" introuvable. Admins existants : ${all.map((a) => a.email).join(', ') || 'aucun'}`);
    process.exit(1);
  }
  if (!admin) { console.error('Aucun admin en base. Lancez d\'abord le seed.'); process.exit(1); }

  const secret = authenticator.generateSecret();
  await prisma.admin.update({ where: { id: admin.id }, data: { totpSecret: secret } });

  const appUrl = process.env.APP_URL || 'https://avisflow.vercel.app';
  const otpauth = authenticator.keyuri(admin.email, 'AvisFlow Backoffice', secret);
  const qrPath = path.join(process.cwd(), 'admin-totp-qr.png');
  await QRCode.toFile(qrPath, otpauth, { width: 512, margin: 2 });

  console.log(`\n✅ TOTP configuré pour : ${admin.email}`);
  console.log(`📱 QR code à scanner : ${qrPath}`);
  console.log(`   (ou saisissez ce secret manuellement dans l'app : ${secret})`);
  console.log(`🔗 URI otpauth : ${otpauth}`);
  console.log(`\n⏱ Code valide MAINTENANT (30 s) : ${authenticator.generate(secret)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
