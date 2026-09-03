-- AlterTable
ALTER TABLE "Credential" ADD COLUMN "imageUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cityId" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "editorialTake" TEXT,
    "bestFor" TEXT,
    "strengths" TEXT,
    "considerations" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "postalCode" TEXT,
    "hours" TEXT,
    "yearFounded" INTEGER,
    "employeeCount" TEXT,
    "licenseNumber" TEXT,
    "warrantyTerms" TEXT,
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "financing" BOOLEAN NOT NULL DEFAULT false,
    "freeEstimates" BOOLEAN NOT NULL DEFAULT false,
    "insured" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethods" TEXT,
    "awards" TEXT,
    "brands" TEXT,
    "placeId" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "gmbRank" INTEGER,
    "gmbQuery" TEXT,
    "emailSource" TEXT,
    "importedAt" DATETIME,
    "googleRating" REAL,
    "googleReviewCount" INTEGER,
    "googleDataUpdated" DATETIME,
    "googleDistribution" TEXT,
    "reviewsUpdatedAt" DATETIME,
    "overview" TEXT,
    "socialLinks" TEXT,
    "siteCrawledAt" DATETIME,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Business_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Business_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("addressLine", "bestFor", "categoryId", "cityId", "claimed", "considerations", "createdAt", "description", "editorialTake", "email", "emailSource", "emergency", "employeeCount", "financing", "freeEstimates", "gmbQuery", "gmbRank", "googleDataUpdated", "googleDistribution", "googleRating", "googleReviewCount", "hours", "id", "importedAt", "latitude", "licenseNumber", "logoUrl", "longitude", "name", "overview", "ownerId", "phone", "placeId", "postalCode", "publishedAt", "reviewsUpdatedAt", "siteCrawledAt", "slug", "socialLinks", "status", "strengths", "stripeCustomerId", "submittedAt", "tagline", "updatedAt", "verified", "warrantyTerms", "website", "yearFounded") SELECT "addressLine", "bestFor", "categoryId", "cityId", "claimed", "considerations", "createdAt", "description", "editorialTake", "email", "emailSource", "emergency", "employeeCount", "financing", "freeEstimates", "gmbQuery", "gmbRank", "googleDataUpdated", "googleDistribution", "googleRating", "googleReviewCount", "hours", "id", "importedAt", "latitude", "licenseNumber", "logoUrl", "longitude", "name", "overview", "ownerId", "phone", "placeId", "postalCode", "publishedAt", "reviewsUpdatedAt", "siteCrawledAt", "slug", "socialLinks", "status", "strengths", "stripeCustomerId", "submittedAt", "tagline", "updatedAt", "verified", "warrantyTerms", "website", "yearFounded" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE UNIQUE INDEX "Business_placeId_key" ON "Business"("placeId");
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");
CREATE INDEX "Business_categoryId_status_idx" ON "Business"("categoryId", "status");
CREATE INDEX "Business_cityId_status_idx" ON "Business"("cityId", "status");
CREATE INDEX "Business_status_idx" ON "Business"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
