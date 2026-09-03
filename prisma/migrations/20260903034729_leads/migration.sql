-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postalCode" TEXT,
    "jobType" TEXT,
    "message" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'PLANNING',
    "source" TEXT NOT NULL DEFAULT 'PROFILE',
    "path" TEXT,
    "referrer" TEXT,
    "device" TEXT,
    "ipHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "valueCents" INTEGER,
    "ownerReadAt" DATETIME,
    "emailedAt" DATETIME,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessDailyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "websiteClicks" INTEGER NOT NULL DEFAULT 0,
    "phoneClicks" INTEGER NOT NULL DEFAULT 0,
    "quoteClicks" INTEGER NOT NULL DEFAULT 0,
    "directionsClicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BusinessDailyStat_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BusinessDailyStat" ("businessId", "date", "directionsClicks", "id", "impressions", "phoneClicks", "profileViews", "quoteClicks", "websiteClicks") SELECT "businessId", "date", "directionsClicks", "id", "impressions", "phoneClicks", "profileViews", "quoteClicks", "websiteClicks" FROM "BusinessDailyStat";
DROP TABLE "BusinessDailyStat";
ALTER TABLE "new_BusinessDailyStat" RENAME TO "BusinessDailyStat";
CREATE INDEX "BusinessDailyStat_date_idx" ON "BusinessDailyStat"("date");
CREATE UNIQUE INDEX "BusinessDailyStat_businessId_date_key" ON "BusinessDailyStat"("businessId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Lead_businessId_createdAt_idx" ON "Lead"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_ipHash_createdAt_idx" ON "Lead"("ipHash", "createdAt");
