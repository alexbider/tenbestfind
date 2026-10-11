-- AlterTable
ALTER TABLE "ClaimRequest" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "ClaimRequest" ADD COLUMN "codeHash" TEXT;
ALTER TABLE "ClaimRequest" ADD COLUMN "codeSentAt" DATETIME;
ALTER TABLE "ClaimRequest" ADD COLUMN "codeExpiresAt" DATETIME;
ALTER TABLE "ClaimRequest" ADD COLUMN "codeAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClaimRequest" ADD COLUMN "emailVerifiedAt" DATETIME;

-- Mail and billing settings, so they show up in the admin and the connector.
INSERT INTO "Setting" ("key", "value", "groupName", "label", "updatedAt")
VALUES ('mail.from', '"TenBestFind <hello@tenbestfind.com>"', 'mail', 'Send business email from', CURRENT_TIMESTAMP)
ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "Setting" ("key", "value", "groupName", "label", "updatedAt")
VALUES ('mail.team', '"hello@tenbestfind.com"', 'mail', 'Team alerts go to', CURRENT_TIMESTAMP)
ON CONFLICT("key") DO NOTHING;
INSERT INTO "Setting" ("key", "value", "groupName", "label", "updatedAt")
VALUES ('billing.portalConfiguration', '""', 'billing', 'Stripe billing portal configuration id', CURRENT_TIMESTAMP)
ON CONFLICT("key") DO NOTHING;
