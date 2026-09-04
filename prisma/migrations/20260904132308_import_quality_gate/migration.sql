-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "categoryId" TEXT NOT NULL,
    "cityIds" TEXT NOT NULL,
    "perCity" INTEGER NOT NULL DEFAULT 20,
    "minRating" REAL,
    "minReviews" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "requireWebsite" BOOLEAN NOT NULL DEFAULT true,
    "requireLiveSite" BOOLEAN NOT NULL DEFAULT true,
    "requireEmail" BOOLEAN NOT NULL DEFAULT true,
    "autoPublishScore" INTEGER NOT NULL DEFAULT 90,
    "buildRanking" BOOLEAN NOT NULL DEFAULT true,
    "rankingSize" INTEGER NOT NULL DEFAULT 10,
    "found" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_ImportBatch" ("apifyRunId", "autoPublishScore", "buildRanking", "categoryId", "cityIds", "createdAt", "createdById", "duplicates", "error", "failed", "finishedAt", "found", "id", "language", "minRating", "minReviews", "name", "note", "perCity", "published", "rankingSize", "startedAt", "status", "updatedAt", "written") SELECT "apifyRunId", "autoPublishScore", "buildRanking", "categoryId", "cityIds", "createdAt", "createdById", "duplicates", "error", "failed", "finishedAt", "found", "id", "language", "minRating", "minReviews", "name", "note", "perCity", "published", "rankingSize", "startedAt", "status", "updatedAt", "written" FROM "ImportBatch";
DROP TABLE "ImportBatch";
ALTER TABLE "new_ImportBatch" RENAME TO "ImportBatch";
CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
