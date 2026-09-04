import { db } from "./db";
import { crawlSite, type SiteData } from "./site-crawl";
import { extractAsk, extractFromSite, extractionSchema, type Extraction } from "./site-extract";
import { fillServiceAreas, recordNamedAreas } from "./geo";
import { channelIdFor, latestChannelVideos, videoMeta } from "./youtube";
import { normalizeName } from "./enrich";
import {
  jsonBatchReady,
  PermanentError,
  readJsonBatch,
  submitJsonBatch,
  type BatchAsk,
  type BatchOutcome,
  type Effort,
} from "./anthropic";
import { stringify } from "./json";
import { recomputeCompleteness } from "./completeness";

// Filling in what a listing is missing from the company's own website.
//
// The rule the whole thing turns on: it never overwrites. A field an editor
// filled, or the writer produced, is left exactly as it is. Enrichment only
// ever puts something where there was nothing, which means it can be re-run on
// anything at any time without anyone having to check what it might undo.

const SLICE = 3;

/**
 * How many websites go out in one wave when the model is reading them. The
 * batch tier answers the whole wave at once for half the price, and the crawls
 * that feed it are network waits that run together, so the wave can be much
 * larger than a slice done one company at a time.
 */
const WAVE = 20;

export type EnrichAdvance = { changed: boolean; note: string };

export type EnrichEntry = {
  business: string;
  filled: string[];
  staff: number;
  photos: number;
  note: string | null;
};

export async function queueEnrichment(input: {
  businessIds: string[];
  batchId?: string;
  useModel?: boolean;
  userId?: string;
}): Promise<{ id: string; requested: number }> {
  // A company with no website has nothing to read, so it never enters the run.
  const withSites = await db.business.findMany({
    where: { id: { in: input.businessIds }, website: { not: null } },
    select: { id: true },
  });

  const run = await db.enrichRun.create({
    data: {
      businessIds: JSON.stringify(withSites.map((row) => row.id)),
      batchId: input.batchId ?? null,
      useModel: input.useModel ?? true,
      requested: withSites.length,
      skipped: input.businessIds.length - withSites.length,
      createdById: input.userId,
    },
  });

  return { id: run.id, requested: withSites.length };
}

/** One step, called by the worker until the run stops changing. */
export async function advanceEnrichment(runId: string): Promise<EnrichAdvance> {
  const run = await db.enrichRun.findUnique({ where: { id: runId } });
  if (!run) return { changed: false, note: "gone" };
  if (run.status !== "QUEUED" && run.status !== "RUNNING") {
    return { changed: false, note: run.status.toLowerCase() };
  }

  const ids = JSON.parse(run.businessIds) as string[];
  const done = run.processed;

  if (done >= ids.length) {
    await db.enrichRun.update({
      where: { id: runId },
      data: { status: "DONE", finishedAt: new Date() },
    });
    return {
      changed: true,
      note: `done: ${run.fieldsFilled} fields, ${run.photosAdded} photos, ${run.staffFound} people across ${run.processed} companies`,
    };
  }

  if (run.status === "QUEUED") {
    await db.enrichRun.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  if (run.extractBatchId) return collectReadingWave(run, run.extractBatchId);
  if (run.useModel) return submitReadingWave(run, ids);
  return readDirectly(run, ids.slice(done, done + SLICE));
}

/** The model and the effort, as settings, so a backfill can be run cheaper. */
function modelOptions(): { model?: string; effort: Effort } {
  return {
    model: process.env.IMPORT_MODEL || undefined,
    effort: (process.env.IMPORT_EFFORT as Effort | undefined) ?? "low",
  };
}

type RunRow = { id: string; report: string | null; pending: string | null };
type Tally = { entries: EnrichEntry[]; fields: number; staff: number; photos: number };

function newTally(): Tally {
  return { entries: [], fields: 0, staff: 0, photos: 0 };
}

function count(into: Tally, entry: EnrichEntry): void {
  into.entries.push(entry);
  into.fields += entry.filled.length;
  into.staff += entry.staff;
  into.photos += entry.photos;
}

/** Writes one tick's worth of results and says what happened in one line. */
async function record(
  run: RunRow,
  processed: number,
  into: Tally,
  extra: Record<string, unknown> = {},
): Promise<EnrichAdvance> {
  const existing = run.report ? (JSON.parse(run.report) as EnrichEntry[]) : [];
  await db.enrichRun.update({
    where: { id: run.id },
    data: {
      processed: { increment: processed },
      fieldsFilled: { increment: into.fields },
      staffFound: { increment: into.staff },
      photosAdded: { increment: into.photos },
      report: JSON.stringify([...existing, ...into.entries].slice(-200)),
      ...extra,
    },
  });
  return {
    changed: true,
    note: `${processed} read, ${into.fields} fields, ${into.photos} photos, ${into.staff} people`,
  };
}

/** A run that cannot continue: a dead key, no credits, a model it cannot use. */
async function stopRun(runId: string, error: PermanentError): Promise<EnrichAdvance> {
  await db.enrichRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      error: `${error.message} ${error.hint}`.slice(0, 900),
      finishedAt: new Date(),
    },
  });
  return { changed: true, note: `stopped: ${error.message}` };
}

