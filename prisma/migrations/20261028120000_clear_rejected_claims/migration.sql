-- Data repair, no schema change.
--
-- Until this release a rejected claim refunded the payment but left the
-- listing marked claimed, so a company whose only claims were rejected still
-- showed as claimed in the portal and the admin. This clears that state for
-- exactly those listings: at least one rejected claim, no approved claim, and
-- no plan that is active or past due. Listings with a live owner are untouched.
UPDATE "Business"
SET "claimed" = false, "ownerId" = NULL
WHERE "claimed" = true
  AND "id" IN (SELECT "businessId" FROM "ClaimRequest" WHERE "status" = 'REJECTED' AND "businessId" IS NOT NULL)
  AND "id" NOT IN (SELECT "businessId" FROM "ClaimRequest" WHERE "status" = 'APPROVED' AND "businessId" IS NOT NULL)
  AND "id" NOT IN (SELECT "businessId" FROM "Subscription" WHERE "status" IN ('ACTIVE', 'PAST_DUE'));
