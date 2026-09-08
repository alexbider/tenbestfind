-- AlterTable
ALTER TABLE "Category" ADD COLUMN "body" TEXT;

-- AlterTable
ALTER TABLE "City" ADD COLUMN "body" TEXT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN "body" TEXT;

-- AlterTable
ALTER TABLE "Subservice" ADD COLUMN "body" TEXT;

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
    "categoryId" TEXT,
    "subserviceId" TEXT,
    "regionId" TEXT,
    "cityId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Faq_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_subserviceId_fkey" FOREIGN KEY ("subserviceId") REFERENCES "Subservice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Faq_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Faq" ("answer", "businessId", "countryId", "guideId", "id", "pageId", "question", "rankingId", "scope", "sortOrder") SELECT "answer", "businessId", "countryId", "guideId", "id", "pageId", "question", "rankingId", "scope", "sortOrder" FROM "Faq";
DROP TABLE "Faq";
ALTER TABLE "new_Faq" RENAME TO "Faq";
CREATE INDEX "Faq_scope_sortOrder_idx" ON "Faq"("scope", "sortOrder");
CREATE INDEX "Faq_businessId_sortOrder_idx" ON "Faq"("businessId", "sortOrder");
CREATE INDEX "Faq_categoryId_sortOrder_idx" ON "Faq"("categoryId", "sortOrder");
CREATE INDEX "Faq_subserviceId_sortOrder_idx" ON "Faq"("subserviceId", "sortOrder");
CREATE INDEX "Faq_regionId_sortOrder_idx" ON "Faq"("regionId", "sortOrder");
CREATE INDEX "Faq_cityId_sortOrder_idx" ON "Faq"("cityId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
