-- Jeux unifiés : disponibilité des lots par jeu (stock commun) + rattachement participants
ALTER TABLE "Prize" ADD COLUMN "inWheel" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Prize" ADD COLUMN "inRaffle" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RaffleEntry" ADD COLUMN "gameType" TEXT NOT NULL DEFAULT 'tirage';
CREATE INDEX "Prize_companyId_inWheel_idx" ON "Prize"("companyId", "inWheel");
CREATE INDEX "Prize_companyId_inRaffle_idx" ON "Prize"("companyId", "inRaffle");
