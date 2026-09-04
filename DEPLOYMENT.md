# Deploying to the VPS

The target is Hostinger VPS `1936590`, hostname `tenbestfind.com`, IP `2.25.139.87`.

## Why it is shaped this way

The site is deployed as a Docker Compose project through Hostinger's API rather
than over SSH. That choice is not cosmetic: a redeploy is one API call with no
shell on the box, and it works from an environment that has no SSH access at
all. `docker-compose.yml` in this repository is the file that is sent, so it is
the source of truth for what runs. Keep the two in step. A compose file that has
drifted is worse than none, because the next redeploy quietly reverts the box to
whatever it says.

There is no image to build or push. The `site` container starts on a stock
`node:22-bookworm`, clones or fast-forwards the repository into the `site-app`
volume, installs, generates the Prisma client, applies migrations, seeds only if
the database is empty, backfills city coordinates, rescores listing completeness,
builds and then serves. Slower to start, much easier to operate: a deploy is
whatever is on the branch, and there is no registry in the loop.

`importer` and `rollup` share that same checkout through `site-app` instead of
carrying their own. Both wait for `.next/BUILD_ID` to appear before they start,
which is the honest signal that the checkout finished building, and the site
container deletes that marker at the top of its run so a half-finished checkout
never starts them.

Traefik is in the compose file and runs on the host network, reading container
labels off the docker socket with `exposedbydefault` off and a global http→https
redirect. So a service opts in with labels and nothing else: there is no shared
external network to join and no redirect middleware to declare. The certificate
is issued on first request, which means DNS has to resolve before the first
deploy.

Nothing durable lives in a container. The database is on `site-data`, uploaded
media on `site-media`, the certificates on `traefik-letsencrypt` and the checkout
on `site-app`. A redeploy replaces code and leaves content alone. Migrations run
with `prisma migrate deploy`, not `db push`, so a destructive change fails the
deploy instead of dropping a column, and the seed runs **only** when the database
holds no countries.

## Prerequisites

1. A template with Docker. `Ubuntu 24.04 with Docker and Traefik` (template
   id 1210) is what the box runs. Hostinger's API has no reinstall endpoint, so
   changing it is done from hPanel: **VPS → Settings → OS & Panel → Change OS**.
2. A public git URL, because the box does its own checkout. `REPO_URL` is
   cloned with no credentials.
3. An A record for `tenbestfind.com` on `2.25.139.87` before the first deploy,
   or Let's Encrypt cannot answer the challenge.

## Environment

These are set on the Docker project, not read from a file in the repository.
`SESSION_SECRET` is required and must be at least 32 characters; changing it
invalidates every session and every API key stored through the admin, because
those are encrypted with a key derived from it.

```
REPO_URL=https://github.com/<owner>/<repo>.git
SITE_HOST=tenbestfind.com
NEXT_PUBLIC_SITE_URL=https://tenbestfind.com
ACME_EMAIL=admin@tenbestfind.com
SESSION_SECRET=<32+ random characters>

# Optional, read only when the seed runs against an empty database.
SEED_ADMIN_EMAIL=admin@tenbestfind.com
SEED_ADMIN_PASSWORD=

# Optional. Without them the site runs and records intent, but skips checkout.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Optional. Quote requests are stored either way; these send the email.
RESEND_API_KEY=
MAIL_FROM=

# Optional, read by the importer container. The admin holds encrypted copies of
# the first two, and the environment wins when both are present.
APIFY_TOKEN=
ANTHROPIC_API_KEY=
IMPORT_MODEL=
IMPORT_EFFORT=medium
```

`NEXT_PUBLIC_*` values are inlined at build time. Since the build happens at
container start, changing one means a restart of the `site` container rather
than a separate build step.

The branch is whatever `REPO_URL`'s default branch is; the container logs the
branch and short SHA it ended up on, which is the quickest way to confirm a
deploy actually took.

## Deploying

Both the first deploy and every redeploy are the same call to Hostinger's
*create project* endpoint, with `docker-compose.yml` as the content and the
variables above as the environment. A project with the same name is replaced,
and the named volumes survive, so the content survives with it.

