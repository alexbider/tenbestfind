-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuideJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "topic" TEXT NOT NULL,
    "keyword" TEXT,
    "guideType" TEXT NOT NULL DEFAULT 'HOW_TO_CHOOSE',
    "brief" TEXT,
    "templateId" TEXT,
    "categoryId" TEXT,
    "countryId" TEXT,
    "regionId" TEXT,
    "cityId" TEXT,
    "rewriteOfId" TEXT,
    "research" TEXT,
    "draft" TEXT,
    "guideId" TEXT,
    "error" TEXT,
    "hint" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "researchCalls" INTEGER NOT NULL DEFAULT 0,
    "tells" TEXT,
    "scheduledFor" DATETIME,
    "publishAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuideJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_rewriteOfId_fkey" FOREIGN KEY ("rewriteOfId") REFERENCES "Guide" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GuideJob" ("attempts", "brief", "categoryId", "cityId", "countryId", "createdAt", "draft", "error", "finishedAt", "guideId", "guideType", "hint", "id", "inputTokens", "keyword", "outputTokens", "publishAt", "regionId", "research", "researchCalls", "scheduledFor", "startedAt", "status", "tells", "templateId", "topic", "updatedAt") SELECT "attempts", "brief", "categoryId", "cityId", "countryId", "createdAt", "draft", "error", "finishedAt", "guideId", "guideType", "hint", "id", "inputTokens", "keyword", "outputTokens", "publishAt", "regionId", "research", "researchCalls", "scheduledFor", "startedAt", "status", "tells", "templateId", "topic", "updatedAt" FROM "GuideJob";
DROP TABLE "GuideJob";
ALTER TABLE "new_GuideJob" RENAME TO "GuideJob";
CREATE INDEX "GuideJob_status_createdAt_idx" ON "GuideJob"("status", "createdAt");
CREATE INDEX "GuideJob_status_scheduledFor_idx" ON "GuideJob"("status", "scheduledFor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
