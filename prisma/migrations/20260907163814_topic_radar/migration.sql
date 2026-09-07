-- CreateTable
CREATE TABLE "TopicPlan" (
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

-- CreateTable
CREATE TABLE "TopicIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "keyword" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "angle" TEXT,
    "outline" TEXT,
    "guideType" TEXT NOT NULL DEFAULT 'HOW_TO_CHOOSE',
    "categoryId" TEXT,
    "countryId" TEXT,
    "regionId" TEXT,
    "cityId" TEXT,
    "volume" INTEGER,
    "aiVolume" INTEGER,
    "difficulty" INTEGER,
    "intent" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" TEXT,
    "ourRank" INTEGER,
    "evidence" TEXT,
    "jobId" TEXT,
    "guideId" TEXT,
    "snoozedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopicIdea_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TopicPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicIdea_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopicIdea_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopicIdea_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopicIdea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopicIdea_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GuideJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeywordMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'United States',
    "volume" INTEGER,
    "cpc" REAL,
    "competition" REAL,
    "difficulty" INTEGER,
    "intent" TEXT,
    "intentScore" REAL,
    "aiVolume" INTEGER,
    "trend" TEXT,
    "ourRank" INTEGER,
    "ourUrl" TEXT,
    "pricedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rankedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TopicPlan_status_createdAt_idx" ON "TopicPlan"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TopicPlan_weekOf_idx" ON "TopicPlan"("weekOf");

-- CreateIndex
CREATE INDEX "TopicIdea_planId_rank_idx" ON "TopicIdea"("planId", "rank");

-- CreateIndex
CREATE INDEX "TopicIdea_status_createdAt_idx" ON "TopicIdea"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TopicIdea_keyword_idx" ON "TopicIdea"("keyword");

-- CreateIndex
CREATE INDEX "KeywordMetric_pricedAt_idx" ON "KeywordMetric"("pricedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordMetric_keyword_market_key" ON "KeywordMetric"("keyword", "market");
