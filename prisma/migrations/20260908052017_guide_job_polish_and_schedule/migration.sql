-- AlterTable
ALTER TABLE "GuideJob" ADD COLUMN "publishAt" DATETIME;
ALTER TABLE "GuideJob" ADD COLUMN "scheduledFor" DATETIME;
ALTER TABLE "GuideJob" ADD COLUMN "tells" TEXT;

-- CreateIndex
CREATE INDEX "GuideJob_status_scheduledFor_idx" ON "GuideJob"("status", "scheduledFor");
