# Changelog

## seo-and-connector-overhaul

Thirteen commits, one per numbered task or per group of tasks that share a
mechanism. Nothing here changes a public URL except by leaving a 301 behind it.

### The connector and the data model

**Ratings and Google identity on hand-built listings.** `create_business` and
`update_business` take `googlePlaceId`, `rating`, `reviewCount`, `ratingReadOn`
and `googleMapsPosition`, and store them in the columns that already existed for
them rather than in new ones beside them. A rating outside 0 to 5 and a negative
review count are refused. `refresh_reviews` has always worked from `placeId`
alone, so a listing created by hand can now be targeted by it.

**The quick overview is saved.** `create_business` accepted `overview` and
dropped it. It persists, `update_business` takes it, and `listing_gaps` counts
it as filled.

**Fields that were silently ignored on create.** `yearFounded`, `licenseNumber`,
`emergency`, `financing`, `freeEstimates`, `warrantyTerms` and `employeeCount`
all persist on create, the same as on update. Every tool now refuses an argument
it does not declare, naming the argument and listing the ones it takes, rather
than accepting the call and ignoring it.

**A company can work in more than one trade.** `BusinessCategory` holds the
extra ones; `categoryId` stays the primary and keeps the URL and the breadcrumb.
`additionalCategoryIds` on create and update replaces the set, `get_business`
returns all of them with the primary first, search matches on either kind, and
the profile names every trade and links each job to the subservice page under
the category that job belongs to.

**Slugs stop moving on their own.** The renames came from
`scripts/relocate-company-slugs.ts`, which rebuilt every slug from the current
name and wrote no redirect. It records one now, and
`scripts/backfill-company-redirects.ts` covers the five profiles that moved
before the fix.

**The Google service account.** The pasted key is checked for being a service
account key with a `client_email` and a `private_key` before it is stored, in
the admin and through `set_credential`. `queue_import_batch` asks for the two
credentials an import actually spends rather than every credential on the list,
and `refresh_reviews` asks for the Apify token it queues work against. The
README documents the API, the scope, and the Owner grant in Search Console that
enabling the API does not give you.

### Website enrichment

**Service areas.** Enrichment creates no city records at all. It links towns the
directory already has, inside the company's own region, and reports the rest;
counties, metro areas and regional municipalities are refused outright.
`scripts/cleanup-enrichment-cities.ts` clears what the old behaviour left.

**Photos.** One set of rules decides what is a picture of the company's work,
applied in the crawler and again where a photo is saved: no offers, coupons,
financing banners, review badges, awards, logos, icons or popups, nothing
narrower than 400px, nothing shaped like a banner. Photos are only ever added,
never swapped for something a crawler preferred.

**Emails.** Nothing is saved until the address passes the checks and its domain
answers in DNS. That is what stops a sentence with a full stop in it being read
as an address. An agency domain is reported rather than cleared.
`scripts/cleanup-emails.ts` checks every company and clears what fails.

**Credentials.** Deduplicated on the authority and the number together rather
than the number alone.

### Structured data

Every company was a bare `LocalBusiness`. There is now a table from trade to
schema.org type, so a plumber is a `Plumber`, and the entity carries the address
as a `PostalAddress`, the coordinates, opening hours for the days the company is
open, the towns it covers, its real social profiles, the year it was founded,
its credentials, and an `aggregateRating` only when a rating and a review count
are both there. A ranked company and the same company's own profile are built by
one function, so they agree; the list counts up from position one with a URL on
every item.

`auditSchema` knows what structured data must never state: a reserved domain,
placeholder text, the string "null", an empty array, a rating nobody gave.
Every graph passes it on the way out and problems are logged, and
`npm run check:jsonld` rebuilds every published profile and ranking from the
database and exits non-zero on the first problem.

### Sitemaps and indexing

IndexNow submissions go on a durable queue and are sent as one batch with
retries, so a batch import or a restart no longer loses them. Announcements are
made on unpublish as well as publish, for the address a page moved from as well
as the one it moved to, and for every write made through the connector.

`updatedAt` moves when anything the page is made of changes: its photos, its
questions, its credentials, the entries on it, the SEO record beside it. Hubs
are dated by the newest ranking published under them, which is the fix for
cities.xml claiming nothing had changed since September.

`companies.xml` carries the photographs of each company's work as well as its
logo. The inclusion rules are written out child by child at the top of
`src/lib/sitemap.ts` and each one has a test. A page whose canonical names a
different URL is left out, which the rules claimed and the code did not do.

### The SEO scorer

The keyword-in-URL check normalises both sides, so "superior hvac service" now
matches `superior-hvac-service-toronto-on`. The word count reads the page's
saved content rather than only a sample handed to it. `listing_gaps` counts one
photo as having photos and reports "fewer than three" separately and lower.
`scripts/rescore-seo.ts` recalculates every record.

### Titles

The rule is written down: the brand goes on a hand-typed title only when the
title does not already name the site and the whole thing still fits inside 60
characters.

### Capacity

The connector counts calls per token, 3,000 an hour and 300 a minute, and
refuses anything over with HTTP 429, a `Retry-After`, and a message saying which
limit was hit and that nothing was lost.

### Tests

There were none. Vitest is set up and there are 76 tests across eleven files,
covering every task above.

### Migrations

    20260917101057_business_extra_services

One new table. Nothing existing is touched and there is no backfill to run.