/** One company that could not be read, as the line the report will show. */
function skipped(business: string, note: string): EnrichEntry {
  return { business, filled: [], staff: 0, photos: 0, note };
}

/**
 * The parser-only run. Nothing here costs anything, so it stays a small slice
 * done in place rather than a wave with a wait in the middle of it.
 */
async function readDirectly(run: RunRow, slice: string[]): Promise<EnrichAdvance> {
  const into = newTally();

  for (const businessId of slice) {
    try {
      count(into, await enrichBusiness(businessId, { useModel: false }));
    } catch (error) {
      // A run that stops on the first bad website is useless, so anything that
      // is not a dead API key is recorded against the company and skipped.
      if (error instanceof PermanentError) return stopRun(run.id, error);
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });
      count(
        into,
        skipped(
          business?.name ?? businessId,
          error instanceof Error ? error.message.slice(0, 200) : String(error),
        ),
      );
    }
  }

  return record(run, slice.length, into);
}

/* ------------------------------------------------------------- the model wave */

/**
 * One company whose pages are read and waiting on an answer. The crawl is kept
 * rather than the answer's absence: reading every website twice would double
 * the slowest part of the run for nothing.
 */
type PendingRead = {
  businessId: string;
  name: string;
  site: SiteData | null;
  note?: string;
};

async function submitReadingWave(
  run: RunRow & { processed: number },
  ids: string[],
): Promise<EnrichAdvance> {
  const slice = ids.slice(run.processed, run.processed + WAVE);
  const options = modelOptions();

  // The crawls run together: they are network waits, and this is the part of a
  // run that takes real time.
  const prepared = await Promise.all(
    slice.map(async (businessId): Promise<{ pending: PendingRead; ask: BatchAsk | null }> => {
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          website: true,
          city: { select: { name: true } },
          category: { select: { serviceName: true } },
        },
      });
      if (!business) {
        return {
          pending: { businessId, name: businessId, site: null, note: "That business no longer exists." },
          ask: null,
        };
      }
      if (!business.website) {
        return {
          pending: { businessId, name: business.name, site: null, note: "No website on file." },
          ask: null,
        };
      }

      const site = await crawlSite(business.website);
      if (site.pagesRead === 0) {
        return {
          pending: {
            businessId,
            name: business.name,
            site: null,
            note: "Could not read the website. It may be down, or blocking crawlers.",
          },
          ask: null,
        };
      }

      const ask = extractAsk(
        { name: business.name, city: business.city?.name ?? null, trade: business.category.serviceName },
        site,
        options,
      );
      return {
        pending: { businessId, name: business.name, site },
        // A site with almost no text is not worth a paid read, but its logo,
        // photos and social links still are, so it stays in the wave.
        ask: ask ? { customId: businessId, ...ask } : null,
      };
    }),
  );

  const pending = prepared.map((row) => row.pending);
  const asks = prepared.map((row) => row.ask).filter((ask): ask is BatchAsk => ask !== null);

  // Nobody in this slice had anything to read. There is no wave to wait for, so
  // whatever the parser found is applied now.
  if (asks.length === 0) return applyWave(run, pending, new Map());

  let waveId: string;
  try {
    waveId = await submitJsonBatch(asks);
  } catch (error) {
    if (error instanceof PermanentError) return stopRun(run.id, error);
    throw error;
  }

  await db.enrichRun.update({
    where: { id: run.id },
    data: { extractBatchId: waveId, pending: JSON.stringify(pending) },
  });

  return { changed: true, note: `queued ${asks.length} websites to read` };
}

