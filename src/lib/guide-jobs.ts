// One commissioned guide, from the idea to the page.
//
// The writing itself does not happen here. A guide is written by Claude over
// MCP, using the tools in mcp/guides.ts, because a writer with a browser, a
// search engine and its own judgement produces something better than a single
// constrained API call ever did, and because the thing that kept breaking was
// the constraint rather than the writing.
//
// What is left on this side is everything a writer should not have to do
// twice: buying the research, holding the brief and the house style, recording
// what happened to a commission, turning an accepted draft into a real page,
// and publishing it when its time comes. Each of those is a step that writes
// its result back, so a commission survives a deploy, a restart and a closed
// browser tab.
//
// Nothing here publishes on its own. A finished commission is DRAFTED, and a
// person decides whether what came back is worth putting on the site. That is
// not caution about the writer; it is that a guide carries a named author and a
// review date, and those claims need somebody willing to make them.

import { db } from "./db";
import { announce } from "./announce";
import { ContentError } from "./anthropic";
import { emptyBrief, researchTopic, type ResearchBrief } from "./dataforseo";
import { guideTypeOf, type GuideType } from "./enums";
import { parseIllustrations } from "./guide-images";
import { guideDraftSchema, type GuideDraft } from "./guide-writer";
import { templateForGuideType } from "./guide-templates";
import { parseJson, stringify } from "./json";
import { routes } from "./urls";

export const GUIDE_JOB_STATUSES = [
  "PLANNED",
  "RESEARCHING",
  "BRIEFED",
  "WRITING",
  "DRAFTED",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
] as const;
export type GuideJobStatus = (typeof GUIDE_JOB_STATUSES)[number];

/** What each status means, in the words the tracker uses. */
export const GUIDE_JOB_MEANING: Record<GuideJobStatus, string> = {
  PLANNED: "Commissioned. Nothing bought yet.",
  RESEARCHING: "Buying the search data.",
  BRIEFED: "Everything a writer needs is on file, and nobody has picked it up.",
  WRITING: "Claimed by a writer.",
  DRAFTED: "A draft is waiting for somebody to read it.",
  PUBLISHED: "Accepted into a guide.",
  FAILED: "Stopped, with a reason.",
  CANCELLED: "Called off.",
};

/** The statuses the worker still moves along by itself. */
export const ACTIVE_JOB_STATUSES: GuideJobStatus[] = ["PLANNED", "RESEARCHING"];

/** Waiting on a person or a writer rather than on this application. */
export const OPEN_JOB_STATUSES: GuideJobStatus[] = ["BRIEFED", "WRITING", "DRAFTED"];

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

/**
 * One line in a commission's history.
 *
 * Every status change writes one, and a writer can add its own as it goes. The
 * point is that a commission can be read as a story rather than reconstructed
 * from timestamps, so the note should say what happened, not restate the
 * status next to it.
 */
export async function logJobEvent(
  jobId: string,
  input: { actor: string; status: string; note: string },
): Promise<void> {
  await db.guideJobEvent.create({
    data: {
      jobId,
      actor: input.actor.slice(0, 120),
      status: input.status,
      note: input.note.slice(0, 600),
    },
  });
}

async function fail(id: string, error: unknown, actor = "system"): Promise<StepResult> {
  const message = error instanceof Error ? error.message : String(error);

  await db.guideJob.update({
    where: { id },
    data: {
      status: "FAILED",
      error: message.slice(0, 800),
      hint: "Look at the reason, fix it, and put the commission back in the queue.",
      finishedAt: new Date(),
    },
  });
  await logJobEvent(id, { actor, status: "FAILED", note: message.slice(0, 400) });
  return { changed: true, note: `failed: ${message.slice(0, 120)}` };
}

/**
 * Moves one commission forward by exactly one step.
 *
 * There are only two steps left on this side, and both are about the research:
 * starting it and storing it. Everything after BRIEFED is somebody else's turn,
 * so this returns changed:false and the worker goes back to sleep.
 */
