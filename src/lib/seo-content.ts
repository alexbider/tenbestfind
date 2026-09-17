import "server-only";
import { db } from "./db";
import { parseList } from "./json";

/**
 * The words a page actually publishes, gathered for the content checks.
 *
 * The scorer was only ever handed whatever the admin form put in a hidden
 * field, and the connector handed it the meta description. So "Content is at
 * least 600 words" was measuring a 150-character snippet and failing every
 * page on the site, including the ones carrying two thousand words of
 * editorial. The check was not wrong about the threshold, it was wrong about
 * what it was counting.
 *
 * This reads the same saved fields the templates render, so the count is of
 * the page rather than of the form. It does not fetch the page: a scorer that
 * needs the site running cannot be run from a migration or a batch command.
 */

const text = (...values: (string | null | undefined)[]): string =>
  values.filter((value) => typeof value === "string" && value.trim()).join(" ");

/** JSON string arrays, which is how strengths, considerations and the rest are stored. */
const list = (value: string | null | undefined): string => parseList(value).join(" ");

async function forBusiness(id: string): Promise<string> {
  const business = await db.business.findUnique({
    where: { id },
    select: {
      description: true,
      overview: true,
      editorialTake: true,
      bestFor: true,
      tagline: true,
      strengths: true,
      considerations: true,
      specialties: true,
      awards: true,
      faqs: { select: { question: true, answer: true } },
      credentials: { select: { label: true } },
      staff: { select: { name: true, role: true, bio: true } },
    },
  });
  if (!business) return "";

  return text(
    business.tagline,
    business.overview,
    business.description,
    business.editorialTake,
    business.bestFor,
    list(business.strengths),
    list(business.considerations),
    list(business.specialties),
    list(business.awards),
    business.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(" "),
    business.credentials.map((row) => row.label).join(" "),
    business.staff.map((row) => text(row.name, row.role, row.bio)).join(" "),
  );
}

async function forRanking(id: string): Promise<string> {
  const ranking = await db.ranking.findUnique({
    where: { id },
    select: {
      title: true,
      summary: true,
      intro: true,
      methodologyNote: true,
      localNotes: true,
      entries: {
        select: {
          designation: true,
          whyPicked: true,
          likes: true,
          concerns: true,
          criteria: true,
        },
      },
      faqs: { select: { question: true, answer: true } },
    },
  });
  if (!ranking) return "";

  return text(
    ranking.title,
    ranking.summary,
    ranking.intro,
    ranking.methodologyNote,
    ranking.localNotes,
    ranking.entries
      .map((entry) =>
        text(entry.designation, entry.whyPicked, list(entry.likes), list(entry.concerns), entry.criteria),
      )
      .join(" "),
    ranking.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(" "),
  );
}

async function forGuide(id: string): Promise<string> {
  const guide = await db.guide.findUnique({
    where: { id },
    select: { title: true, excerpt: true, body: true },
  });
  if (!guide) return "";
  // The body is a block array. Every string inside it is prose somebody wrote,
  // so the cheapest honest count is all of them.
  const blocks = typeof guide.body === "string" ? guide.body : "";
  return text(guide.title, guide.excerpt, blocks.replace(/[{}[\]",:]/g, " "));
}

async function forPage(id: string): Promise<string> {
  const page = await db.page.findUnique({ where: { id }, select: { title: true, body: true } });
  if (!page) return "";
  const blocks = typeof page.body === "string" ? page.body : "";
  return text(page.title, blocks.replace(/[{}[\]",:]/g, " "));
}

/**
 * The rendered words for one entity, or an empty string when the type has no
 * body of its own. A caller that was given a sample should use the sample.
 */
export async function savedContent(entityType: string, entityId: string): Promise<string> {
  switch (entityType) {
    case "business":
      return forBusiness(entityId);
    case "ranking":
      return forRanking(entityId);
    case "guide":
      return forGuide(entityId);
    case "page":
      return forPage(entityId);
    default:
      return "";
  }
}

/** How many words that came to, which is what the 600 word check wants. */
export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

/**
 * The slug the URL is actually built from.
 *
 * update_seo was passing the entity id to the "focus keyword appears in the
 * URL" check, so it was comparing a phrase against a cuid and could never
 * pass. Normalising both sides fixes the comparison; this fixes what is being
 * compared.
 */
export async function slugForScoring(entityType: string, entityId: string): Promise<string> {
  switch (entityType) {
    case "business": {
      const row = await db.business.findUnique({ where: { id: entityId }, select: { slug: true } });
      return row?.slug ?? "";
    }
    case "ranking": {
      const row = await db.ranking.findUnique({
        where: { id: entityId },
        select: { slug: true, category: { select: { slug: true } }, city: { select: { slug: true } } },
      });
      // A ranking's address is city plus service, so both belong in the check.
      return row ? [row.city?.slug, row.category?.slug, row.slug].filter(Boolean).join("-") : "";
    }
    case "guide": {
      const row = await db.guide.findUnique({ where: { id: entityId }, select: { slug: true } });
      return row?.slug ?? "";
    }
    case "page": {
      const row = await db.page.findUnique({ where: { id: entityId }, select: { slug: true } });
      return row?.slug ?? "";
    }
    case "category": {
      const row = await db.category.findUnique({ where: { id: entityId }, select: { slug: true } });
      return row?.slug ?? "";
    }
    case "city": {
      const row = await db.city.findUnique({ where: { id: entityId }, select: { slug: true } });
      return row?.slug ?? "";
    }
    default:
      return "";
  }
}