async function collectReadingWave(run: RunRow, waveId: string): Promise<EnrichAdvance> {
  let ready: boolean;
  try {
    ready = await jsonBatchReady(waveId);
  } catch (error) {
    if (error instanceof PermanentError) return stopRun(run.id, error);
    throw error;
  }
  if (!ready) return { changed: false, note: "the website batch is still running" };

  const pending = JSON.parse(run.pending ?? "[]") as PendingRead[];
  const outcomes = await readJsonBatch(waveId, extractionSchema);
  const answers = new Map(outcomes.map((outcome) => [outcome.customId, outcome]));

  return applyWave(run, pending, answers);
}

/**
 * Fills in every company in the wave. A company the model could not answer for
 * is still worth applying: the logo, the photos, the social links and the
 * founding year all came off the pages themselves.
 */
async function applyWave(
  run: RunRow,
  pending: PendingRead[],
  answers: Map<string, BatchOutcome<Extraction>>,
): Promise<EnrichAdvance> {
  const into = newTally();
  const clear = { extractBatchId: null, pending: null };

  for (const entry of pending) {
    if (!entry.site) {
      count(into, skipped(entry.name, entry.note ?? "Nothing to read."));
      continue;
    }

    const answer = answers.get(entry.businessId);
    try {
      const result = await enrichBusiness(entry.businessId, {
        useModel: true,
        site: entry.site,
        extraction: answer?.ok ? answer.value : null,
      });
      if (answer && !answer.ok) {
        result.note = `${result.note ? `${result.note} ` : ""}${answer.reason}`.slice(0, 200);
      }
      count(into, result);
    } catch (error) {
      if (error instanceof PermanentError) {
        await db.enrichRun.update({ where: { id: run.id }, data: clear });
        return stopRun(run.id, error);
      }
      count(
        into,
        skipped(entry.name, error instanceof Error ? error.message.slice(0, 200) : String(error)),
      );
    }
  }

  return record(run, pending.length, into, clear);
}

/**
 * Reads one company's website and fills the gaps in its listing.
 *
 * Returns what it changed rather than a boolean, because the useful question
 * afterwards is always "what did that actually do".
 */
