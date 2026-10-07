-- Étape 4 : SMS par entreprise (consentements, quotas) + bons de réduction + canal SMS
ALTER TABLE "Company" ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "smsQuotaMonthly" INTEGER;
ALTER TABLE "Customer" ADD COLUMN "smsConsentAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "smsOptedOutAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'email';

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'percent',
    "value" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_companyId_active_idx" ON "Coupon"("companyId", "active");
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
