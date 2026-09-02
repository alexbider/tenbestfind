# Deploying to the VPS

The target is Hostinger VPS `1936590`, hostname `tenbestfind.com`, IP `2.25.139.87`.

## Why it is shaped this way

The site is deployed as a Docker Compose project through Hostinger's API rather
than over SSH. That choice is not cosmetic: it means a redeploy is one API call
with no shell on the box, and it works from an environment that has no SSH
access at all.

Traefik comes from the host template and terminates TLS. It runs on the host
network, reads container labels off the docker socket, has `exposedbydefault`
off and already applies a global http→https redirect. So this compose file
declares only which host to answer on: there is no shared external network to
join and no redirect middleware to add. The certificate is issued on first
request, which means DNS has to resolve before the first deploy.

The image carries no data. The SQLite database lives on the `site-data` volume
and uploaded media on `site-media`, so redeploying replaces the code and leaves
the content alone. The entrypoint pushes the schema on every boot, which is
idempotent, and seeds **only** when the database is empty, so a redeploy never
overwrites something an editor has changed.

## Prerequisites

1. The VPS must run a template that includes Docker. `Ubuntu 24.04 with Docker
   and Traefik` (template id 1210) is the one this compose file assumes.
   The box currently runs `Ubuntu 24.04 with Claude Code`, which has no Docker,
   and Hostinger's API has no reinstall endpoint, so the switch is done from
   hPanel: **VPS → Settings → OS & Panel → Change OS**.
2. The code must be reachable from a public git URL, because the VPS builds the
   image itself.

## Environment

Set these when deploying. `SESSION_SECRET` is required and must be at least 32
characters; everything else has a working default.

```
SESSION_SECRET=<32+ random characters>
SITE_HOST=tenbestfind.com
NEXT_PUBLIC_SITE_URL=https://tenbestfind.com
GIT_CONTEXT=https://github.com/<owner>/<repo>.git#implement-tenbestfind
TZ=UTC

# Optional. Without them the site runs and records intent, but skips checkout.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_*` values are read at build time, not run time, so changing one
means a rebuild rather than a restart.

## First deploy

Once Docker is on the box and the code is pushed, the deploy is one call to
Hostinger's *create project* endpoint with `docker-compose.yml` as the content
and the variables above as the environment. Redeploys are the same call: a
project with the same name is replaced.

## After it is live

- Change both seeded passwords immediately. They are in `IMPLEMENTATION.md` and
  they are public knowledge.
- Point the Stripe webhook at `https://tenbestfind.com/api/stripe/webhook/` and
  put the signing secret in `STRIPE_WEBHOOK_SECRET`.
- DNS for `tenbestfind.com` must have an A record on `2.25.139.87` before
  Traefik can get a certificate.
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

## Running it locally

Nothing here changes local development. `npm run dev` still uses the SQLite file
in the repo and needs no Docker.
