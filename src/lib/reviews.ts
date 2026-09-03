import { db } from "./db";
import {
  ApifyPermanentError,
  readPlaces,
  runState,
  startPlaceIdsRun,
  REVIEWS_PER_PLACE,
  type PlaceReview,
} from "./apify";

// Google reviews are read through the same Apify actor the importer uses, then
// stored with the reviewer's name, the date and a link back to the review. They
// are quoted, never averaged into a score of our own and never edited.
//
// A refresh is a row rather than a promise held in a request, so it survives a
// deploy, shows its progress on screen, and can be retried after an Apify
// outage without anyone having to remember which companies were in it.

/** How many places one refresh run covers. Beyond this the run gets slow and
 * a failure costs more than it should, so a large refresh is split. */
export const REFRESH_CHUNK = 50;

export type RefreshAdvance = { changed: boolean; note: string };

/**
 * Writes a place's reviews against a business. Reviews already stored are
 * matched on the id Google gave them, so an edited review updates in place and
 * a re-run does not duplicate anything.
 */
export async function saveReviews(
  businessId: string,
  reviews: PlaceReview[],
  keep: number = REVIEWS_PER_PLACE,
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  const usable = reviews
    .filter((review) => review.rating > 0)
    .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
    .slice(0, keep);

  for (const review of usable) {
    const data = {
      author: review.author,
      authorPhoto: review.authorPhoto,
      rating: review.rating,
      body: review.body,
      postedAt: review.postedAt ?? new Date(),
      sourceUrl: review.url,
      ownerReply: review.ownerReply,
      ownerRepliedAt: review.ownerRepliedAt,
      likes: review.likes,
      fetchedAt: new Date(),
    };

    // Without an id from Google there is nothing stable to match on, so the
    // author and the date stand in for one.
    const existing = review.externalId
      ? await db.review.findFirst({
          where: { businessId, source: "GOOGLE", externalId: review.externalId },
          select: { id: true },
        })
      : await db.review.findFirst({
          where: { businessId, source: "GOOGLE", author: review.author, postedAt: data.postedAt },
          select: { id: true },
        });

    if (existing) {
      await db.review.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await db.review.create({
        data: { businessId, source: "GOOGLE", externalId: review.externalId, ...data },
      });
      added += 1;
    }
  }

  // Keep the newest `keep` and drop the rest, so a company that has been
  // refreshed for years does not accumulate hundreds of rows nobody reads.
  const all = await db.review.findMany({
    where: { businessId, source: "GOOGLE" },
    orderBy: { postedAt: "desc" },
    select: { id: true },
  });
  if (all.length > keep) {
    await db.review.deleteMany({ where: { id: { in: all.slice(keep).map((row) => row.id) } } });
  }

  await db.business.update({ where: { id: businessId }, data: { reviewsUpdatedAt: new Date() } });
  return { added, updated };
}

/**
 * Queues a refresh. Companies with no Google place id are dropped here rather
 * than failing the run later: there is nothing to look them up by.
 */
export async function queueRefresh(input: {
  businessIds: string[];
  maxReviews?: number;
  userId?: string;
}): Promise<{ id: string; requested: number; skipped: number }> {
  const withPlaceIds = await db.business.findMany({
    where: { id: { in: input.businessIds }, placeId: { not: null } },
    select: { id: true },
  });

  const refresh = await db.reviewRefresh.create({
    data: {
      businessIds: JSON.stringify(withPlaceIds.map((row) => row.id)),
      maxReviews: input.maxReviews ?? REVIEWS_PER_PLACE,
      requested: withPlaceIds.length,
      createdById: input.userId,
    },
  });

  return {
    id: refresh.id,
    requested: withPlaceIds.length,
    skipped: input.businessIds.length - withPlaceIds.length,
  };
}