export async function enrichBusiness(
  businessId: string,
  options: {
    useModel?: boolean;
    model?: string;
    effort?: Effort;
    /// Pages already read, so a batched run does not crawl the same site twice.
    site?: SiteData;
    /// An answer already in hand. Present and null means the model was asked
    /// and had nothing, which is different from never asking it.
    extraction?: Extraction | null;
  } = {},
): Promise<EnrichEntry> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      category: { select: { serviceName: true, id: true } },
      city: { select: { name: true, regionId: true } },
      videos: { select: { videoId: true } },
      photos: { select: { url: true } },
      staff: { select: { name: true } },
      credentials: { select: { identifier: true, label: true } },
      services: { select: { subserviceId: true } },
    },
  });
  if (!business) throw new Error("That business no longer exists.");
  if (!business.website) {
    return { business: business.name, filled: [], staff: 0, photos: 0, note: "No website on file." };
  }

  const site = options.site ?? (await crawlSite(business.website));
  if (site.pagesRead === 0) {
    return {
      business: business.name,
      filled: [],
      staff: 0,
      photos: 0,
      note: "Could not read the website. It may be down, or blocking crawlers.",
    };
  }

  const extraction =
    options.extraction !== undefined
      ? options.extraction
      : options.useModel
        ? await extractFromSite(
            {
              name: business.name,
              city: business.city?.name ?? null,
              trade: business.category.serviceName,
            },
            site,
            { model: options.model, effort: options.effort },
          )
        : null;

  // ------------------------------------------------------------ plain fields
  const data: Record<string, unknown> = {};
  const filled: string[] = [];

  const fill = (field: string, value: unknown, current: unknown) => {
    const empty = current === null || current === undefined || current === "";
    if (!empty || value === null || value === undefined || value === "") return;
    data[field] = value;
    filled.push(field);
  };

  fill("logoUrl", site.logo, business.logoUrl);
  fill("phone", extraction?.phone ?? site.phones[0] ?? null, business.phone);
  // The crawler's best address first: it is scored against the site's own
  // domain and includes anything the structured data declares outright. The
  // model is the fallback for one written in a way no pattern catches.
  const foundEmail = site.emails[0] ?? extraction?.email ?? null;
  fill("email", foundEmail, business.email);
  if (foundEmail && !business.email && !business.emailSource) data.emailSource = "website";
  fill("addressLine", extraction?.addressLine ?? null, business.addressLine);
  fill("yearFounded", extraction?.yearFounded ?? site.yearFounded, business.yearFounded);
  fill("employeeCount", extraction?.employeeCount ?? null, business.employeeCount);
  fill("warrantyTerms", extraction?.warrantyTerms ?? null, business.warrantyTerms);
  fill("licenseNumber", extraction?.licenseNumbers[0] ?? site.licenseNumbers[0] ?? null, business.licenseNumber);
  fill("description", extraction?.summary ?? site.summary, business.description);
  fill(
    "socialLinks",
    Object.keys(site.social).length > 0 ? stringify(site.social) : null,
    business.socialLinks,
  );
  fill(
    "paymentMethods",
    extraction?.paymentMethods.length ? stringify(extraction.paymentMethods) : null,
    business.paymentMethods,
  );
  fill("awards", extraction?.awards.length ? stringify(extraction.awards) : null, business.awards);
  fill("brands", extraction?.brands.length ? stringify(extraction.brands) : null, business.brands);
  fill("tagline", extraction?.tagline ?? null, business.tagline);
  fill("postalCode", extraction?.postalCode ?? null, business.postalCode);
  fill("bestFor", extraction?.bestFor ?? null, business.bestFor);
  fill("serviceRadiusKm", extraction?.serviceRadiusKm ?? null, business.serviceRadiusKm);
  fill("bbbRating", extraction?.bbbRating ?? null, business.bbbRating);
  fill("bbbAccreditedSince", extraction?.bbbAccreditedSince ?? null, business.bbbAccreditedSince);
  fill("inspectionFee", extraction?.inspectionFee ?? null, business.inspectionFee);
  fill("manufacturerWarranty", extraction?.manufacturerWarranty ?? null, business.manufacturerWarranty);
  fill("youtubeChannel", site.social.youtube ?? null, business.youtubeChannel);
  fill(
    "hours",
    extraction?.hours.length ? stringify(extraction.hours) : null,
    business.hours,
  );

  // The three service flags are false by default rather than null, so "already
  // set" cannot be told from "never asked". They are only ever turned on.
  for (const flag of ["emergency", "financing", "freeEstimates", "insured"] as const) {
    if (extraction?.[flag] === true && business[flag] === false) {
      data[flag] = true;
      filled.push(flag);
    }
  }

  data.siteCrawledAt = new Date(site.crawledAt);

  if (Object.keys(data).length > 0) {
    await db.business.update({ where: { id: businessId }, data });
  }

  // ----------------------------------------------------------------- photos
  const have = new Set(business.photos.map((photo) => photo.url));
  const room = Math.max(0, 10 - business.photos.length);
  const newPhotos = site.images.filter((image) => !have.has(image.url)).slice(0, room);
  if (newPhotos.length > 0) {
    await db.businessPhoto.createMany({
      data: newPhotos.map((image, index) => ({
        businessId,
        url: image.url,
        // The site's own caption describes what is in the picture. Falling back
        // to the company name is honest but tells a screen reader nothing, so it
        // is only used when the site gave no alt text at all.
        alt: image.alt ?? `${business.name}${business.city ? ` in ${business.city.name}` : ""}`,
        sortOrder: business.photos.length + index,
      })),
    });
  }

  // ------------------------------------------------------------------ staff
  let staffAdded = 0;
  if (extraction?.staff.length) {
    const known = new Set(business.staff.map((person) => normalizeName(person.name)));
    const fresh = extraction.staff.filter((person) => !known.has(normalizeName(person.name)));
    if (fresh.length > 0) {
      await db.staffMember.createMany({
        data: fresh.map((person, index) => ({
          businessId,
          name: person.name,
          role: person.role,
          bio: person.bio,
          yearsExperience: person.yearsExperience,
          credentials: person.credentials.length > 0 ? stringify(person.credentials) : null,
          sortOrder: business.staff.length + index,
          source: "WEBSITE",
        })),
      });
      staffAdded = fresh.length;
    }
  }

  // ------------------------------------------------------------ credentials
  // Licence numbers and named certifications, both recorded as reported rather
  // than verified: the site printing it is a claim, not a register check.
  const heldIds = new Set(
    business.credentials.map((row) => (row.identifier ?? "").toUpperCase()).filter(Boolean),
  );
  const heldLabels = new Set(business.credentials.map((row) => normalizeName(row.label)));

  const newCredentials: {
    businessId: string;
    label: string;
    identifier?: string;
    imageUrl?: string;
    status: string;
    sourceUrl: string | null;
    sortOrder: number;
  }[] = [];

  // Both sources: the model reads them in context, the parser catches the ones
  // printed in a footer the model never sees because the page was too long.
  const licenceNumbers = [
    ...new Set([...(extraction?.licenseNumbers ?? []), ...site.licenseNumbers]),
  ];

  for (const identifier of licenceNumbers) {
    if (heldIds.has(identifier.toUpperCase())) continue;
    heldIds.add(identifier.toUpperCase());
    newCredentials.push({
      businessId,
      label: `${business.category.serviceName} licence`,
      identifier,
      status: "REPORTED",
      sourceUrl: business.website,
      sortOrder: business.credentials.length + newCredentials.length,
    });
  }

  // A badge image whose alt text matches the certification is attached to it,
  // so the mark and the words arrive as one thing rather than two.
  for (const certification of extraction?.certifications ?? []) {
    const key = normalizeName(certification);
    if (heldLabels.has(key)) continue;
    heldLabels.add(key);

    const badge = site.badges.find((row) => {
      const label = normalizeName(row.label);
      return label.length > 2 && (label.includes(key) || key.includes(label));
    });

    newCredentials.push({
      businessId,
      label: certification,
      imageUrl: badge?.url,
      status: "REPORTED",
      sourceUrl: business.website,
      sortOrder: business.credentials.length + newCredentials.length,
    });
  }

  if (newCredentials.length > 0) {
    await db.credential.createMany({ data: newCredentials });
    filled.push(
      `${newCredentials.length} credential${newCredentials.length === 1 ? "" : "s"}`,
    );
  }

  // --------------------------------------------------------------- services
  // Matched against the subservices this category actually offers, so the
  // services list stays a taxonomy the whole directory can be searched on. A
  // job the site names that has no subservice is not thrown away: it becomes a
  // specialty chip, which is where work too specific for the taxonomy belongs.
  const unmatchedServices: string[] = [];
  if (extraction?.services.length) {
    const offered = await db.subservice.findMany({
      where: { categoryId: business.category.id },
      select: { id: true, name: true },
    });
    const already = new Set(business.services.map((row) => row.subserviceId));

    const matched = new Map<string, { id: string; name: string }>();
    for (const service of extraction.services) {
      const wanted = normalizeName(service);
      const hit = offered.find((subservice) => {
        const target = normalizeName(subservice.name);
        return wanted === target || wanted.includes(target) || target.includes(wanted);
      });
      if (!hit) {
        unmatchedServices.push(service);
        continue;
      }
      if (!already.has(hit.id)) matched.set(hit.id, hit);
    }

    if (matched.size > 0) {
      await db.businessService.createMany({
        data: [...matched.keys()].map((subserviceId) => ({ businessId, subserviceId })),
      });
      filled.push(`${matched.size} service${matched.size === 1 ? "" : "s"}`);
    }
  }

  // ----------------------------------------------------------- specialties
  if (!business.specialties) {
    const chips = [...new Set([...(extraction?.specialties ?? []), ...unmatchedServices])].slice(0, 8);
    if (chips.length > 0) {
      await db.business.update({
        where: { id: businessId },
        data: { specialties: stringify(chips) },
      });
      filled.push("specialties");
    }
  }

  // ------------------------------------------------------------------ areas
  // The towns the site names come first, because a company that lists its
  // suburbs is telling us its coverage directly. The radius then fills in
  // whatever it did not mention, which is what a listing with no such page has
  // to fall back on.
  let areasAdded = 0;
  if (extraction?.areasServed.length && business.city?.regionId) {
    const named = await recordNamedAreas(
      businessId,
      business.city.regionId,
      extraction.areasServed,
    ).catch(() => ({ added: 0, created: 0 }));
    areasAdded += named.added;
  }
  const areas = await fillServiceAreas(businessId).catch(() => ({ added: 0, total: 0 }));
  areasAdded += areas.added;
  if (areasAdded > 0) filled.push(`${areasAdded} area${areasAdded === 1 ? "" : "s"}`);

  // ----------------------------------------------------------------- videos
  const videosAdded = await addVideos(businessId, business.name, business.videos, site, {
    channel: business.youtubeChannel ?? site.social.youtube ?? null,
  });
  if (videosAdded > 0) filled.push(`${videosAdded} video${videosAdded === 1 ? "" : "s"}`);

  // The stored score is what the selection filters read, so it has to move the
  // moment the listing does.
  await recomputeCompleteness(businessId);

  return {
    business: business.name,
    filled,
    staff: staffAdded,
    photos: newPhotos.length,
    note:
      filled.length === 0 && staffAdded === 0 && newPhotos.length === 0
        ? "Read the site, but everything it carries was already on the listing."
        : null,
  };
}

