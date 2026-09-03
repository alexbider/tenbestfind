import { getSecret } from "./secrets";

// Google Maps scraping goes through Apify's Google Maps Scraper. The actor id
// is configurable so a swap does not need a deploy, but this is the one the
// field mapping below was written against.
const DEFAULT_ACTOR = "compass~crawler-google-places";
const API = "https://api.apify.com/v2";

// How many reviews to pull per company. Ten gives the profile five to show and
// a few in reserve for the ones that turn out to be a bare star with no words.
export const REVIEWS_PER_PLACE = 10;

export type PlaceReview = {
  externalId: string | null;
  author: string;
  authorPhoto: string | null;
  rating: number;
  body: string;
  postedAt: Date | null;
  url: string | null;
  ownerReply: string | null;
  ownerRepliedAt: Date | null;
  likes: number;
};

export type PlaceRecord = {
  placeId: string | null;
  title: string;
  categoryName: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  reviewDistribution: Record<string, number> | null;
  openingHours: { day: string; hours: string }[] | null;
  imageUrls: string[];
  reviews: PlaceReview[];
  rank: number | null;
  searchString: string | null;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  raw: Record<string, unknown>;
};

export class ApifyError extends Error {}

/** A failure that a retry will not fix: a bad token, no plan, a missing actor. */
export class ApifyPermanentError extends ApifyError {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
  }
}

async function call(path: string, token: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");

    if (response.status === 401 || response.status === 403) {
      throw new ApifyPermanentError(
        "Apify rejected the token.",
        "Check the Apify API token under Admin, Integrations. It may have been revoked, or it may belong to a different account.",
      );
    }
    if (response.status === 404) {
      throw new ApifyPermanentError(
        "That Apify actor does not exist for this account.",
        "The Google Maps scraper may need to be added to the account first at apify.com/store.",
      );
    }
    if (response.status === 402) {
      throw new ApifyPermanentError(
        "The Apify account is out of credit.",
        "Top it up at console.apify.com, then resume the batch.",
      );
    }

    throw new ApifyError(
      `Apify ${init?.method ?? "GET"} ${path} returned ${response.status}. ${body.slice(0, 300)}`,
    );
  }
  return response;
}

export async function apifyToken(): Promise<string> {
  const token = await getSecret("apify.token");
  if (!token) {
    throw new ApifyPermanentError(
      "No Apify token is set.",
      "Add one under Admin, Integrations, then resume the batch.",
    );
  }
  return token;
}

/** Starts a run and returns its id. The worker polls rather than blocking. */
export async function startPlacesRun(input: {
  queries: string[];
  perQuery: number;
  language: string;
  maxReviews?: number;
  actor?: string;
}): Promise<string> {
  const token = await apifyToken();
  const actor = input.actor ?? DEFAULT_ACTOR;

  const body = {
    searchStringsArray: input.queries,
    maxCrawledPlacesPerSearch: input.perQuery,
    language: input.language,
    // Reviews are quoted on the profile with the reviewer's name, the date and
    // a link back to Google, never blended into a score of our own.
    maxReviews: input.maxReviews ?? REVIEWS_PER_PLACE,
    reviewsSort: "newest",
    // Enough photos for the gallery. A listing with no image cannot reach a
    // full SEO score and the profile page has a row to fill.
    maxImages: 8,
    scrapePlaceDetailPage: true,
    scrapeContacts: true,
    skipClosedPlaces: true,
  };

  const response = await call(`/acts/${actor}/runs`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { data?: { id?: string } };
  if (!json.data?.id) throw new ApifyError("Apify accepted the run but returned no run id.");
  return json.data.id;
}

export type RunState = {
  status: string;
  finished: boolean;
  failed: boolean;
  datasetId: string | null;
};

export async function runState(runId: string): Promise<RunState> {
  const token = await apifyToken();
  const response = await call(`/actor-runs/${runId}`, token);
  const json = (await response.json()) as {
    data?: { status?: string; defaultDatasetId?: string };
  };
  const status = json.data?.status ?? "UNKNOWN";
  return {
    status,
    finished: ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status),
    failed: ["FAILED", "ABORTED", "TIMED-OUT"].includes(status),
    datasetId: json.data?.defaultDatasetId ?? null,
  };
}

export async function abortRun(runId: string): Promise<void> {
  const token = await apifyToken();
  await call(`/actor-runs/${runId}/abort`, token, { method: "POST" }).catch(() => undefined);
}

/** Reads the whole dataset in pages and maps it onto our own shape. */
export async function readPlaces(datasetId: string): Promise<PlaceRecord[]> {
  const token = await apifyToken();
  const out: PlaceRecord[] = [];
  const limit = 500;

  for (let offset = 0; ; offset += limit) {
    const response = await call(`/datasets/${datasetId}/items?clean=true&offset=${offset}&limit=${limit}`, token);
    const page = (await response.json()) as Record<string, unknown>[];
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page.map(mapPlace));
    if (page.length < limit) break;
  }

  return out;
}

const str = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const num = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Re-reads a set of places by their Google place id. Used by the review
 * refresh, which needs current reviews for companies already in the directory
 * rather than a fresh search.
 */
