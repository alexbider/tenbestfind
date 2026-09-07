// One commissioned guide, moved along one step at a time.
//
// The same shape as the import pipeline, for the same reason: each call does a
// single step and writes the result back, so a run survives a deploy, a
// restart, and a browser tab closing. Research that has been paid for is never
// bought twice, because a job that fails while writing keeps the brief it
// already has and resumes from there.
//
// Nothing here publishes. A finished job is READY, and a person decides whether
// what came back is worth putting on the site. That is not caution about the
// model; it is that a guide carries a named author and a review date, and those
// claims need somebody willing to make them.

import { db } from "./db";
import { announce } from "./announce";
import { ContentError, PermanentError, classify, type Effort } from "./anthropic";
import { emptyBrief, researchTopic, type ResearchBrief } from "./dataforseo";
import { guideTypeOf, type GuideType } from "./enums";
import {
  DEFAULT_INSTRUCTIONS,
  DEFAULT_SYSTEM,
  guideDraftSchema,
  writeGuide,
  type GuideDraft,
} from "./guide-writer";
import { parseJson, parseList, stringify } from "./json";
import { routes } from "./urls";

export const GUIDE_JOB_STATUSES = [
  "QUEUED",
  "RESEARCHING",
  "WRITING",
  "READY",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
] as const;
export type GuideJobStatus = (typeof GUIDE_JOB_STATUSES)[number];

/** The statuses the worker should keep picking up. */
export const ACTIVE_JOB_STATUSES: GuideJobStatus[] = ["QUEUED", "RESEARCHING", "WRITING"];

export type StepResult = { changed: boolean; note: string };

const jobWithContext = {
  template: true,
  category: { select: { name: true, serviceName: true, slug: true } },
  country: { select: { name: true, code: true } },
  region: { select: { name: true } },
  city: { select: { name: true } },
} as const;

type JobRow = Awaited<
  ReturnType<typeof db.guideJob.findUnique<{ where: { id: string }; include: typeof jobWithContext }>>
>;

/** How the location reads in a prompt and on the page. */
function locationName(job: NonNullable<JobRow>): string | null {
  if (job.city && job.region) return `${job.city.name}, ${job.region.name}`;
  if (job.region) return job.region.name;
  if (job.country) return job.country.name;
  return null;
}

/** Which market DataForSEO should be asked about. */
function marketName(job: NonNullable<JobRow>): string {
  if (job.city && job.region && job.country) {
    return `${job.city.name},${job.region.name},${job.country.name}`;
  }
  if (job.region && job.country) return `${job.region.name},${job.country.name}`;
  if (job.country) return job.country.name;
  return "United States";
}

async function fail(id: string, error: unknown): Promise<StepResult> {
  const classified = error instanceof Error ? classify(error) : new Error(String(error));
  const hint =
    classified instanceof PermanentError
      ? classified.hint
      : "Retry the job. If it fails the same way twice, the brief or the credentials are the problem.";

  await db.guideJob.update({
    where: { id },
    data: {
      status: "FAILED",
      error: classified.message.slice(0, 800),
      hint,
      finishedAt: new Date(),
    },
  });
  return { changed: true, note: `failed: ${classified.message.slice(0, 120)}` };
}

/**
 * Moves one job forward by exactly one step.
 *
 * Returns changed:false when the job is in a state nothing can be done to,
 * which is how the worker knows to go back to sleep.
 */
