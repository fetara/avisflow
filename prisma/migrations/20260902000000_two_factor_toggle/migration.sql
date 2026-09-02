-- 2FA : toggle au niveau utilisateur (Admin) et entreprise (Company)
ALTER TABLE "Admin" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Index de scopage (défense en profondeur pour les requêtes par entreprise)
CREATE INDEX IF NOT EXISTS "Spin_customerId_idx" ON "Spin"("customerId");
CREATE INDEX IF NOT EXISTS "Review_customerId_idx" ON "Review"("customerId");
CREATE INDEX IF NOT EXISTS "QrScan_qrCodeId_idx" ON "QrScan"("qrCodeId");
