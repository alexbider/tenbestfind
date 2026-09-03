import { db } from "./db";
import { ApifyPermanentError, readPlaces, runState, startPlacesRun, type PlaceRecord } from "./apify";
import {
  findEmail,
  normalizeAddress,
  normalizeName,
  normalizePhone,
  websiteHost,
} from "./enrich";
import { focusKeywordFor, writeListing, type Brief } from "./listing-writer";
import { crawlSite, type SiteData } from "./site-crawl";
import { discoverCity, fillServiceAreas } from "./geo";
import { saveReviews } from "./reviews";
import { recomputeCompleteness } from "./completeness";
import { openingFingerprint } from "./humanize";
import { analyzeSeo } from "./seo";
import { fullDate, slugify } from "./format";
import { stringify } from "./json";
import { routes } from "./urls";
import { PermanentError, preflight, type Effort } from "./anthropic";

// The batch state machine. Each call to `advance` does one unit of work and
// returns, so the worker stays interruptible and a container restart resumes
// from whatever the database already knows rather than starting over.

const ENRICH_SLICE = 8;
const WRITE_SLICE = 3;

export type Advance = { changed: boolean; note: string };

export async function advanceBatch(batchId: string): Promise<Advance> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: { include: { subservices: true } } },
  });
  if (!batch) return { changed: false, note: "gone" };

  switch (batch.status) {
    case "QUEUED":
      return startScrape(batchId);
    case "SCRAPING":
      return collectScrape(batchId);
    case "ENRICHING":
      return enrichSlice(batchId);
    case "WRITING":
      return writeSlice(batchId);
    case "PUBLISHING":
      return finish(batchId);
    default:
      return { changed: false, note: batch.status.toLowerCase() };
  }
}

async function fail(batchId: string, error: unknown): Promise<Advance> {
  // A permanent failure carries a sentence about what to do next; anything else
  // gets its own message, which is at least honest about what broke.
  const message =
    error instanceof ApifyPermanentError || error instanceof PermanentError
      ? `${error.message} ${error.hint}`
      : error instanceof Error
        ? error.message
        : String(error);

  await db.importBatch.update({
    where: { id: batchId },
    data: { status: "FAILED", error: message.slice(0, 900), finishedAt: new Date() },
  });
  return { changed: true, note: `failed: ${message}` };
}

/**
 * Where a paused or failed batch should pick up. Items that failed to write are
 * put back in the queue first: the usual reason a batch failed is something
 * outside it, a key or a credit balance, and once that is fixed the work should
 * carry on rather than needing every item retried by hand.
 */
export async function resumeStage(batchId: string): Promise<string> {
  const revived = await db.importItem.updateMany({
    where: { batchId, status: "FAILED" },
    data: { status: "ENRICHED", attempts: 0, reason: null },
  });

  const counts = await db.importItem.groupBy({ by: ["status"], where: { batchId }, _count: true });
  const has = (status: string) => counts.some((row) => row.status === status && row._count > 0);

  const status =
    counts.length === 0
      ? "QUEUED"
      : has("FOUND")
        ? "ENRICHING"
        : has("ENRICHED") || revived.count > 0
          ? "WRITING"
          : has("WRITTEN")
            ? "PUBLISHING"
            : "PUBLISHING";

  await db.importBatch.update({
    where: { id: batchId },
    data: { status, error: null, finishedAt: null, failed: 0 },
  });

  return status;
}

/* ------------------------------------------------------------------ scrape */

/** One query per city, so a result can be traced back to the city that asked. */
export function queryFor(serviceName: string, city: { name: string }, region: { code: string }): string {
  return `${serviceName} in ${city.name}, ${region.code.toUpperCase()}`;
}

