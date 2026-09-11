-- Slug de QR unique PAR entreprise (deux entreprises peuvent avoir « promo »)
-- + visibilité publique des entreprises sur la vitrine.
--
-- PRÉ-REQUIS (vérification avant application) : aucun doublon (companyId, slug) :
--   SELECT "companyId", "slug", COUNT(*) FROM "QrCode"
--   GROUP BY "companyId", "slug" HAVING COUNT(*) > 1;
-- (Les slugs étant globalement uniques aujourd'hui, aucun doublon n'est possible.)
--
-- NB : les QR hérités sans entreprise (companyId NULL) restent tolérés plusieurs
-- fois par PostgreSQL (NULLs distincts) ; le routage legacy /r/{slug} prend alors
-- le plus récent.

DROP INDEX IF EXISTS "QrCode_slug_key";
ALTER TABLE "QrCode" DROP CONSTRAINT IF EXISTS "QrCode_slug_key";
CREATE UNIQUE INDEX "QrCode_companyId_slug_key" ON "QrCode"("companyId", "slug");

ALTER TABLE "Company" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
