# Deploying this branch

`DEPLOYMENT.md` describes how the box works and does not change. This file is
the order to run things in for this release, once.

Everything below is idempotent apart from the last step, which spends the
Google daily quota and should be run once rather than on a loop.

## 0. Before anything

Take a snapshot of the VPS from hPanel, or copy the database out of the
`site-data` volume. Two of the steps below delete rows, and both of them print
what they will delete before they do it.

## 1. Code and migrations

The site container's boot script does `git fetch origin && git reset --hard
"@{u}"` and then `prisma migrate deploy`, so restarting the project from hPanel
ships the code and applies the migration in one move. The migration in this
release is:

    20260917101057_business_extra_services

It creates one table, `BusinessCategory`, and touches nothing that exists. There
is no backfill to run with it: every company already carries its trade in
`Business.categoryId`, and that column stays the primary service.

Confirm the migration landed before going on:

    npx prisma migrate status

## 2. Redirects for the five profiles whose URL moved

    npx tsx -r ./scripts/_server-only-stub.cjs scripts/backfill-company-redirects.ts
    npx tsx -r ./scripts/_server-only-stub.cjs scripts/backfill-company-redirects.ts --write

The first run prints what it found and writes nothing. It matches an old slug to
a current profile by prefix and refuses to guess when more than one profile
matches, so read the report before running it with `--write`. Anything it could
not resolve is named, and those need a redirect written by hand through the
admin or `create_redirect`.

## 3. Cities enrichment invented

    npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-enrichment-cities.ts
    npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-enrichment-cities.ts --apply

Takes only unpublished cities with no coordinates that nothing but a service
area link points at: York, Halton, Peel, Concord and the rest of what the old
enrichment created. The first run lists every one with the number of companies
linked to it. A city an editor has touched, or that carries a ranking, a guide,
a question or an import item, fails the test and is left alone.

## 4. Addresses that were never addresses

    npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-emails.ts
    npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-emails.ts --apply --dns

Without `--dns` it applies only the checks that need no network. With it, each
surviving address's domain is looked up as well, which is what catches a domain
that parses but does not exist. Agency domains are reported rather than cleared,
because a real plumber can be called seoplumbing.com; those are a decision for a
person.

## 5. Rescore the SEO records

    npx tsx -r ./scripts/_server-only-stub.cjs scripts/rescore-seo.ts
    npx tsx -r ./scripts/_server-only-stub.cjs scripts/rescore-seo.ts --write

The keyword-in-URL check and the word count both changed, so every stored score
is out of date. The report prints how many moved and by how much, per entity
type, before anything is written.

## 6. Check what the pages will publish

    npm run check:jsonld

Rebuilds the JSON-LD for every published profile and ranking from the database
and exits non-zero on anything structured data must never state. Run it after
the cleanups, because the cleanups are what fix most of what it would find. A
failure here is a data problem to fix in the record, not markup to paper over.

## 7. Sitemaps

Nothing to run. The sitemap is generated per request from the database with a
one-hour revalidate, so it is correct as soon as the data is. Confirm it:

    curl -s https://tenbestfind.com/sitemap.xml | head -40
    curl -s https://tenbestfind.com/sitemaps/cities.xml | head -20

Cities should now number as many as have a published ranking, each with the date
of that ranking rather than the date the city row was written.

## 8. Tell the engines, once

    npx tsx -r ./scripts/_server-only-stub.cjs scripts/indexnow.ts
    npx tsx -r ./scripts/_server-only-stub.cjs scripts/indexnow.ts --yes --all

`--all` ignores the watermark and submits everything the sitemap offers, which
is what a first full submission wants. Leave `--all` off afterwards: later runs
then send only what changed since the last successful submission.

This only does anything while `seo.searchEngineVisible` and `seo.indexnow` are
both on in Admin, SEO. They are off on production today, so turn them on first
or expect the script to tell you it skipped.

The Google Indexing API is separate and is not run by hand: the import worker
flushes its queue on every pass, inside a 200 URL daily quota. If the queue has
a backlog it will take a few days to clear, which is the intended behaviour.

## Rolling back

The migration only adds a table, so an older build runs against the new database
without trouble. Point the branch back and restart the project. The rows the
cleanup scripts deleted do not come back, which is the reason for step 0.