/** One step of a refresh, called by the worker until it stops changing. */
export async function advanceRefresh(refreshId: string): Promise<RefreshAdvance> {
  const refresh = await db.reviewRefresh.findUnique({ where: { id: refreshId } });
  if (!refresh) return { changed: false, note: "gone" };

  try {
    if (refresh.status === "QUEUED") return await startRefresh(refresh.id);
    if (refresh.status === "RUNNING") return await collectRefresh(refresh.id);
    return { changed: false, note: refresh.status.toLowerCase() };
  } catch (error) {
    const message =
      error instanceof ApifyPermanentError
        ? `${error.message} ${error.hint}`
        : error instanceof Error
          ? error.message
          : String(error);
    await db.reviewRefresh.update({
      where: { id: refreshId },
      data: { status: "FAILED", error: message.slice(0, 900), finishedAt: new Date() },
    });
    return { changed: true, note: `failed: ${message}` };
  }
}

async function startRefresh(refreshId: string): Promise<RefreshAdvance> {
  const refresh = await db.reviewRefresh.findUniqueOrThrow({ where: { id: refreshId } });
  const ids = JSON.parse(refresh.businessIds) as string[];

  const businesses = await db.business.findMany({
    where: { id: { in: ids }, placeId: { not: null } },
    select: { placeId: true },
    take: REFRESH_CHUNK,
  });
  const placeIds = businesses.map((row) => row.placeId).filter((id): id is string => Boolean(id));

  if (placeIds.length === 0) {
    await db.reviewRefresh.update({
      where: { id: refreshId },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        error: "None of those companies has a Google place id on file.",
      },
    });
    return { changed: true, note: "nothing to refresh" };
  }

  const runId = await startPlaceIdsRun({ placeIds, maxReviews: refresh.maxReviews });
  await db.reviewRefresh.update({
    where: { id: refreshId },
    data: { status: "RUNNING", apifyRunId: runId, startedAt: new Date() },
  });
  return { changed: true, note: `run ${runId} started for ${placeIds.length} companies` };
}

async function collectRefresh(refreshId: string): Promise<RefreshAdvance> {
  const refresh = await db.reviewRefresh.findUniqueOrThrow({ where: { id: refreshId } });
  if (!refresh.apifyRunId) throw new Error("The refresh is running but has no Apify run id.");

  const state = await runState(refresh.apifyRunId);
  if (!state.finished) return { changed: false, note: state.status.toLowerCase() };
  if (state.failed || !state.datasetId) {
    throw new Error(`The Apify run ${state.status.toLowerCase()}.`);
  }

  const places = await readPlaces(state.datasetId);
  const wanted = JSON.parse(refresh.businessIds) as string[];
  const businesses = await db.business.findMany({
    where: { id: { in: wanted } },
    select: { id: true, placeId: true },
  });
  const byPlaceId = new Map(
    businesses.filter((row) => row.placeId).map((row) => [row.placeId as string, row.id]),
  );

  let added = 0;
  let updated = 0;
  let touched = 0;

  for (const place of places) {
    const businessId = place.placeId ? byPlaceId.get(place.placeId) : undefined;
    if (!businessId) continue;

    const counts = await saveReviews(businessId, place.reviews, refresh.maxReviews);
    added += counts.added;
    updated += counts.updated;
    touched += 1;

    // The aggregate moves with the reviews, so it is rewritten in the same
    // pass. A refresh that finds a lower rating should show a lower rating.
    await db.business.update({
      where: { id: businessId },
      data: {
        googleRating: place.rating ?? undefined,
        googleReviewCount: place.reviewCount ?? undefined,
        googleDistribution: place.reviewDistribution
          ? JSON.stringify(place.reviewDistribution)
          : undefined,
        googleDataUpdated: new Date(),
      },
    });
  }

  await db.reviewRefresh.update({
    where: { id: refreshId },
    data: {
      status: "DONE",
      added,
      updated,
      requested: touched,
      finishedAt: new Date(),
      error:
        touched === 0
          ? "The run finished but returned nothing that matched a company in the directory."
          : null,
    },
  });

  return { changed: true, note: `${touched} companies, ${added} new reviews, ${updated} updated` };
}
