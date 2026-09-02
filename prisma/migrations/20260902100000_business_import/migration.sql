-- AlterTable
ALTER TABLE "Business" ADD COLUMN "emailSource" TEXT;
ALTER TABLE "Business" ADD COLUMN "gmbQuery" TEXT;
ALTER TABLE "Business" ADD COLUMN "gmbRank" INTEGER;
ALTER TABLE "Business" ADD COLUMN "importedAt" DATETIME;
ALTER TABLE "Business" ADD COLUMN "latitude" REAL;
ALTER TABLE "Business" ADD COLUMN "longitude" REAL;
ALTER TABLE "Business" ADD COLUMN "placeId" TEXT;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "categoryId" TEXT NOT NULL,
    "cityIds" TEXT NOT NULL,
    "perCity" INTEGER NOT NULL DEFAULT 20,
    "minRating" REAL,
    "minReviews" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "autoPublishScore" INTEGER NOT NULL DEFAULT 90,
    "buildRanking" BOOLEAN NOT NULL DEFAULT true,
    "rankingSize" INTEGER NOT NULL DEFAULT 10,
    "found" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "written" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "apifyRunId" TEXT,
    "error" TEXT,
    "note" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportBatch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "cityId" TEXT,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FOUND',
    "reason" TEXT,
    "gmbRank" INTEGER,
    "rating" REAL,
    "reviewCount" INTEGER,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "emailSource" TEXT,
    "addressLine" TEXT,
    "raw" TEXT,
    "draft" TEXT,
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportItem_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationSecret" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "cipher" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "label" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "rankingId" TEXT,
    "guideId" TEXT,
    "countryId" TEXT,
    "pageId" TEXT,
    "businessId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Faq_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Faq" ("answer", "countryId", "guideId", "id", "pageId", "question", "rankingId", "scope", "sortOrder") SELECT "answer", "countryId", "guideId", "id", "pageId", "question", "rankingId", "scope", "sortOrder" FROM "Faq";
DROP TABLE "Faq";
ALTER TABLE "new_Faq" RENAME TO "Faq";
CREATE INDEX "Faq_scope_sortOrder_idx" ON "Faq"("scope", "sortOrder");
CREATE INDEX "Faq_businessId_sortOrder_idx" ON "Faq"("businessId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportItem_batchId_status_idx" ON "ImportItem"("batchId", "status");

-- CreateIndex
CREATE INDEX "ImportItem_placeId_idx" ON "ImportItem"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportItem_batchId_placeId_key" ON "ImportItem"("batchId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_placeId_key" ON "Business"("placeId");