async function startScrape(batchId: string): Promise<Advance> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: true },
  });
  if (!batch) return { changed: false, note: "gone" };

  try {
    const cityIds = JSON.parse(batch.cityIds) as string[];
    const cities = await db.city.findMany({
      where: { id: { in: cityIds } },
      include: { region: true },
    });
    if (cities.length === 0) throw new Error("The batch names no cities that still exist.");

    // Both credentials are proved before anything is spent. Scraping first and
    // discovering the writer cannot run is how the first Dallas batch burned a
    // scrape it could not use.
    await preflight(process.env.IMPORT_MODEL || undefined);

    const runId = await startPlacesRun({
      queries: cities.map((city) => queryFor(batch.category.serviceName, city, city.region)),
      perQuery: batch.perCity,
      language: batch.language,
    });

    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "SCRAPING", apifyRunId: runId, startedAt: new Date(), error: null },
    });
    return { changed: true, note: `scraping ${cities.length} cities` };
  } catch (error) {
    return fail(batchId, error);
  }
}

async function collectScrape(batchId: string): Promise<Advance> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: true },
  });
  if (!batch?.apifyRunId) return fail(batchId, new Error("The batch is scraping but has no run id."));

  try {
    const state = await runState(batch.apifyRunId);
    if (!state.finished) return { changed: false, note: `apify ${state.status.toLowerCase()}` };
    if (state.failed || !state.datasetId) throw new Error(`The Apify run ended as ${state.status}.`);

    const places = await readPlaces(state.datasetId);
    const cityIds = JSON.parse(batch.cityIds) as string[];
    const cities = await db.city.findMany({
      where: { id: { in: cityIds } },
      include: { region: true },
    });

    // Map each result back to the city whose query produced it.
    const byQuery = new Map(
      cities.map((city) => [queryFor(batch.category.serviceName, city, city.region), city]),
    );

    let found = 0;
    let duplicates = 0;
    const rankPerCity = new Map<string, number>();

    let discovered = 0;

    for (const place of places) {
      const city = (place.searchString && byQuery.get(place.searchString)) || cities[0];
      const rank = (rankPerCity.get(city.id) ?? 0) + 1;
      rankPerCity.set(city.id, rank);

      // A search for one city returns companies from the towns around it. Those
      // towns become places in their own right, unpublished until an editor
      // says otherwise, which is what gives the service-area radius something
      // to find beyond the handful of metros that were seeded by hand.
      if (place.city && place.latitude !== null && place.longitude !== null) {
        const suburb = await discoverCity({
          name: place.city,
          regionId: city.regionId,
          latitude: place.latitude,
          longitude: place.longitude,
          near: { latitude: city.latitude, longitude: city.longitude },
        });
        if (suburb?.created) discovered += 1;
      }

      const verdict = await classify(place, city.id, batch);
      if (verdict.status === "DUPLICATE" || verdict.status === "SKIPPED") duplicates += 1;
      else found += 1;

      // placeId is the unique key inside a batch; a result Apify returned twice
      // updates the row instead of colliding.
      const data = {
        cityId: city.id,
        name: place.title,
        status: verdict.status,
        reason: verdict.reason,
        gmbRank: place.rank ?? rank,
        rating: place.rating,
        reviewCount: place.reviewCount,
        website: place.website,
        phone: place.phone,
        email: place.email,
        emailSource: place.email ? "gmb" : null,
        addressLine: place.address,
        raw: JSON.stringify(place),
        businessId: verdict.businessId,
      };

      if (place.placeId) {
        await db.importItem.upsert({
          where: { batchId_placeId: { batchId, placeId: place.placeId } },
          create: { batchId, placeId: place.placeId, ...data },
          update: data,
        });
      } else {
        await db.importItem.create({ data: { batchId, placeId: null, ...data } });
      }
    }

    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "ENRICHING", found, duplicates },
    });
    return {
      changed: true,
      note: `${found} to import, ${duplicates} skipped${discovered ? `, ${discovered} new areas` : ""}`,
    };
  } catch (error) {
    return fail(batchId, error);
  }
}

type Verdict = { status: "FOUND" | "DUPLICATE" | "SKIPPED"; reason: string | null; businessId: string | null };

/**
 * The duplicate check, in order of how much a match is worth trusting: the
 * place id, then the website, then the phone, then name and address inside the
 * same city. The last one is the only fuzzy rule and it is deliberately narrow.
 */