export async function advanceGuideJob(id: string): Promise<StepResult> {
  const job = await db.guideJob.findUnique({ where: { id }, include: jobWithContext });
  if (!job) return { changed: false, note: "no such job" };

  try {
    switch (job.status as GuideJobStatus) {
      case "QUEUED":
        await db.guideJob.update({
          where: { id },
          data: { status: "RESEARCHING", startedAt: job.startedAt ?? new Date(), error: null, hint: null },
        });
        return { changed: true, note: "researching" };

      case "RESEARCHING": {
        const keyword = job.keyword?.trim() || job.topic;
        let brief: ResearchBrief;
        try {
          brief = await researchTopic({ keyword, locationName: marketName(job) });
        } catch (error) {
          // Research is a help, not a gate. A guide written without it is worse
          // than one written with it and far better than one never written.
          brief = emptyBrief(keyword, `Research failed: ${String(error)}`);
        }

        await db.guideJob.update({
          where: { id },
          data: {
            status: "WRITING",
            research: stringify(brief),
            researchCalls: { increment: brief.calls },
          },
        });
        return { changed: true, note: brief.ok ? `researched (${brief.calls} calls)` : `no research: ${brief.note}` };
      }

      case "WRITING": {
        const brief = parseJson<ResearchBrief>(job.research, emptyBrief(job.topic, "No research stored."));
        const template = job.template;

        const { draft } = await writeGuide({
          system: template?.system || DEFAULT_SYSTEM,
          instructions: template?.instructions || DEFAULT_INSTRUCTIONS,
          model: template?.model,
          effort: (template?.effort ?? "high") as Effort,
          research: brief,
          context: {
            topic: job.topic,
            keyword: job.keyword?.trim() || job.topic,
            guideType: guideTypeOf(job.guideType),
            service: job.category?.serviceName ?? null,
            location: locationName(job),
            wordTarget: template?.wordTarget ?? 1400,
            skills: parseList(template?.skills),
            brief: job.brief,
          },
        });

        await db.guideJob.update({
          where: { id },
          data: {
            status: "READY",
            draft: stringify(draft),
            finishedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        return { changed: true, note: `drafted "${draft.title}"` };
      }

      default:
        return { changed: false, note: job.status.toLowerCase() };
    }
  } catch (error) {
    return fail(id, error);
  }
}

/** A slug nothing else has taken. */
async function freeSlug(preferred: string): Promise<string> {
  const base = preferred
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  let slug = base || "guide";
  for (let suffix = 2; suffix < 40; suffix += 1) {
    const taken = await db.guide.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Turns a READY job into a real guide.
 *
 * Created as a draft, never published. Somebody has to put their name on it as
 * the author and their date on it as the review, and this cannot do either of
 * those honestly.
 */
export async function acceptGuideJob(
  id: string,
  options: { authorId?: string | null; reviewerId?: string | null } = {},
): Promise<{ guideId: string; slug: string }> {
  const job = await db.guideJob.findUnique({ where: { id } });
  if (!job) throw new ContentError("No such job.");
  if (job.status !== "READY") throw new ContentError("That job has no draft waiting.");

  const parsed = guideDraftSchema.safeParse(parseJson<unknown>(job.draft, null));
  if (!parsed.success) throw new ContentError("The stored draft no longer matches the expected shape.");
  const draft: GuideDraft = parsed.data;

  const slug = await freeSlug(draft.slug || draft.title);

  const guide = await db.guide.create({
    data: {
      title: draft.title,
      slug,
      type: guideTypeOf(job.guideType) satisfies GuideType,
      categoryId: job.categoryId,
      countryId: job.countryId,
      regionId: job.regionId,
      cityId: job.cityId,
      excerpt: draft.excerpt,
      shortAnswer: draft.shortAnswer,
      bottomLine: draft.bottomLine,
      keyTakeaways: stringify(draft.keyTakeaways),
      body: stringify(draft.body),
      readingMinutes: Math.max(1, Math.round(draft.readingMinutes)),
      status: "DRAFT",
      authorId: options.authorId ?? null,
      reviewerId: options.reviewerId ?? null,
      faqs: {
        create: draft.faqs.map((faq, index) => ({
          question: faq.question,
          answer: faq.answer,
          scope: "GUIDE",
          sortOrder: index,
        })),
      },
      sources: {
        create: draft.sources.map((source, index) => ({
          label: source.label,
          url: source.url,
          tier: source.tier,
          sortOrder: index,
          accessedAt: new Date(),
        })),
      },
    },
    select: { id: true, slug: true },
  });

  // The metadata the writer produced, kept as the page's own SEO record so an
  // editor sees it in the same place they would edit any other page's.
  await db.seoMeta.create({
    data: {
      entityType: "guide",
      entityId: guide.id,
      title: draft.metaTitle,
      description: draft.metaDescription,
      focusKeyword: draft.focusKeyword,
    },
  });

  await db.guideJob.update({
    where: { id },
    data: { status: "PUBLISHED", guideId: guide.id },
  });

  return { guideId: guide.id, slug: guide.slug };
}

/** Puts a failed or finished job back at the start, keeping its research. */
export async function retryGuideJob(id: string, fromResearch = false): Promise<void> {
  await db.guideJob.update({
    where: { id },
    data: {
      status: fromResearch ? "QUEUED" : "WRITING",
      error: null,
      hint: null,
      finishedAt: null,
      ...(fromResearch ? { research: null } : {}),
    },
  });
}

/** Everything a guide's publication should announce. */
export function guidePaths(slug: string): string[] {
  return [routes.guide(slug), routes.guidesIndex()];
}

/** Announces a guide that has just gone live. */
export function announceGuide(slug: string): void {
  announce(guidePaths(slug));
}
