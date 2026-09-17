# Repo map and plan

Written before the work below started, so the decisions taken along the way
have somewhere to live.

## The map

**Framework.** Next.js 15 App Router, React 19, TypeScript strict. Server
components by default; the handful of client components live in
`src/components/{site,admin,ui}`. Public routes resolve through one catch-all,
`src/app/[...path]/page.tsx`, which hands off to `src/lib/resolve.ts` and then
to a template in `src/templates/`. Company profiles are their own route,
`src/app/companies/[slug]/page.tsx`.

**Data.** Prisma 6 against SQLite, schema at `prisma/schema.prisma`, migrations
in `prisma/migrations/`. The client is a singleton in `src/lib/db.ts`. Relevant
models: `Business`, `BusinessService` (business to subservice, not to
category), `BusinessArea`, `Credential`, `BusinessPhoto`, `Ranking`,
`RankingEntry`, `SeoMeta`, `Redirect`, `Setting`, `AuditLog`, `City`,
`Region`, `Country`, `Category`, `Subservice`.

**MCP connector.** Transport at `src/app/api/mcp/route.ts` (streamable HTTP,
stateless, bearer per request). Tools are plain objects with a JSON schema and
a handler, grouped by module under `src/lib/mcp/`: `directory.ts` (businesses,
reviews, enrichment, leads, people), `content.ts`, `taxonomy.ts`, `guides.ts`,
`commerce.ts`, `system.ts`, `imports.ts`. Shared helpers and the argument
coercion live in `src/lib/mcp/kit.ts`; `src/lib/mcp/index.ts` assembles the
list, computes `TOOL_SURFACE_VERSION` and dispatches through `runTool`.

**SEO.** `src/lib/seo.ts` builds page metadata (`seoFor`, `buildMetadata`),
the JSON-LD graph, and holds the scorer `analyzeSeo`. `src/lib/seo-copy.ts`
generates titles and descriptions per entity type and owns `brandedTitle`,
`fittedTitle` and `TITLE_LIMIT`. `src/lib/seo-settings.ts` reads the settings
rows. `src/lib/seo-report.ts` has the publication gates.

**Sitemaps.** `src/lib/sitemap.ts` decides what belongs; `src/app/sitemap.xml`
is the index and `src/app/sitemaps/[child]` renders each child file.

**Slugs.** `slugify` in `src/lib/format.ts`; company slugs are built by
`src/lib/company-slug.ts` (`uniqueCompanySlug`, name plus city plus region).
Redirects are written by `recordMove` in `src/lib/redirects.ts`.

**Tests.** There were none. Vitest is added as part of this work, with the
suite under `tests/`.

## Decisions taken where the brief was ambiguous

1. **A1 field names.** The brief asks for `googlePlaceId`, `rating`,
   `reviewCount`, `ratingReadOn` and `googleMapsPosition`. Four of those
   already exist under different names: `placeId` (unique, nullable),
   `googleRating`, `googleReviewCount`, `googleDataUpdated` and `gmbRank`.
   Adding parallel columns would split the truth across two places and break
   every template that reads the existing ones. The safest option is to keep
   the storage and accept the brief's names as MCP argument aliases, so an
   agent can send either. Documented in the tool descriptions.

2. **A4 many-to-many.** `BusinessService` already links a business to
   subservices. Categories need their own join table rather than a reuse, so
   `BusinessCategory` is added with the existing `categoryId` staying as the
   primary service that owns the URL and the breadcrumb. The join table holds
   only the extra trades, not the primary repeated: that keeps one answer to
   "what is this company's trade" rather than two that can drift, and it means
   the migration needed no backfill at all, since every existing company
   already carries its primary in `categoryId`. "Every service the company
   offers" is the primary followed by the join rows.

3. **A5 root cause.** `update_business` already leaves the slug alone unless
   `slug` is passed, and the admin form posts the slug explicitly. The silent
   renames came from `scripts/relocate-company-slugs.ts`, which rebuilds every
   slug from the current name and deliberately writes no redirects. That
   assumption held when it was written and does not now. The script records
   redirects from this point on, and the five known paths are backfilled.

4. **B3 agency domains.** "Any domain belonging to a web or SEO agency found
   in the site footer" cannot be decided reliably from a domain name alone.
   The block list holds the named domains plus a set of agency markers, and
   anything matched by a marker is reported rather than deleted silently.

5. **D1 IndexNow batching.** Submissions go through a durable queue rather
   than an in-process array, so a restart does not lose them. The queue is the
   existing `IndexRequest` table under the target `INDEXNOW`, which it was
   already designed for, rather than a second table beside it: "was this page
   ever submitted, and to whom" then has one answer.

6. **A6 README.** The repository's README is the design handoff bundle's own
   README. Rather than rewrite somebody else's document, the credential
   documentation is a clearly separated section appended to it.

7. **B1 Concord, ON.** No default city exists anywhere in the code. Concord is
   a community inside Vaughan, and it became a city record the same way York,
   Halton and Peel did: `recordNamedAreas` created whatever name it read off a
   website and could not find. Removing city creation from enrichment is the
   fix; the cleanup script clears what the old behaviour left.

8. **Scale of the brief.** This is more work than one pass can finish to a
   standard worth shipping. Work is ordered by risk: the live 404s and the bad
   data first, then the connector, then structured data, then the sitemap and
   indexing infrastructure. Anything not reached is listed in the final report
   rather than half-done.
