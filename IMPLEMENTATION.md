# TenBestFind

Implementation of the Claude Design handoff in `project/`, built as a Next.js 15
app backed by Prisma. The design prototypes and chat transcripts are kept in
`project/` and `chats/` as the reference.

## Running it

```bash
npm install
npm run db:push      # create the SQLite database from the schema
npm run db:seed      # load the content from the design prototypes
npm run dev          # http://localhost:3000
```

Admin console at `/admin`. The seed creates `admin@tenbestfind.com` (admin) and
`editor@tenbestfind.com` (editor). It does not ship a password: set
`SEED_ADMIN_PASSWORD` before seeding to choose the admin's, and otherwise the
seed generates one for each account and prints them once when it finishes.
Re-running the seed never touches a password that already exists.

Set a real `SESSION_SECRET` in `.env` as well; it is what the session cookies
and the stored API keys are derived from.

## Layout

```
prisma/
  schema.prisma      data model
  data/              seed content lifted from the prototypes
  seed.ts            seeding script, safe to re-run
scripts/
  rollup.ts          nightly analytics rollup (see Analytics below)
src/
  app/               routes: public site, admin console, actions, API
  components/
    site/            public site components
    admin/           admin console components
    ui/              primitives shared by both
  lib/               db, auth, seo, analytics, urls, formatting
  styles/            design tokens and stylesheets
  templates/         page templates the catch-all route dispatches to
```

## URL model

Countries, service categories and CMS pages all live at the first path segment,
so a single catch-all route (`src/app/[...path]/page.tsx`) resolves the segments
against the database and dispatches to the right template. `src/lib/resolve.ts`
holds that logic; countries win over categories, and CMS pages come last.

```
/home-services/                 services index
/plumbers/                      service category
/plumbers/drain-cleaning/       subservice
/us/                            country hub
/us/tx/                         region hub
/us/tx/dallas/                  city hub
/us/tx/dallas/roofing/          ranking
/companies/lone-star-roofing/   business profile
/guides/roof-replacement-cost/  guide
/blog/what-changed-this-year/   blog post
/experts/marcus-reed/           expert profile
/about/                         CMS page
```

Trailing slashes are on, matching the prototypes.

## Data model notes

The datasource is SQLite so the project runs with no external services. The
schema avoids native enums and scalar lists, so moving to PostgreSQL is a change
to the `datasource` block alone:

- Status-style columns are strings, constrained by the union types in
  `src/lib/enums.ts`.
- List and object columns are JSON text, read through `src/lib/json.ts`.

Deliberate modelling choices worth knowing about:

- **Cost rows can have no price.** `CostRow.lowPrice` and `highPrice` are
  nullable, and `priceRange()` renders an empty row as "Quoted per project"
  rather than an invented figure.
- **Credentials carry a status.** `VERIFIED` means found in the issuing
  authority's register with a date; `REPORTED` means the business told us.
  The public profile shows the difference.
- **Ratings are attributed.** `googleRating`, `googleReviewCount` and
  `googleDataUpdated` are stored together and always published with the source
  and the date read. Nothing blends them into a score of our own.
- **Sponsorship is separate from ranking.** `SponsoredPlacement` has no
  relationship to `RankingEntry`. There is no code path by which a payment can
  change a position.

## SEO

`SeoMeta` is a Rank Math style per-entity record keyed on
`(entityType, entityId)`. `src/lib/seo.ts` merges it into Next's metadata field
by field, so an empty override falls back to the computed default rather than
publishing a blank tag.

- The admin editor (`src/components/admin/SeoPanel.tsx`) runs the same
  `analyzeSeo()` used on save, giving a live content score and a SERP preview.
- `src/app/sitemap.ts` generates from the database and skips anything with a
  noindex record.

### Redirects

Renaming anything with a public address records a permanent redirect and
repoints anything already aimed at the old address, so no chain forms. Renaming
back clears the row rather than leaving it pointing at itself. Editors can also
add rows by hand in `/admin/seo`.

`src/lib/redirects.ts` holds both halves. Every route that is about to call
`notFound()` checks the table first, which is why the lookup is not in
middleware: it needs the database, and the edge runtime has no access to it.
The cost is one indexed lookup on a request that was going to fail anyway. A
row marked gone falls through to the 404 instead of redirecting.