export async function classify(
  place: PlaceRecord,
  cityId: string,
  batch: { minRating: number | null; minReviews: number | null },
): Promise<Verdict> {
  if (place.permanentlyClosed) return { status: "SKIPPED", reason: "permanently closed", businessId: null };
  if (place.temporarilyClosed) return { status: "SKIPPED", reason: "temporarily closed", businessId: null };
  if (!place.title || place.title === "Unnamed") {
    return { status: "SKIPPED", reason: "no business name", businessId: null };
  }
  if (batch.minRating !== null && (place.rating ?? 0) < batch.minRating) {
    return { status: "SKIPPED", reason: `rating ${place.rating ?? 0} below ${batch.minRating}`, businessId: null };
  }
  if (batch.minReviews !== null && (place.reviewCount ?? 0) < batch.minReviews) {
    return {
      status: "SKIPPED",
      reason: `${place.reviewCount ?? 0} reviews below ${batch.minReviews}`,
      businessId: null,
    };
  }

  if (place.placeId) {
    const byPlace = await db.business.findUnique({ where: { placeId: place.placeId } });
    if (byPlace) return { status: "DUPLICATE", reason: "same Google place id", businessId: byPlace.id };
  }

  const host = websiteHost(place.website);
  const phone = normalizePhone(place.phone);
  const name = normalizeName(place.title);
  const address = normalizeAddress(place.address);

  // Only businesses already in this city can be duplicates of this one: the
  // same chain in two cities is two listings, which is the point of the site.
  const local = await db.business.findMany({
    where: { cityId },
    select: { id: true, name: true, website: true, phone: true, addressLine: true },
  });

  for (const existing of local) {
    if (host && websiteHost(existing.website) === host) {
      return { status: "DUPLICATE", reason: "same website", businessId: existing.id };
    }
    if (phone && normalizePhone(existing.phone) === phone) {
      return { status: "DUPLICATE", reason: "same phone number", businessId: existing.id };
    }
    if (normalizeName(existing.name) === name) {
      const sameAddress = address && normalizeAddress(existing.addressLine) === address;
      return {
        status: "DUPLICATE",
        reason: sameAddress ? "same name and address" : "same name in this city",
        businessId: existing.id,
      };
    }
  }

  return { status: "FOUND", reason: null, businessId: null };
}

/* ------------------------------------------------------------------ enrich */

async function enrichSlice(batchId: string): Promise<Advance> {
  const items = await db.importItem.findMany({
    where: { batchId, status: "FOUND" },
    orderBy: { gmbRank: "asc" },
    take: ENRICH_SLICE,
  });

  if (items.length === 0) {
    await db.importBatch.update({ where: { id: batchId }, data: { status: "WRITING" } });
    return { changed: true, note: "enriched" };
  }

  await Promise.all(
    items.map(async (item) => {
      // One pass over the company's own site does both jobs: it finds the
      // address Google did not publish, and it collects the logo, the photos
      // and the facts a Maps record never carries.
      const site = await crawlSite(item.website);

      const found = item.email
        ? { email: item.email, source: item.emailSource === "gmb" ? ("gmb" as const) : ("website" as const) }
        : (await findEmail({ gmbEmail: null, website: item.website })) ??
          (site.emails[0] ? { email: site.emails[0], source: "website" as const } : null);

      await db.importItem.update({
        where: { id: item.id },
        data: {
          status: "ENRICHED",
          email: found?.email ?? null,
          emailSource: found?.source ?? "none",
          site: site.pagesRead > 0 ? JSON.stringify(site) : null,
        },
      });
    }),
  );

  const read = items.length;
  return { changed: true, note: `enriched ${read}` };
}

/* ------------------------------------------------------------------- write */