/**
 * Fills the Project Videos section from the two places a small company's work
 * actually shows up: the clips it embeds on its own pages, and its YouTube
 * channel.
 *
 * The channel comes first because its feed carries a real title and a date,
 * which is what the section prints under each card. A clip found on the site
 * has neither unless the iframe was given a title, so it is added afterwards
 * and only to fill the row out. Nothing already on the listing is touched, and
 * the same video met twice is one video.
 */
async function addVideos(
  businessId: string,
  businessName: string,
  existing: { videoId: string }[],
  site: SiteData,
  options: { channel: string | null },
): Promise<number> {
  const ROOM = 6;
  const room = ROOM - existing.length;
  if (room <= 0) return 0;

  const have = new Set(existing.map((row) => row.videoId));
  const rows: { videoId: string; title: string; meta: string | null }[] = [];

  if (options.channel) {
    const channelId = await channelIdFor(options.channel).catch(() => null);
    if (channelId) {
      const latest = await latestChannelVideos(channelId, 3).catch(() => []);
      for (const video of latest) {
        if (have.has(video.videoId)) continue;
        have.add(video.videoId);
        rows.push({
          videoId: video.videoId,
          title: video.title,
          meta: videoMeta(video.publishedAt),
        });
      }
    }
  }

  for (const video of site.videos) {
    if (have.has(video.videoId) || rows.length >= room) continue;
    have.add(video.videoId);
    rows.push({
      videoId: video.videoId,
      title: video.title?.trim() || `${businessName} video`,
      meta: "Embedded on the company's website",
    });
  }

  const wanted = rows.slice(0, room);
  if (wanted.length === 0) return 0;

  await db.businessVideo.createMany({
    data: wanted.map((row, index) => ({
      businessId,
      videoId: row.videoId,
      title: row.title,
      meta: row.meta,
      sortOrder: existing.length + index,
    })),
  });
  return wanted.length;
}
