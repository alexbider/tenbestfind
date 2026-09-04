// What is wrong with the site, in the words someone could act on.
//
// A page earns indexing rather than getting it by existing. The rules are the
// ones the pages already apply to themselves, gathered here so they can be
// asked as a question rather than only answered one page at a time: which
// profiles are too thin to publish, which lists say something the data does not
// support, which pages contradict themselves.
//
// Everything here reads. Nothing is fixed automatically, because most of these
// are editorial decisions with a person's name on them.

import { db } from "./db";
import { parseJson, type HoursRow } from "./json";
import { TOP_TEN } from "./seo-copy";
import { routes } from "./urls";

export type Severity = "blocking" | "warning";

export type Finding = {
  /** What is wrong, in one sentence. */
  problem: string;
  /** The page it is on. */
  path: string;
  /** What that page is called, so a list of these reads. */
  label: string;
  severity: Severity;
  /** Where to fix it. */
  editHref?: string;
};

export type SeoReport = {
  companies: { total: number; indexable: number; findings: Finding[] };
  rankings: { total: number; complete: number; findings: Finding[] };
  contradictions: Finding[];
  generatedAt: Date;
};

/* --------------------------------------------------------- company profiles */

/**
 * Whether one company profile is fit to be offered to a search engine.
 *
 * Not a score. Each of these is something a reader arriving from a search
 * result would notice was missing, and a page they would leave. A profile that
 * fails stays on the site and stays out of the index until it is filled in.
 */
export function companyGate(business: {
  name: string;
  slug: string;
  cityId: string | null;
  categoryId: string | null;
  overview: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  googleRating: number | null;
  _count?: { services: number; credentials: number; photos: number };
}): { ok: boolean; problems: string[] } {
  const problems: string[] = [];

  if (!business.name.trim()) problems.push("it has no name");
  if (!business.cityId) problems.push("it has no city, so it has no place in the hierarchy");
  if (!business.categoryId) problems.push("it has no trade");
  if (!business.phone && !business.website && !business.email) {
    problems.push("there is no way to contact it");
  }

  const prose = (business.overview ?? business.description ?? "").trim();
  if (prose.length < 200) {
    problems.push("the overview is too short to tell a reader anything");
  }

  const counted = business._count;
  if (counted) {
    const substance = [
      prose.length >= 200,
      counted.services > 0,
      counted.credentials > 0,
      Boolean(business.googleRating),
      counted.photos > 0,
    ].filter(Boolean).length;
    if (substance < 3) problems.push("there is not enough on the page to be worth landing on");
  }

  return { ok: problems.length === 0, problems };
}

/* ------------------------------------------------------------ the report */

/** Facts that appear twice and disagree. */
async function findContradictions(): Promise<Finding[]> {
  const findings: Finding[] = [];

  const businesses = await db.business.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      emergency: true,
      hours: true,
      googleRating: true,
      googleReviewCount: true,
      yearFounded: true,
    },
  });

  const thisYear = new Date().getFullYear();

  for (const business of businesses) {
    const path = routes.business(business.slug);
    const edit = routes.admin(`/businesses/${business.id}`);

    // Hours that run all day every day are a 24/7 claim, whatever the flag
    // beside them says. One of the two is wrong and a reader sees both.
    const hours = parseJson<HoursRow[]>(business.hours, []);
    const open = hours.filter((row) => !row.closed && row.opens && row.closes);
    const roundTheClock =
      open.length >= 7 &&
      open.every(
        (row) => /^0?0:00$/.test(row.opens ?? "") && /^(23:59|0?0:00|24:00)$/.test(row.closes ?? ""),
      );
    if (roundTheClock && !business.emergency) {
      findings.push({
        problem: "the hours say it is open around the clock while emergency service is marked off",
        path,
        label: business.name,
        severity: "blocking",
        editHref: edit,
      });
    }

    if (business.googleReviewCount && !business.googleRating) {
      findings.push({
        problem: "it has a review count with no rating, so the page shows half a fact",
        path,
        label: business.name,
        severity: "warning",
        editHref: edit,
      });
    }

    if (business.yearFounded && (business.yearFounded > thisYear || business.yearFounded < 1850)) {
      findings.push({
        problem: `the founding year is ${business.yearFounded}`,
        path,
        label: business.name,
        severity: "blocking",
        editHref: edit,
      });
    }
  }

  return findings;
}

export async function buildSeoReport(): Promise<SeoReport> {
  const businesses = await db.business.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      cityId: true,
      categoryId: true,
      overview: true,
      description: true,
      phone: true,
      website: true,
      email: true,
      googleRating: true,
      _count: { select: { services: true, credentials: true, photos: true } },
    },
  });

  const companyFindings: Finding[] = [];
  let indexable = 0;
  for (const business of businesses) {
    const gate = companyGate(business);
    if (gate.ok) {
      indexable += 1;
      continue;
    }
    companyFindings.push({
      problem: gate.problems.join("; "),
      path: routes.business(business.slug),
      label: business.name,
      severity: "blocking",
      editHref: routes.admin(`/businesses/${business.id}`),
    });
  }

  const rankings = await db.ranking.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      companiesReviewed: true,
      lastReviewedAt: true,
      category: { select: { name: true, slug: true } },
      city: {
        select: {
          name: true,
          slug: true,
          region: { select: { slug: true, code: true, country: { select: { code: true } } } },
        },
      },
      _count: { select: { entries: { where: { business: { status: "PUBLISHED" } } } } },
    },
  });

  const rankingFindings: Finding[] = [];
  let complete = 0;

  for (const ranking of rankings) {
    if (!ranking.city) {
      rankingFindings.push({
        problem: "it is published with no city, so it has no URL of its own",
        path: routes.rankingsIndex(),
        label: ranking.title,
        severity: "blocking",
        editHref: routes.admin(`/rankings/${ranking.id}`),
      });
      continue;
    }

    const path = routes.ranking(
      ranking.city.region.country.code,
      ranking.city.region.slug,
      ranking.city.slug,
      ranking.category.slug,
    );
    const label = `${ranking.category.name} in ${ranking.city.name}, ${ranking.city.region.code.toUpperCase()}`;
    const edit = routes.admin(`/rankings/${ranking.id}`);
    const listed = ranking._count.entries;

    if (listed === TOP_TEN) complete += 1;

    if (listed === 0) {
      rankingFindings.push({
        problem: "it is published with no companies on it",
        path,
        label,
        severity: "blocking",
        editHref: edit,
      });
    } else if (listed < TOP_TEN) {
      rankingFindings.push({
        problem: `${listed} of ${TOP_TEN} companies are published, so the page cannot call itself a Top 10`,
        path,
        label,
        severity: "warning",
        editHref: edit,
      });
    }

    if (!ranking.lastReviewedAt) {
      rankingFindings.push({
        problem: "no editorial review date, so the page carries no year and no freshness",
        path,
        label,
        severity: "warning",
        editHref: edit,
      });
    }

    if (ranking.companiesReviewed > 0 && ranking.companiesReviewed < listed) {
      rankingFindings.push({
        problem: `it says ${ranking.companiesReviewed} companies were reviewed but lists ${listed}`,
        path,
        label,
        severity: "blocking",
        editHref: edit,
      });
    }
  }

  return {
    companies: { total: businesses.length, indexable, findings: companyFindings },
    rankings: { total: rankings.length, complete, findings: rankingFindings },
    contradictions: await findContradictions(),
    generatedAt: new Date(),
  };
}