export async function startPlaceIdsRun(input: {
  placeIds: string[];
  maxReviews?: number;
  language?: string;
  actor?: string;
}): Promise<string> {
  const token = await apifyToken();
  const actor = input.actor ?? DEFAULT_ACTOR;

  const body = {
    // The actor accepts a Maps URL carrying the place id, which is the form
    // that works whether or not the company still appears in search.
    startUrls: input.placeIds.map((placeId) => ({
      url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    })),
    maxReviews: input.maxReviews ?? REVIEWS_PER_PLACE,
    reviewsSort: "newest",
    maxImages: 0,
    scrapePlaceDetailPage: true,
    scrapeContacts: false,
    language: input.language ?? "en",
  };

  const response = await call(`/acts/${actor}/runs`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { data?: { id?: string } };
  if (!json.data?.id) throw new ApifyError("Apify accepted the run but returned no run id.");
  return json.data.id;
}

const date = (value: unknown): Date | null => {
  const text = str(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** One review from the actor's `reviews` array, tolerant of its field names. */
function mapReview(row: Record<string, unknown>): PlaceReview | null {
  const body = str(row.text) ?? str(row.reviewText) ?? "";
  const rating = num(row.stars) ?? num(row.rating) ?? null;
  if (rating === null) return null;

  return {
    externalId: str(row.reviewId) ?? str(row.id) ?? null,
    author: str(row.name) ?? str(row.reviewerName) ?? "A Google user",
    authorPhoto: str(row.reviewerPhotoUrl) ?? str(row.reviewerAvatar) ?? null,
    rating,
    body,
    postedAt: date(row.publishedAtDate) ?? date(row.publishAt) ?? date(row.reviewedAt),
    url: str(row.reviewUrl) ?? str(row.url) ?? null,
    ownerReply: str(row.responseFromOwnerText) ?? null,
    ownerRepliedAt: date(row.responseFromOwnerDate),
    likes: num(row.likesCount) ?? 0,
  };
}

/**
 * The actor's field names have drifted over versions, so each value is read
 * from the spellings seen in the wild rather than a single key.
 */
export function mapPlace(row: Record<string, unknown>): PlaceRecord {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = str(row[key]);
      if (value) return value;
    }
    return null;
  };
  const pickNum = (...keys: string[]) => {
    for (const key of keys) {
      const value = num(row[key]);
      if (value !== null) return value;
    }
    return null;
  };

  const location = (row.location ?? {}) as Record<string, unknown>;
  const emails = Array.isArray(row.emails) ? row.emails.map(String) : [];

  const distributionRaw = (row.reviewsDistribution ?? null) as Record<string, unknown> | null;
  const reviewDistribution = distributionRaw
    ? Object.fromEntries(
        (["oneStar", "twoStar", "threeStar", "fourStar", "fiveStar"] as const)
          .map((key, index) => [String(index + 1), num(distributionRaw[key]) ?? 0] as const)
          .filter(([, count]) => count > 0),
      )
    : null;

  const hoursRaw = Array.isArray(row.openingHours) ? (row.openingHours as Record<string, unknown>[]) : null;

  const images = [
    ...(Array.isArray(row.imageUrls) ? row.imageUrls.map(String) : []),
    ...(Array.isArray(row.images)
      ? (row.images as Record<string, unknown>[]).map((image) => str(image.imageUrl) ?? "")
      : []),
    str(row.imageUrl) ?? "",
  ].filter((url) => url.startsWith("http"));

  return {
    placeId: pick("placeId", "place_id", "cid"),
    title: pick("title", "name") ?? "Unnamed",
    categoryName: pick("categoryName", "category"),
    address: pick("address", "formattedAddress"),
    street: pick("street"),
    city: pick("city"),
    state: pick("state", "administrativeArea"),
    postalCode: pick("postalCode", "postcode", "zip"),
    countryCode: pick("countryCode"),
    phone: pick("phone", "phoneUnformatted", "internationalPhoneNumber"),
    website: pick("website", "url", "webSite"),
    email: emails.find((value) => value.includes("@")) ?? null,
    latitude: num(location.lat) ?? pickNum("latitude", "lat"),
    longitude: num(location.lng) ?? pickNum("longitude", "lng"),
    rating: pickNum("totalScore", "rating", "score"),
    reviewCount: pickNum("reviewsCount", "userRatingCount", "reviewCount"),
    reviewDistribution,
    openingHours: hoursRaw
      ? hoursRaw
          .map((entry) => ({ day: str(entry.day) ?? "", hours: str(entry.hours) ?? "" }))
          .filter((entry) => entry.day.length > 0)
      : null,
    imageUrls: [...new Set(images)].slice(0, 8),
    reviews: (Array.isArray(row.reviews) ? (row.reviews as Record<string, unknown>[]) : [])
      .map(mapReview)
      .filter((review): review is PlaceReview => review !== null),
    rank: pickNum("rank", "position", "searchPageRank"),
    searchString: pick("searchString", "searchQuery"),
    permanentlyClosed: row.permanentlyClosed === true,
    temporarilyClosed: row.temporarilyClosed === true,
    raw: row,
  };
}
