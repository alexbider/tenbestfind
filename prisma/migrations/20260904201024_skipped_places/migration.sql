-- CreateTable
CREATE TABLE "SkippedPlace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT,
    "host" TEXT,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SkippedPlace_placeId_key" ON "SkippedPlace"("placeId");

-- CreateIndex
CREATE INDEX "SkippedPlace_host_idx" ON "SkippedPlace"("host");
