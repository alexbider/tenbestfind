/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `inputTokens` on the `GuideJob` table. All the data in the column will be lost.
  - You are about to drop the column `outputTokens` on the `GuideJob` table. All the data in the column will be lost.
  - You are about to drop the column `tells` on the `GuideJob` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Post_status_publishedAt_idx";

-- DropIndex
DROP INDEX "Post_slug_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Post";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "GuideJobEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideJobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GuideJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuideJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
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
    "researchCalls" INTEGER NOT NULL DEFAULT 0,
    "writer" TEXT,
    "notes" TEXT,
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
INSERT INTO "new_GuideJob" ("attempts", "brief", "categoryId", "cityId", "countryId", "createdAt", "draft", "error", "finishedAt", "guideId", "guideType", "hint", "id", "keyword", "publishAt", "regionId", "research", "researchCalls", "rewriteOfId", "scheduledFor", "startedAt", "status", "templateId", "topic", "updatedAt") SELECT "attempts", "brief", "categoryId", "cityId", "countryId", "createdAt", "draft", "error", "finishedAt", "guideId", "guideType", "hint", "id", "keyword", "publishAt", "regionId", "research", "researchCalls", "rewriteOfId", "scheduledFor", "startedAt", "status", "templateId", "topic", "updatedAt" FROM "GuideJob";
DROP TABLE "GuideJob";
ALTER TABLE "new_GuideJob" RENAME TO "GuideJob";
CREATE INDEX "GuideJob_status_createdAt_idx" ON "GuideJob"("status", "createdAt");
CREATE INDEX "GuideJob_status_scheduledFor_idx" ON "GuideJob"("status", "scheduledFor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GuideJobEvent_jobId_at_idx" ON "GuideJobEvent"("jobId", "at");

-- CreateIndex
CREATE INDEX "GuideJobEvent_at_idx" ON "GuideJobEvent"("at");

-- The states of a pipeline become the states of a piece of work. A job that had
-- been researched but not written is now simply waiting for a writer, and one
-- that had a draft on file is waiting for a person to read it.
UPDATE "GuideJob" SET "status" = 'PLANNED'  WHERE "status" = 'QUEUED';
UPDATE "GuideJob" SET "status" = 'BRIEFED'  WHERE "status" = 'WRITING';
UPDATE "GuideJob" SET "status" = 'DRAFTED'  WHERE "status" IN ('POLISHING', 'READY');

-- The blog is gone, so the SEO records that described its posts describe
-- nothing. Guides carry their own.
DELETE FROM "SeoMeta" WHERE "entityType" = 'post';
