import { getSecret } from "./secrets";

// Google Maps scraping goes through Apify's Google Maps Scraper. The actor id
// is configurable so a swap does not need a deploy, but this is the one the
// field mapping below was written against.
const DEFAULT_ACTOR = "compass~crawler-google-places";
const API = "https://api.apify.com/v2";

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
  rank: number | null;
  searchString: string | null;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  raw: Record<string, unknown>;
};

export class ApifyError extends Error {}

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
    throw new ApifyError(`Apify ${init?.method ?? "GET"} ${path} returned ${response.status}. ${body.slice(0, 300)}`);
  }
  return response;
}

export async function apifyToken(): Promise<string> {
  const token = await getSecret("apify.token");
  if (!token) throw new ApifyError("No Apify token is set. Add one under Admin, Integrations.");
  return token;
}

/** Starts a run and returns its id. The worker polls rather than blocking. */
export async function startPlacesRun(input: {
  queries: string[];
  perQuery: number;
  language: string;
  actor?: string;
}): Promise<string> {
  const token = await apifyToken();
  const actor = input.actor ?? DEFAULT_ACTOR;

  const body = {
    searchStringsArray: input.queries,
    maxCrawledPlacesPerSearch: input.perQuery,
    language: input.language,
    // Ratings and counts are enough: the site shows the aggregate with a
    // disclosure and never republishes anyone's review text.
    maxReviews: 0,
    // A few photos, because a listing with no image cannot reach a full SEO
    // score and the profile page has a gallery to fill.
    maxImages: 3,
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
    imageUrls: [...new Set(images)].slice(0, 3),
    rank: pickNum("rank", "position", "searchPageRank"),
    searchString: pick("searchString", "searchQuery"),
    permanentlyClosed: row.permanentlyClosed === true,
    temporarilyClosed: row.temporarilyClosed === true,
    raw: row,
  };
}
