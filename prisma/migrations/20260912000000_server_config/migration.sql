-- Configuration applicative persistante (survit aux déploiements)
CREATE TABLE "ServerConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ServerConfig_pkey" PRIMARY KEY ("key")
);
