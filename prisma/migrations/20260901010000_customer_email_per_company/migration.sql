-- Unicité de l'e-mail client PAR entreprise (au lieu de globale)
DROP INDEX IF EXISTS "Customer_email_key";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_email_key";
CREATE UNIQUE INDEX "Customer_companyId_email_key" ON "Customer"("companyId", "email");
