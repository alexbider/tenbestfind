-- AlterTable
ALTER TABLE "Business" ADD COLUMN "overview" TEXT;
ALTER TABLE "Business" ADD COLUMN "reviewsUpdatedAt" DATETIME;
ALTER TABLE "Business" ADD COLUMN "siteCrawledAt" DATETIME;
ALTER TABLE "Business" ADD COLUMN "socialLinks" TEXT;

-- AlterTable
ALTER TABLE "ImportItem" ADD COLUMN "site" TEXT;

-- CreateTable
CREATE TABLE "ReviewRefresh" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "businessIds" TEXT NOT NULL,
    "maxReviews" INTEGER NOT NULL DEFAULT 10,
    "requested" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "apifyRunId" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "ReviewRefresh_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GOOGLE',
    "externalId" TEXT,
    "author" TEXT NOT NULL,
    "authorPhoto" TEXT,
    "rating" REAL NOT NULL,
    "body" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "sourceUrl" TEXT,
    "ownerReply" TEXT,
    "ownerRepliedAt" DATETIME,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("author", "body", "businessId", "id", "postedAt", "rating", "source", "sourceUrl") SELECT "author", "body", "businessId", "id", "postedAt", "rating", "source", "sourceUrl" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE INDEX "Review_businessId_postedAt_idx" ON "Review"("businessId", "postedAt");
CREATE UNIQUE INDEX "Review_businessId_source_externalId_key" ON "Review"("businessId", "source", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReviewRefresh_status_createdAt_idx" ON "ReviewRefresh"("status", "createdAt");
