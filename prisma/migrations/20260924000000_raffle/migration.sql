-- Tirage au sort : tirages, participants, gagnants (historique par run)
CREATE TABLE "RaffleDraw" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "winnersCount" INTEGER NOT NULL DEFAULT 1,
    "prizes" JSONB,
    "excludePastWinners" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "seed" TEXT,
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RaffleDraw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaffleEntry" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT NOT NULL DEFAULT 'onsite',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RaffleEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaffleWinner" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "run" INTEGER NOT NULL DEFAULT 1,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "prize" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "RaffleEntry_drawId_email_key" ON "RaffleEntry"("drawId", "email");
CREATE INDEX "RaffleDraw_companyId_status_idx" ON "RaffleDraw"("companyId", "status");
CREATE INDEX "RaffleWinner_drawId_run_rank_idx" ON "RaffleWinner"("drawId", "run", "rank");

ALTER TABLE "RaffleDraw" ADD CONSTRAINT "RaffleDraw_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "RaffleDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaffleWinner" ADD CONSTRAINT "RaffleWinner_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "RaffleDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