A redirect thrown during a render cannot choose its own status, so permanent is
served as 308 and temporary as 307. Search engines read those the same way as
301 and 302.

## Editing

Every entity that publishes something has an editor:

| Entity | Where |
| --- | --- |
| Pages, guides, posts | `/admin/pages`, `/admin/guides`, `/admin/posts` |
| Rankings, with entry order, criteria, costs, sources, FAQs | `/admin/rankings` |
| Businesses, with services, areas, hours, credentials, photos | `/admin/businesses` |
| Services and subservices | `/admin/taxonomy/services` |
| Countries, regions, cities | `/admin/taxonomy/{countries,regions,cities}` |
| Authors, reviewers and the expert panel | `/admin/people` |
| Site-wide questions and ranking criteria | `/admin/faqs` |
| Plans and sponsored placements | `/admin/packages`, `/admin/sponsored` |

Three shared editors do most of the work:

- `BlockEditor` edits a body as `GuideBlock[]` — headings, paragraphs, lists,
  steps, callouts and quotes — and posts it as JSON in one hidden field.
- `RepeatableEditor` edits a list of same-shaped rows (FAQs, cost rows, sources,
  credentials, ranking positions) with reordering. Row order is the published
  order, so a ranking is renumbered from the list rather than by typing numbers.
- `IdListEditor` picks many ids from a grouped list, for services offered and
  areas served.

Child lists are replaced wholesale on save: the editor posts the list it wants
to exist, so a removed row genuinely disappears. Subservices are the exception,
matched on slug so an existing one keeps its id and the businesses attached to
it.

Deleting something that other content depends on unpublishes or archives it
instead. A person with a byline, a service with live rankings, and a company
that has been ranked or has billing history all take that path, so nothing
leaves a page pointing at a record that no longer exists.

## Media

`POST /api/admin/media/` takes one image from a staff session and returns its
URL. The extension comes from the accepted content type, not the filename, and
SVG is not accepted: it can carry script, and it would be served from our own
origin.

Uploads are written to `media/` and served by `src/app/uploads/[...path]/`
rather than living in `public/` — Next reads `public/` once at boot, so a file
written afterwards would 404 until a restart. `MEDIA_DIR` and
`MEDIA_PUBLIC_PATH` point that at a mounted volume and a CDN when needed, with
no change to anything that stores a URL.

Every image field is a URL with an upload beside it, so an image hosted anywhere
else can still be pasted in and nothing depends on the endpoint being reachable.

## Analytics

Two layers:

1. `AnalyticsEvent` — one row per interaction, written by `/api/track/`.
   Referrer and a coarse device class only; no identifiers and no cookies.
2. `BusinessDailyStat` — the nightly rollup the dashboards read, so the admin
   stays fast as the event table grows.

```bash
npm run analytics:rollup     # yesterday
npx tsx scripts/rollup.ts 2  # two days ago, for backfills
```

Put it on cron at the hour set in `analytics.rollupHour`. The script also trims
events past `analytics.retentionDays`.

## Billing

Stripe, through one internal API in `src/lib/billing.ts` that the public flows,
the admin and the webhook all call. No card details ever reach this application:
the flows redirect to Stripe Checkout, and card changes go to Stripe's own
billing portal.

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Without those the app still runs. Flows record the intent as a `PENDING`
subscription and the admin says plainly that payment is not configured, which
keeps local development and CI working.

`POST /api/stripe/webhook/` is the only thing that activates a subscription, so
a closed browser tab cannot leave a business looking subscribed. Every event is
recorded in `WebhookEvent` before it is applied, making redelivery a no-op.

A listing subscription starts on a trial and is only charged when the listing
publishes, so nobody pays while waiting on an editorial check. Plan prices are
pushed to Stripe on save; because a Stripe price is immutable, changing an
amount creates a new one and existing subscribers keep the price they signed up
on.

Pricing as configured: claiming and adding are both $29/month per location, and
a Top 10 featured placement is $199/month per city and trade.

## What is not built

- The MCP connector stores and tests connections, but the MCP server surface
  that a client would call is not implemented. Scopes are defined and shown.
- Email delivery. Form submissions land in the `Submission` table for the admin
  inbox rather than being emailed.
- Draft preview links. Unpublished content is visible in the admin editors but
  there is no shareable preview URL for someone without an account.
