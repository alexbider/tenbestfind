-- CreateTable
CREATE TABLE "ProviderCooldown" (
    "provider" TEXT NOT NULL PRIMARY KEY,
    "until" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "trippedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProviderCooldown_until_idx" ON "ProviderCooldown"("until");
