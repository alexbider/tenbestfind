# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 3 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/01 Home.dc.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `Tenbestfind Homepage Design` project files (HTML prototypes, assets, components)

---

# The Google service account

Everything above describes the design handoff this repository started from. What
follows is the running site.

One Google credential is used, stored under `google.serviceAccount` in Admin,
Integrations, or as the environment variable `GOOGLE_SERVICE_ACCOUNT_JSON`. It
is the whole JSON key file, pasted as it downloads, and the paste is checked for
being a service account key with a `client_email` and a `private_key` before it
is stored.

**The API.** Google Indexing API, `indexing.googleapis.com`. Enable it on the
Cloud project the service account belongs to, under APIs and Services, Library.

**The scope.** `https://www.googleapis.com/auth/indexing`, and only that one.
The site signs its own JWT and exchanges it at `oauth2.googleapis.com/token`,
so no consent screen and no refresh token are involved.

**The permission that is easy to miss.** Enabling the API is not authorisation.
The service account's `client_email` has to be added in Google Search Console,
under Settings, Users and permissions, as an **Owner** of the property. Anything
below Owner and every call comes back refused, with a message that does not say
why. The address is printed next to the credential in Admin, Integrations once a
key is on file.

**What it is used for.** Submitting URLs when a page is published, unpublished
or meaningfully changed, and reading back the status of a submission. Google
applies this API to job posting and broadcast markup officially; the submissions
are still useful as a crawl signal and cost nothing.

**Quota.** 200 URLs a day per project by default. The daily budget is enforced
in the app so a batch cannot spend it in one run.

**What does not use it.** Imports and review refreshes run through Apify, and
the guide writer and topic radar through Anthropic and DataForSEO. A missing
Google key does not stop any of them.

**IndexNow** needs no credential at all. A key is generated on first use, hosted
at `/indexnow/<key>.txt`, and submissions go to `api.indexnow.org` only while
`seo.searchEngineVisible` is on.

# Connector rate limits

The MCP endpoint counts calls per access token, in memory, in two windows: 3,000
an hour and 300 a minute. A call over either limit is refused with HTTP 429, a
`Retry-After` header in seconds, and a JSON-RPC error saying which limit was hit
and that nothing was lost. The refusal is a protocol error rather than a tool
result, because the call did not run and a model reading it as a result would
take it as an answer about the data.

A batch body counts as many calls as it carries. An agent working through one
city makes roughly 150 calls, so the hourly ceiling is about twenty cities an
hour, and the per-minute window is what catches a loop in seconds rather than
after an hour of writes. Both are in `src/lib/mcp/limits.ts`.

# The rule for titles

A title the SEO template generates carries the brand already. A title somebody
typed by hand skipped the template entirely, which is why eleven hand-written
Toronto titles went out with no publisher on them while the generated Chicago
one beside them carried it.

The rule now, for both kinds: append ` | TenBestFind` only when the title does
not already name the site, and only when the whole thing still fits inside 60
characters. Past that the suffix is dropped rather than the words, because a
result that gets cut off should be cut off after the part that says what the
page is. The separator and the site name come from Admin, SEO, so changing
either changes every title at once. `withBrand` in `src/lib/seo.ts` is the one
implementation.
