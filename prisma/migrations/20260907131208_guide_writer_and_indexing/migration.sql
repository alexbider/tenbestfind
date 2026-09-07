-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'GUIDE',
    "guideType" TEXT,
    "system" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-opus-5',
    "effort" TEXT NOT NULL DEFAULT 'high',
    "wordTarget" INTEGER NOT NULL DEFAULT 1400,
    "skills" TEXT,
    "options" TEXT,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuideJob" (
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
    "research" TEXT,
    "draft" TEXT,
    "guideId" TEXT,
    "error" TEXT,
    "hint" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "researchCalls" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuideJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuideJob_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IndexRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'GOOGLE',
    "action" TEXT NOT NULL DEFAULT 'URL_UPDATED',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "response" TEXT,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EDITORIAL',
    "categoryId" TEXT,
    "excerpt" TEXT,
    "shortAnswer" TEXT,
    "bottomLine" TEXT,
    "keyTakeaways" TEXT,
    "body" TEXT,
    "heroImage" TEXT,
    "readingMinutes" INTEGER NOT NULL DEFAULT 9,
    "typicalLow" INTEGER,
    "typicalHigh" INTEGER,
    "unitLow" INTEGER,
    "unitHigh" INTEGER,
    "unitLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "reviewedAt" DATETIME,
    "authorId" TEXT,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "countryId" TEXT,
    "regionId" TEXT,
    "cityId" TEXT,
    CONSTRAINT "Guide_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guide_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guide_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guide_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guide_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guide" ("authorId", "body", "bottomLine", "categoryId", "createdAt", "excerpt", "heroImage", "id", "keyTakeaways", "publishedAt", "readingMinutes", "reviewedAt", "reviewerId", "shortAnswer", "slug", "status", "title", "type", "typicalHigh", "typicalLow", "unitHigh", "unitLabel", "unitLow", "updatedAt") SELECT "authorId", "body", "bottomLine", "categoryId", "createdAt", "excerpt", "heroImage", "id", "keyTakeaways", "publishedAt", "readingMinutes", "reviewedAt", "reviewerId", "shortAnswer", "slug", "status", "title", "type", "typicalHigh", "typicalLow", "unitHigh", "unitLabel", "unitLow", "updatedAt" FROM "Guide";
DROP TABLE "Guide";
ALTER TABLE "new_Guide" RENAME TO "Guide";
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");
CREATE INDEX "Guide_status_publishedAt_idx" ON "Guide"("status", "publishedAt");
CREATE INDEX "Guide_type_idx" ON "Guide"("type");
CREATE INDEX "Guide_cityId_idx" ON "Guide"("cityId");
CREATE INDEX "Guide_regionId_idx" ON "Guide"("regionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_slug_key" ON "PromptTemplate"("slug");

-- CreateIndex
CREATE INDEX "PromptTemplate_kind_archived_idx" ON "PromptTemplate"("kind", "archived");

-- CreateIndex
CREATE INDEX "GuideJob_status_createdAt_idx" ON "GuideJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IndexRequest_status_createdAt_idx" ON "IndexRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IndexRequest_url_idx" ON "IndexRequest"("url");
