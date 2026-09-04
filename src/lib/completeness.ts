import { db } from "./db";
import { parseJson, parseList } from "./json";

// How complete a listing is, as a number out of 100 and a list of what is
// missing.
//
// The weights are not evenly spread. They follow what actually makes a listing
// worth reading and worth ranking: a profile with no description and no photos
// is a stub whatever else it carries, while a missing warranty note is a
// detail. The list of gaps matters more than the number, because the number
// only tells you there is a problem and the list tells you which one.

export type Gap = {
  /** The stable key a filter can select on. */
  key: string;
  /** What to tell an editor is missing. */
  label: string;
  points: number;
  /** True when the website crawl can plausibly fill it. */
  fromWebsite: boolean;
};

/** Every gap the score knows about, in the order they matter. */
export const GAPS: Gap[] = [
  { key: "description", label: "Description", points: 12, fromWebsite: true },
  { key: "overview", label: "Quick overview", points: 8, fromWebsite: false },
  { key: "photos", label: "Photos", points: 12, fromWebsite: true },
  { key: "logo", label: "Logo", points: 8, fromWebsite: true },
  { key: "services", label: "Services offered", points: 8, fromWebsite: true },
  { key: "credentials", label: "Credentials", points: 8, fromWebsite: true },
  { key: "phone", label: "Phone number", points: 6, fromWebsite: true },
  { key: "email", label: "Email address", points: 6, fromWebsite: true },
  { key: "website", label: "Website", points: 4, fromWebsite: false },
  { key: "address", label: "Address", points: 4, fromWebsite: true },
  { key: "hours", label: "Opening hours", points: 4, fromWebsite: true },
  { key: "areas", label: "Service areas", points: 4, fromWebsite: true },
  { key: "reviews", label: "Google reviews", points: 4, fromWebsite: false },
  { key: "staff", label: "The team", points: 4, fromWebsite: true },
  { key: "faqs", label: "Questions", points: 4, fromWebsite: false },
  { key: "videos", label: "Videos", points: 2, fromWebsite: true },
  { key: "social", label: "Social profiles", points: 2, fromWebsite: true },
  { key: "yearFounded", label: "Year founded", points: 2, fromWebsite: true },
];

const TOTAL = GAPS.reduce((sum, gap) => sum + gap.points, 0);

export const GAP_BY_KEY = new Map(GAPS.map((gap) => [gap.key, gap]));

/** What the score needs to read. Kept narrow so callers can select only this. */
export type Scorable = {
  description: string | null;
  overview: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  hours: string | null;
  socialLinks: string | null;
  yearFounded: number | null;
  googleReviewCount: number | null;
  _count: {
    photos: number;
    services: number;
    areas: number;
    credentials: number;
    staff: number;
    faqs: number;
    reviews: number;
    videos: number;
  };
};

export const SCORE_SELECT = {
  description: true,
  overview: true,
  logoUrl: true,
  website: true,
  phone: true,
  email: true,
  addressLine: true,
  hours: true,
  socialLinks: true,
  yearFounded: true,
  googleReviewCount: true,
  _count: {
    select: {
      photos: true,
      services: true,
      areas: true,
      credentials: true,
      staff: true,
      faqs: true,
      reviews: true,
      videos: true,
    },
  },
} as const;

const filled = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);

/** Which of the named things this listing does not have. */
export function gapsFor(business: Scorable): string[] {
  const has: Record<string, boolean> = {
    // A one-line description is not a description. Anything under 200
    // characters reads as a stub on the page, so it counts as missing.
    description: (business.description ?? "").trim().length >= 200,
    overview: filled(business.overview),
    // One photo is not a gallery, and a profile with a single stock image looks
    // worse than one with none.
    photos: business._count.photos >= 3,
    logo: filled(business.logoUrl),
    services: business._count.services > 0,
    credentials: business._count.credentials > 0,
    phone: filled(business.phone),
    email: filled(business.email),
    website: filled(business.website),
    address: filled(business.addressLine),
    hours: parseJson<unknown[]>(business.hours, []).length > 0,
    areas: business._count.areas > 0,
    reviews: business._count.reviews > 0 || (business.googleReviewCount ?? 0) > 0,
    staff: business._count.staff > 0,
    faqs: business._count.faqs > 0,
    videos: business._count.videos > 0,
    social: Object.keys(parseJson<Record<string, string>>(business.socialLinks, {})).length > 0,
    yearFounded: (business.yearFounded ?? 0) > 1800,
  };

  return GAPS.filter((gap) => !has[gap.key]).map((gap) => gap.key);
}

export function scoreOf(business: Scorable): number {
  const missing = new Set(gapsFor(business));
  const lost = GAPS.filter((gap) => missing.has(gap.key)).reduce((sum, gap) => sum + gap.points, 0);
  return Math.round(((TOTAL - lost) / TOTAL) * 100);
}

/** Reads the listing, scores it and stores the number on the row. */
export async function recomputeCompleteness(businessId: string): Promise<number> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: SCORE_SELECT,
  });
  if (!business) return 0;

  const score = scoreOf(business);
  await db.business.update({ where: { id: businessId }, data: { completeness: score } });
  return score;
}

/**
 * Rescores everything. Cheap enough to run on every deploy: a few thousand rows
 * with one grouped count each, and it keeps the stored number honest after a
 * change to the weights above.
 */
export async function recomputeAll(): Promise<{ scored: number }> {
  const businesses = await db.business.findMany({ select: { id: true, ...SCORE_SELECT } });

  for (const business of businesses) {
    const score = scoreOf(business);
    await db.business.update({ where: { id: business.id }, data: { completeness: score } });
  }
  return { scored: businesses.length };
}

/** Turns a gap key into the Prisma filter that finds listings missing it. */
export function whereMissing(key: string): Record<string, unknown> | null {
  switch (key) {
    case "description":
      return { OR: [{ description: null }, { description: "" }] };
    case "overview":
      return { OR: [{ overview: null }, { overview: "" }] };
    case "photos":
      return { photos: { none: {} } };
    case "logo":
      return { OR: [{ logoUrl: null }, { logoUrl: "" }] };
    case "services":
      return { services: { none: {} } };
    case "credentials":
      return { credentials: { none: {} } };
    case "phone":
      return { OR: [{ phone: null }, { phone: "" }] };
    case "email":
      return { OR: [{ email: null }, { email: "" }] };
    case "address":
      return { OR: [{ addressLine: null }, { addressLine: "" }] };
    case "hours":
      return { OR: [{ hours: null }, { hours: "" }] };
    case "areas":
      return { areas: { none: {} } };
    case "reviews":
      return { reviews: { none: {} } };
    case "staff":
      return { staff: { none: {} } };
    case "faqs":
      return { faqs: { none: {} } };
    case "videos":
      return { videos: { none: {} } };
    case "social":
      return { OR: [{ socialLinks: null }, { socialLinks: "" }] };
    case "yearFounded":
      return { yearFounded: null };
    default:
      return null;
  }
}