export async function advanceGuideJob(id: string): Promise<StepResult> {
  const job = await db.guideJob.findUnique({ where: { id }, include: jobWithContext });
  if (!job) return { changed: false, note: "no such job" };

  try {
    switch (job.status as GuideJobStatus) {
      case "PLANNED": {
        await db.guideJob.update({
          where: { id },
          data: { status: "RESEARCHING", startedAt: job.startedAt ?? new Date(), error: null, hint: null },
        });
        await logJobEvent(id, { actor: "system", status: "RESEARCHING", note: "Buying the search data." });
        return { changed: true, note: "researching" };
      }

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
            status: "BRIEFED",
            research: stringify(brief),
            researchCalls: { increment: brief.calls },
          },
        });
        await logJobEvent(id, {
          actor: "system",
          status: "BRIEFED",
          note: brief.ok
            ? `Research in, ${brief.calls} call${brief.calls === 1 ? "" : "s"}. Ready for a writer.`
            : `No research (${brief.note}). Ready for a writer anyway.`,
        });
        return { changed: true, note: brief.ok ? `researched (${brief.calls} calls)` : `no research: ${brief.note}` };
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
 * Puts a rewrite over the guide it replaces.
 *
 * Everything that identifies the page survives: the slug, and with it the URL
 * and every link anybody has ever made to it; the author and the reviewer,
 * because a byline is not something a rewrite gets to reassign; the publication
 * date, because the page did not stop existing. What changes is the writing.
 *
 * The pictures survive too. A rewrite arrives with new illustration briefs and
 * new figure keys, and honouring those would orphan images that were already
 * generated and paid for. So the existing illustrations are kept and the new
 * body's figure blocks are remapped onto them in order.
 *
 * The old FAQs and sources are replaced rather than merged. They belong to the
 * text that cited them, and half of one draft's citations beside half of
 * another's is a page nobody can vouch for.
 */
async function replaceGuide(jobId: string, guideId: string, draft: GuideDraft): Promise<{ guideId: string; slug: string }> {
  const existing = await db.guide.findUnique({
    where: { id: guideId },
    select: { id: true, slug: true, title: true, illustrations: true, status: true },
  });
  if (!existing) throw new ContentError("The guide this was meant to replace has been deleted.");

  const kept = parseIllustrations(existing.illustrations);
  const body = kept.length > 0 ? remapFigures(draft.body, kept) : draft.body;

  await db.$transaction([
    db.faq.deleteMany({ where: { guideId, scope: "GUIDE" } }),
    db.source.deleteMany({ where: { guideId } }),
    db.guide.update({
      where: { id: guideId },
      data: {
        title: draft.title,
        excerpt: draft.excerpt,
        shortAnswer: draft.shortAnswer,
        bottomLine: draft.bottomLine,
        keyTakeaways: stringify(draft.keyTakeaways),
        body: stringify(body),
        readingMinutes: Math.max(1, Math.round(draft.readingMinutes)),
        // A rewrite is a review. Somebody accepted it, so the date is honest.
        reviewedAt: new Date(),
        ...(kept.length > 0 ? {} : { illustrations: stringify(draft.illustrations) }),
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
    }),
  ]);

  await db.seoMeta.upsert({
    where: { entityType_entityId: { entityType: "guide", entityId: guideId } },
    update: { title: draft.metaTitle, description: draft.metaDescription, focusKeyword: draft.focusKeyword },
    create: {
      entityType: "guide",
      entityId: guideId,
      title: draft.metaTitle,
      description: draft.metaDescription,
      focusKeyword: draft.focusKeyword,
    },
  });

  await db.guideJob.update({ where: { id: jobId }, data: { status: "PUBLISHED", guideId } });

  // A live page that has changed is worth telling the engines about. A draft is
  // not, and announcing one would be a lie about what is at that URL.
  if (existing.status === "PUBLISHED") announceGuide(existing.slug);

  return { guideId, slug: existing.slug };
}

/**
 * Points a rewrite's figure blocks at the pictures the guide already has.
 *
 * In order: the first inline figure in the new body takes the first inline
 * illustration, and so on. A body with more figures than there are pictures
 * loses the extras rather than rendering gaps.
 */
function remapFigures(body: GuideDraft["body"], kept: ReturnType<typeof parseIllustrations>): GuideDraft["body"] {
  const inline = kept.filter((illustration) => illustration.slot === "inline");
  const out: GuideDraft["body"] = [];
  let used = 0;

  for (const block of body) {
    if (block.kind !== "figure") {
      out.push(block);
      continue;
    }
    const target = inline[used];
    used += 1;
    if (!target) continue;

    const caption = target.caption ?? block.caption;
    out.push({
      kind: "figure",
      key: target.key,
      alt: target.alt || block.alt,
      ...(caption ? { caption } : {}),
    });
  }

  return out;
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
  if (job.status !== "DRAFTED") throw new ContentError("That commission has no draft waiting.");

  const parsed = guideDraftSchema.safeParse(parseJson<unknown>(job.draft, null));
  if (!parsed.success) throw new ContentError("The stored draft no longer matches the expected shape.");
  const draft: GuideDraft = parsed.data;

  if (job.rewriteOfId) return replaceGuide(job.id, job.rewriteOfId, draft);

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
      // The briefs, with no paths yet. Whoever makes the pictures fills those
      // in; until then the figure blocks in the body render as nothing.
      illustrations: stringify(draft.illustrations),
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
      // Back to the queue with the brief it already has, or all the way back to
      // before the research when the brief itself is the problem.
      status: fromResearch ? "PLANNED" : "BRIEFED",
      writer: null,
      error: null,
      hint: null,
      finishedAt: null,
      ...(fromResearch ? { research: null } : {}),
      // Jobs commissioned while the template was chosen by a database sort came
      // out holding the default one, so a cost guide was queued against the
      // hiring brief. Nothing assigns that combination on purpose any more, so
      // where it is still on file it is that bug and a retry is the moment to
      // undo it.
      ...(await correctedTemplate(id)),
    },
  });
  await logJobEvent(id, {
    actor: "system",
    status: fromResearch ? "PLANNED" : "BRIEFED",
    note: fromResearch ? "Put back in the queue, research and all." : "Put back in the queue with its brief.",
  });
}

