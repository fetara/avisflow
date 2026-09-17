-- Système d'abonnements SaaS (plans + historique + activation différée)
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'REJECTED');

CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(65,30),
    "priceYearly" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxQrCodes" INTEGER,
    "maxCustomers" INTEGER,
    "maxSpins" INTEGER,
    "features" JSONB,
    "activationDelayDays" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "activationDelayDays" INTEGER,
    "priceMonthly" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentStatus" TEXT NOT NULL DEFAULT 'MANUAL',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
CREATE INDEX "Subscription_companyId_planId_idx" ON "Subscription"("companyId", "planId");
CREATE INDEX "Subscription_companyId_status_idx" ON "Subscription"("companyId", "status");
CREATE INDEX "Subscription_status_activatedAt_idx" ON "Subscription"("status", "activatedAt");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON UPDATE CASCADE;