async function writeSlice(batchId: string): Promise<Advance> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: { include: { subservices: true } } },
  });
  if (!batch) return { changed: false, note: "gone" };

  const items = await db.importItem.findMany({
    where: { batchId, status: "ENRICHED" },
    orderBy: { gmbRank: "asc" },
    take: WRITE_SLICE,
    include: { city: { include: { region: { include: { country: true } } } } },
  });

  if (items.length === 0) {
    await db.importBatch.update({ where: { id: batchId }, data: { status: "PUBLISHING" } });
    return { changed: true, note: "written" };
  }

  // Openings already used, so profiles in one batch do not rhyme with each other.
  const written = await db.importItem.findMany({
    where: { batchId, status: { in: ["WRITTEN", "IMPORTED"] } },
    select: { draft: true },
    take: 40,
  });
  const avoidOpenings = written
    .map((row) => {
      try {
        return openingFingerprint(JSON.parse(row.draft ?? "{}").description ?? "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  let ok = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const place = JSON.parse(item.raw ?? "{}") as PlaceRecord;
      const city = item.city;
      if (!city) throw new Error("The item has no city.");

      const name = item.name.trim();
      const focusKeyword = focusKeywordFor(name);
      const slug = await uniqueSlug(name, city.slug);
      const path = routes.business(slug);

      const site = item.site ? (JSON.parse(item.site) as SiteData) : null;

      const brief: Brief = {
        name,
        focusKeyword,
        category: batch.category.name,
        serviceName: batch.category.serviceName,
        city: city.name,
        region: city.region.name,
        country: city.region.country.name,
        address: item.addressLine,
        phone: item.phone,
        website: item.website,
        email: item.email,
        rating: item.rating,
        reviewCount: item.reviewCount,
        ratingReadOn: fullDate(new Date()),
        gmbRank: item.gmbRank,
        gmbCategory: place.categoryName ?? null,
        hours: place.openingHours ?? null,
        site: site
          ? {
              summary: site.summary,
              text: site.text,
              yearFounded: site.yearFounded,
              licenseNumbers: site.licenseNumbers,
              social: Object.values(site.social),
            }
          : null,
        avoidOpenings,
      };

      // The model and the effort are environment settings so a large backfill
      // can be run cheaper without touching the code.
      const result = await writeListing(brief, path, {
        model: process.env.IMPORT_MODEL || undefined,
        effort: (process.env.IMPORT_EFFORT as Effort | undefined) ?? "medium",
      });

      await db.importItem.update({
        where: { id: item.id },
        data: {
          status: "WRITTEN",
          draft: JSON.stringify({ ...result.listing, slug, focusKeyword, path }),
          seoScore: result.review.score,
          attempts: result.attempts,
          reason: result.review.ok ? null : result.review.problems.slice(0, 3).join(" "),
        },
      });
      avoidOpenings.push(openingFingerprint(result.listing.description));
      ok += 1;
    } catch (error) {
      // A permanent failure will hit every remaining item the same way, and
      // each attempt is a paid call. Stop the batch, say why in one sentence,
      // and leave the item ready to write so a resume costs nothing extra.
      if (error instanceof PermanentError) {
        await db.importItem.update({
          where: { id: item.id },
          data: { status: "ENRICHED", reason: error.message },
        });
        await db.importBatch.update({
          where: { id: batchId },
          data: {
            status: "FAILED",
            written: { increment: ok },
            error: `${error.message} ${error.hint}`.slice(0, 900),
          },
        });
        return { changed: true, note: `stopped: ${error.message}` };
      }

      const message = error instanceof Error ? error.message : String(error);
      await db.importItem.update({
        where: { id: item.id },
        data: {
          status: item.attempts >= 1 ? "FAILED" : "ENRICHED",
          attempts: { increment: 1 },
          reason: message.slice(0, 400),
        },
      });
      failed += 1;
    }
  }

  await db.importBatch.update({
    where: { id: batchId },
    data: { written: { increment: ok }, failed: { increment: failed } },
  });

  return { changed: true, note: `wrote ${ok}${failed ? `, ${failed} failed` : ""}` };
}

/** Slugs are global, so a clash falls back to the city and then to a counter. */
async function uniqueSlug(name: string, citySlug: string): Promise<string> {
  const base = slugify(name) || "business";
  const candidates = [base, `${base}-${citySlug}`];
  for (let index = 2; index <= 40; index += 1) candidates.push(`${base}-${citySlug}-${index}`);

  for (const candidate of candidates) {
    const taken = await db.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}


/* ------------------------------------------------------------------- hours */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "9 AM to 5:30 PM" into 24-hour opens and closes. */
function toClock(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === "p") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2] ?? "00"}`;
  }
  const plain = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return `${plain[1].padStart(2, "0")}:${plain[2]}`;
  return null;
}

/**
 * Google publishes hours as prose. The site stores them as opens and closes so
 * the profile page and the opening-hours schema can both read them, so the
 * prose is converted here rather than at every read.
 */
export function parseGoogleHours(
  rows: { day: string; hours: string }[] | null,
): { day: string; opens?: string; closes?: string; closed?: boolean }[] {
  if (!rows?.length) return [];

  const out: { day: string; opens?: string; closes?: string; closed?: boolean }[] = [];
  for (const row of rows) {
    const day = DAYS.find((name) => name.toLowerCase().startsWith(row.day.trim().slice(0, 3).toLowerCase()));
    if (!day) continue;

    const text = row.hours.trim();
    if (/closed/i.test(text)) {
      out.push({ day, closed: true });
      continue;
    }
    if (/24\s*hours|open 24/i.test(text)) {
      out.push({ day, opens: "00:00", closes: "23:59" });
      continue;
    }

    // Only the first range is kept: a split shift is rare and the profile page
    // shows one line per day.
    const range = text.split(/,|;/)[0].split(/\s+to\s+|\s*[-\u2013\u2014]\s*/);
    const opens = range[0] ? toClock(range[0]) : null;
    const closes = range[1] ? toClock(range[1]) : null;
    out.push(opens && closes ? { day, opens, closes } : { day, closed: false });
  }

  return out;
}

/* ----------------------------------------------------------------- publish */

async function finish(batchId: string): Promise<Advance> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: { include: { subservices: true } } },
  });
  if (!batch) return { changed: false, note: "gone" };

  try {
    const items = await db.importItem.findMany({
      where: { batchId, status: "WRITTEN" },
      orderBy: { gmbRank: "asc" },
      include: { city: true },
      take: 25,
    });

    if (items.length > 0) {
      let published = 0;
      for (const item of items) {
        const created = await createBusiness(item.id, batch);
        if (created.published) published += 1;
      }
      await db.importBatch.update({
        where: { id: batchId },
        data: { published: { increment: published } },
      });
      return { changed: true, note: `imported ${items.length}` };
    }

    // A batch that scraped places and wrote none of them has not finished, it
    // has failed. Reporting "done" over an empty result is how a broken run
    // looks like a working one.
    const stuck = await db.importItem.count({ where: { batchId, status: "FAILED" } });
    if (batch.written === 0 && stuck > 0) {
      await db.importBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error:
            batch.error ??
            `All ${stuck} listings failed to write. Open one to see why, fix the cause, then resume.`,
        },
      });
      return { changed: true, note: `failed: nothing written of ${stuck}` };
    }

    if (batch.buildRanking) await buildRankings(batchId);

    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "DONE", finishedAt: new Date() },
    });
    return { changed: true, note: "done" };
  } catch (error) {
    return fail(batchId, error);
  }
}

type Draft = {
  slug: string;
  focusKeyword: string;
  path: string;
  tagline: string;
  overview: string;
  description: string;
  editorialTake: string;
  bestFor: string;
  strengths: string[];
  considerations: string[];
  services: string[];
  faqs: { question: string; answer: string }[];
  seoTitle: string;
  seoDescription: string;
  extraKeywords: string[];
};

async function createBusiness(
  itemId: string,
  batch: {
    id: string;
    categoryId: string;
    autoPublishScore: number;
    category: { serviceName: string; subservices: { id: string; name: string }[] };
  },
): Promise<{ published: boolean }> {
  const item = await db.importItem.findUnique({ where: { id: itemId } });
  if (!item?.draft) return { published: false };

  const draft = JSON.parse(item.draft) as Draft;
  const place = JSON.parse(item.raw ?? "{}") as PlaceRecord;
  const site = item.site ? (JSON.parse(item.site) as SiteData) : null;

  // Photos from Google first, because they are of the work rather than of the
  // brand, then whatever the company publishes on its own site.
  // Google's photos first, because they are of the work rather than of the
  // brand, then whatever the company publishes on its own site.
  const photos = [
    ...(place.imageUrls ?? []).map((url) => ({ url, alt: null as string | null })),
    ...(site?.images ?? []),
  ]
    .filter(
      (photo, index, all) => all.findIndex((other) => other.url === photo.url) === index,
    )
    .slice(0, 10);
  const image = photos[0]?.url ?? null;

  const yearFounded = site?.yearFounded ?? null;
  const licenseNumber = site?.licenseNumbers[0] ?? null;

  const publish = item.seoScore >= batch.autoPublishScore;

  const business = await db.business.create({
    data: {
      name: item.name,
      slug: draft.slug,
      categoryId: batch.categoryId,
      cityId: item.cityId,
      tagline: draft.tagline,
      overview: draft.overview,
      description: draft.description,
      editorialTake: draft.editorialTake,
      bestFor: draft.bestFor,
      strengths: stringify(draft.strengths),
      considerations: stringify(draft.considerations),
      website: item.website,
      phone: item.phone,
      email: item.email,
      emailSource: item.emailSource,
      addressLine: item.addressLine,
      postalCode: place.postalCode,
      hours: stringify(parseGoogleHours(place.openingHours)),
      placeId: item.placeId,
      latitude: place.latitude,
      longitude: place.longitude,
      gmbRank: item.gmbRank,
      gmbQuery: place.searchString,
      googleRating: item.rating,
      googleReviewCount: item.reviewCount,
      googleDistribution: place.reviewDistribution ? stringify(place.reviewDistribution) : null,
      googleDataUpdated: new Date(),
      logoUrl: site?.logo ?? null,
      socialLinks: site && Object.keys(site.social).length > 0 ? stringify(site.social) : null,
      siteCrawledAt: site ? new Date(site.crawledAt) : null,
      yearFounded,
      licenseNumber,
      importedAt: new Date(),
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
    },
  });

  // Photos, matched to the subservices the writer named, then the FAQ block.
  if (photos.length > 0) {
    await db.businessPhoto.createMany({
      data: photos.map((photo, index) => ({
        businessId: business.id,
        url: photo.url,
        alt: photo.alt ?? `${item.name} in ${place.city ?? ""}`.trim(),
        sortOrder: index,
      })),
    });
  }

  // A licence read off the company's own site is what it claims, not what a
  // register confirms, so it is recorded as reported and waits for a check.
  if (licenseNumber) {
    await db.credential.create({
      data: {
        businessId: business.id,
        label: `${batch.category.serviceName} licence`,
        identifier: licenseNumber,
        status: "REPORTED",
        sourceUrl: item.website,
      },
    });
  }

  // Reviews Google returned with the place, and the areas the company can
  // reach. Both are best-effort: a listing is still a listing without them.
  if (place.reviews?.length) {
    await saveReviews(business.id, place.reviews).catch(() => undefined);
  }
  await fillServiceAreas(business.id).catch(() => undefined);

  const wanted = draft.services.map((service) => normalizeName(service));
  const matched = batch.category.subservices.filter((subservice) =>
    wanted.some((service) => {
      const target = normalizeName(subservice.name);
      return service === target || service.includes(target) || target.includes(service);
    }),
  );
  if (matched.length > 0) {
    await db.businessService.createMany({
      data: matched.map((subservice) => ({ businessId: business.id, subserviceId: subservice.id })),
    });
  }

  await db.faq.createMany({
    data: draft.faqs.map((faq, index) => ({
      question: faq.question,
      answer: faq.answer,
      scope: "BUSINESS",
      businessId: business.id,
      sortOrder: index,
    })),
  });

  const body = [
    draft.overview,
    draft.description,
    draft.editorialTake,
    ...draft.strengths,
    ...draft.considerations,
    ...draft.faqs.map((faq) => `${faq.question} ${faq.answer}`),
  ].join("\n\n");

  const analysis = analyzeSeo({
    title: draft.seoTitle,
    description: draft.seoDescription,
    focusKeyword: draft.focusKeyword,
    slug: draft.path,
    content: body,
    hasImage: Boolean(image),
    internalLinks: 3,
  });

  await db.seoMeta.create({
    data: {
      entityType: "business",
      entityId: business.id,
      title: draft.seoTitle,
      description: draft.seoDescription,
      focusKeyword: draft.focusKeyword,
      extraKeywords: stringify(draft.extraKeywords),
      ogImage: image,
      ogTitle: draft.seoTitle,
      ogDescription: draft.seoDescription,
      schemaType: "LocalBusiness",
      score: analysis.score,
      analysis: JSON.stringify(analysis.checks),
    },
  });

  await recomputeCompleteness(business.id);

  await db.importItem.update({
    where: { id: item.id },
    data: { status: "IMPORTED", businessId: business.id, seoScore: analysis.score },
  });

  return { published: publish };
}

/* ---------------------------------------------------------------- rankings */

/**
 * Builds or refreshes the city ranking from the order Google returned. The
 * ranking itself is left as a draft when the batch published nothing, so an
 * empty list never goes live.
 */
async function buildRankings(batchId: string): Promise<void> {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { category: true },
  });
  if (!batch) return;

  const cityIds = JSON.parse(batch.cityIds) as string[];

  for (const cityId of cityIds) {
    const city = await db.city.findUnique({
      where: { id: cityId },
      include: { region: { include: { country: true } } },
    });
    if (!city) continue;

    const businesses = await db.business.findMany({
      where: { cityId, categoryId: batch.categoryId, status: "PUBLISHED" },
      orderBy: [{ gmbRank: "asc" }, { googleRating: "desc" }],
      take: batch.rankingSize,
    });
    if (businesses.length === 0) continue;

    const title = `${businesses.length} Best ${batch.category.name} in ${city.name}, ${city.region.code.toUpperCase()}`;
    const slug = slugify(`${batch.category.slug}-${city.slug}`);
    const summary =
      `${businesses[0].name} leads this list of ${batch.category.name.toLowerCase()} in ${city.name}. ` +
      `Positions follow the order these companies appear in Google Maps for this trade and city, read on ${fullDate(new Date())}. ` +
      `Every profile records where its rating and contact details came from.`;

    const existing = await db.ranking.findUnique({
      where: { categoryId_cityId: { categoryId: batch.categoryId, cityId } },
    });

    const ranking = existing
      ? await db.ranking.update({
          where: { id: existing.id },
          data: {
            title,
            summary,
            companiesReviewed: businesses.length,
            lastReviewedAt: new Date(),
          },
        })
      : await db.ranking.create({
          data: {
            title,
            slug,
            categoryId: batch.categoryId,
            cityId,
            regionId: city.regionId,
            countryId: city.region.countryId,
            summary,
            methodologyNote:
              "This list was assembled from Google Maps results for the trade and city, then each company was written up from its own public profile. Positions follow Google's order and are not an editorial judgement until an editor reviews them.",
            companiesReviewed: businesses.length,
            status: "PUBLISHED",
            publishedAt: new Date(),
            lastReviewedAt: new Date(),
          },
        });

    // Replace the entries wholesale: a re-run should reflect the new order
    // rather than merge two orders together.
    await db.rankingEntry.deleteMany({ where: { rankingId: ranking.id } });
    await db.rankingEntry.createMany({
      data: businesses.map((business, index) => ({
        rankingId: ranking.id,
        businessId: business.id,
        position: index + 1,
        designation: business.bestFor,
        whyPicked: business.editorialTake,
        likes: business.strengths,
        concerns: business.considerations,
      })),
    });
  }
}