/** The template a job should have had, when what it has is the old bug. */
async function correctedTemplate(id: string): Promise<{ templateId?: string }> {
  const job = await db.guideJob.findUnique({
    where: { id },
    select: { guideType: true, template: { select: { isDefault: true, guideType: true } } },
  });
  if (!job?.template?.isDefault) return {};
  if (job.template.guideType === job.guideType) return {};

  const corrected = await templateForGuideType(guideTypeOf(job.guideType));
  return corrected ? { templateId: corrected } : {};
}

/** Everything a guide's publication should announce. */
export function guidePaths(slug: string): string[] {
  return [routes.guide(slug), routes.guidesIndex()];
}

/** Announces a guide that has just gone live. */
export function announceGuide(slug: string): void {
  announce(guidePaths(slug));
}


/* --------------------------------------------------------------- scheduling */

/**
 * Publishes the guides whose time has come.
 *
 * A publish date is set when the job is commissioned, and it means what it
 * says: at that moment the guide goes from Draft to Published and the search
 * engines are told. Everything the publication gates would normally check has
 * already been checked, because a person accepted the draft and put their name
 * on it before this could ever fire.
 *
 * A guide with no author is never published on a timer. A byline is a claim
 * somebody makes, and a scheduler cannot make it.
 */
export async function publishDueGuides(now = new Date()): Promise<{ published: number; held: number }> {
  const due = await db.guideJob.findMany({
    where: {
      status: "PUBLISHED",
      publishAt: { lte: now },
      guide: { status: "DRAFT" },
    },
    select: { id: true, publishAt: true, guide: { select: { id: true, slug: true, title: true, authorId: true } } },
  });

  let published = 0;
  let held = 0;

  for (const job of due) {
    if (!job.guide) continue;
    if (!job.guide.authorId) {
      held += 1;
      continue;
    }

    await db.guide.update({
      where: { id: job.guide.id },
      data: { status: "PUBLISHED", publishedAt: job.publishAt ?? now },
    });
    await db.guideJob.update({ where: { id: job.id }, data: { publishAt: null } });
    announceGuide(job.guide.slug);
    published += 1;
  }

  return { published, held };
}
