-- Gestion des gagnants : suivi de remise des lots en magasin
ALTER TABLE "Spin" ADD COLUMN "redeemedAt" TIMESTAMP(3);
ALTER TABLE "Spin" ADD COLUMN "redeemedBy" TEXT;
CREATE INDEX "Spin_redeemedAt_idx" ON "Spin"("redeemedAt");
