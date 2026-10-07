-- i18n : langue par défaut entreprise, langue participant, libellés de lots traduits
ALTER TABLE "Company" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "Prize" ADD COLUMN "labelEn" TEXT;
ALTER TABLE "Prize" ADD COLUMN "labelAr" TEXT;
ALTER TABLE "Customer" ADD COLUMN "locale" TEXT;