Watch the project logs afterwards. A good run says, in order: the branch and
SHA, the install, the migrations ("All migrations have been successfully
applied"), either the seed or "database already holds N countries, leaving it
alone", the coordinate backfill, the rescore, the build, then "Ready in". The
importer and rollup print "waiting for the site build" until that finishes.

## After it is live

- Set a password on the admin account. The seed no longer ships one: give it
  `SEED_ADMIN_PASSWORD`, or let it generate one and read it out of the deploy
  log, which prints each new account's password once and never again.
- Point the Stripe webhook at `https://tenbestfind.com/api/stripe/webhook/` and
  put the signing secret in `STRIPE_WEBHOOK_SECRET`.
- Open **Admin → Global SEO** and check the site-wide configuration before you
  submit anything to Search Console. Nothing there lives in an environment
  variable: the title templates, robots directives, schema, verification codes,
  sitemap contents and AI crawler rules are all rows in the database, so they
  survive a redeploy and can be changed without one. The screen links to the
  four files it generates — `/robots.txt`, `/sitemap.xml`, `/llms.txt` and
  `/.well-known/tdmrep.json` — so you can see what a crawler sees.
- The master switch on that screen ("Let search engines index this site") is
  the one to turn off on a staging copy and the one to check first if the site
  ever disappears from search.
- To use the importer, put the Apify token and the Anthropic API key in
  **Admin, Integrations**. They are encrypted with a key derived from
  `SESSION_SECRET`, so rotating that secret invalidates them and they have to be
  re-entered. An `APIFY_TOKEN` or `ANTHROPIC_API_KEY` environment variable wins
  over the stored value, which is the better option if you would rather the keys
  never went through a browser.

## Database changes

The schema is applied with `prisma migrate deploy`, not `db push`. A destructive
change therefore fails the deploy instead of quietly dropping a column, which is
the behaviour you want on a database holding real content. To change the schema:

```
npx prisma migrate dev --name what_changed   # locally, writes prisma/migrations/
git push                                     # the deploy applies it
```

The compose file falls back to marking `0_init` as applied when it meets a
database with no migration history, which is what baselined the original
`db push` schema. That has already happened on this box and is a no-op now, but
it is what makes the file safe to point at an older copy of the database.

## Connecting Claude over MCP

The platform is its own MCP server at `https://tenbestfind.com/api/mcp`, fronted
by an OAuth 2.1 authorization server. Add it in Claude under Settings,
Connectors, Add custom connector, and paste that URL. There is no key to copy:
Claude registers itself (RFC 7591), you are sent to `/connect/` to sign in with
your staff account and approve the scopes, and the token is bound to this server
with a resource indicator (RFC 8707).

The tool surface covers everything the admin console does: pages, guides, posts
and rankings; services, subservices and the whole location tree; businesses with
their services, hours, credentials and photos; the editorial team; claims and
corrections; packages and sponsored inventory; every setting including the whole
global SEO configuration; redirects, media, users, the audit log, analytics, and
the import pipeline.

A connected app acts as the person who approved it and can do nothing that
account cannot. Read tools need `mcp:read`, write tools need `mcp:write` and an
editor account, and the administrative ones need an administrator. Deletions
need `confirm: true` and refuse while dependent content still exists. Every
write lands in the audit log with the application's name against it, and purges
the cache for the pages it touched, so a change made through Claude is live
immediately. **Admin, Connected apps** lists what is connected and revokes
either one session or an application outright.

Two things are deliberately absent. There is no tool that reads an API key back,
only one that replaces it. And accounts cannot be created and passwords cannot
be set through the connector, because a password should not travel through a
model's context; roles and access can be changed, with a guard against removing
the last administrator.

`NEXT_PUBLIC_SITE_URL` is the identity of the whole thing: it is what the
discovery documents advertise and what tokens are bound to. It is inlined at
build time, so changing it means a redeploy, and existing tokens stop working
because they no longer match the audience.

## Clearing the demo content

`scripts/purge-demo.ts` removes the businesses the seed created and nothing
else. The list comes from `prisma/data/businesses.ts` rather than a hard-coded
copy, so anything added since, by hand or by an import, is left alone. It writes
a JSON copy of everything it removes next to the database first, and it
unpublishes any ranking left with no companies, because a live "10 Best" page
with nothing on it is worse than no page at all.

```
npx tsx scripts/purge-demo.ts          # reports what would go
npx tsx scripts/purge-demo.ts --yes    # does it
```

Running it twice is safe: the second run finds nothing and says so.

## When a batch fails

A batch checks both credentials before it spends anything, so a dead API key or
an empty credit balance fails in seconds for nothing rather than after a paid
scrape. If something breaks mid-run, the batch stops rather than working through
the queue repeating the same failure, and the reason is written on the batch in
a sentence with what to do about it.

Failures are split in two. A **permanent** one, a rejected key, no credits, a
missing actor, stops the batch immediately: retrying costs money and cannot
work. A **transient** one, a rate limit or an overloaded model, is retried by
the SDK and then by the item's own second attempt.

**Resume** is the recovery path for both. It puts everything that failed to
write back in the queue, clears the stale error, and restarts at the stage the
items imply. Nothing already scraped is scraped again, so resuming after fixing
a key costs nothing on Apify.

A batch that scraped places and wrote none of them reports FAILED, not DONE. A
broken run should not look like a working one.

## The import worker

`scripts/import-worker.ts` runs in its own container. It polls for a queued
batch and advances it one step at a time: scrape, deduplicate, find an email,
write, publish. Running it apart from the web process is deliberate, so a batch
survives a deploy and a long Apify run never sits inside an HTTP request. One
batch runs at a time because both Apify and Anthropic charge per call.

## Running it locally

Nothing here changes local development. `npm run dev` still uses the SQLite file
in the repo and needs no Docker.
