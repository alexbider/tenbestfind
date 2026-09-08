-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TopicPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "weekOf" DATETIME NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "settings" TEXT,
    "target" INTEGER NOT NULL DEFAULT 10,
    "shortlist" TEXT,
    "candidates" INTEGER NOT NULL DEFAULT 0,
    "priced" INTEGER NOT NULL DEFAULT 0,
    "probed" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "cachedHits" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "error" TEXT,
    "hint" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TopicPlan" ("cachedHits", "calls", "candidates", "createdAt", "error", "finishedAt", "hint", "id", "notes", "priced", "probed", "settings", "shortlist", "startedAt", "status", "target", "trigger", "updatedAt", "weekOf") SELECT "cachedHits", "calls", "candidates", "createdAt", "error", "finishedAt", "hint", "id", "notes", "priced", "probed", "settings", "shortlist", "startedAt", "status", "target", "trigger", "updatedAt", "weekOf" FROM "TopicPlan";
DROP TABLE "TopicPlan";
ALTER TABLE "new_TopicPlan" RENAME TO "TopicPlan";
CREATE INDEX "TopicPlan_status_createdAt_idx" ON "TopicPlan"("status", "createdAt");
CREATE INDEX "TopicPlan_weekOf_idx" ON "TopicPlan"("weekOf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
