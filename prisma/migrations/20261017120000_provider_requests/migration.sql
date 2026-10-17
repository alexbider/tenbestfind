-- CreateTable
CREATE TABLE "ProviderRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "outcome" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "providerCode" TEXT,
    "latencyMs" INTEGER,
    "retryAttempt" INTEGER NOT NULL DEFAULT 0,
    "retryAfterMs" INTEGER,
    "quotaMetric" TEXT,
    "quotaLimit" INTEGER,
    "quotaRemaining" INTEGER,
    "quotaResetAt" DATETIME,
    "billableUnits" REAL,
    "estCostUsd" REAL,
    "avoided" BOOLEAN NOT NULL DEFAULT false,
    "initiator" TEXT,
    "runId" TEXT,
    "jobId" TEXT,
    "businessId" TEXT,
    "connectionRef" TEXT,
    "fingerprint" TEXT,
    "note" TEXT
);

-- CreateIndex
CREATE INDEX "ProviderRequest_provider_at_idx" ON "ProviderRequest"("provider", "at");

-- CreateIndex
CREATE INDEX "ProviderRequest_outcome_at_idx" ON "ProviderRequest"("outcome", "at");

-- CreateIndex
CREATE INDEX "ProviderRequest_runId_idx" ON "ProviderRequest"("runId");

-- CreateIndex
CREATE INDEX "ProviderRequest_businessId_idx" ON "ProviderRequest"("businessId");

-- CreateIndex
CREATE INDEX "ProviderRequest_at_idx" ON "ProviderRequest"("at");
