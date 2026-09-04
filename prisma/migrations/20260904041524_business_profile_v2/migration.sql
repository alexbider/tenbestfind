-- AlterTable
ALTER TABLE "Business" ADD COLUMN "factGroups" TEXT;
ALTER TABLE "Business" ADD COLUMN "serviceRadiusKm" INTEGER;
ALTER TABLE "Business" ADD COLUMN "youtubeChannel" TEXT;

-- AlterTable
ALTER TABLE "RankingEntry" ADD COLUMN "criteria" TEXT;
ALTER TABLE "RankingEntry" ADD COLUMN "heldSince" DATETIME;

-- CreateTable
CREATE TABLE "BusinessVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meta" TEXT,
    "duration" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BusinessVideo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BusinessVideo_businessId_idx" ON "BusinessVideo"("businessId");
