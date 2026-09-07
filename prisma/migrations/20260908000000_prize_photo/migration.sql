-- Personnalisation de la roue : illustration par lot (data URL).
-- Les couleurs et l'image de fond de la roue sont stockées dans CompanySetting
-- (clés WHEEL_COLORS / WHEEL_BG_IMAGE), aucune colonne supplémentaire nécessaire.
ALTER TABLE "Prize" ADD COLUMN "photo" TEXT;
