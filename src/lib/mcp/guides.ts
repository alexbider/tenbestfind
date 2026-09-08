// The desk a writer works from.
//
// Guides are written by Claude, not by this application, and these are the
// tools that make that a real workflow rather than a person pasting text into a
// form. The division is deliberate:
//
//   This side owns everything a writer should not have to do twice. The search
//   data, because the credentials are here and the same phrase should be
//   bought once. The house style, because an editor maintains it. The list of
//   pages that really exist, because only this side knows. The record of what
//   happened, because that is what the tracker shows.
//
//   The writer owns the writing, and the judgement inside it: what the piece
//   argues, which blocks carry it, what is worth a chart, what to go and read
//   before starting. None of that improves for being squeezed through a schema.
//
// The shape of a session is: guide_desk to see the state of things,
// list_commissions or guide_gaps to pick something up, get_commission for
// everything needed to write it, claim_commission, then submit_guide when the
// draft is done. Everything in between is optional and everything is logged.

import { db } from "../db";
import { fullDate } from "../format";
import { guideTypeOf, GUIDE_TYPES, type GuideType } from "../enums";
import { briefAsText, emptyBrief, researchTopic, type ResearchBrief } from "../dataforseo";
import { authorityPromptBlock } from "../guide-authorities";
import { parseIllustrations, type Illustration } from "../guide-images";
import { linkTargets, linksAsText } from "../guide-links";
import { rewriteCandidates } from "../guide-rewrites";
import { templateForGuideType } from "../guide-templates";
import {
  BLOCK_REFERENCE,
  DEFAULT_INSTRUCTIONS,
  DEFAULT_SYSTEM,
  guideDraftSchema,
  renderInstructions,
  skillNotes,
  vetDraft,
  type GuideDraft,
} from "../guide-writer";
import {
  acceptGuideJob,
  announceGuide,
  GUIDE_JOB_MEANING,
  GUIDE_JOB_STATUSES,
  logJobEvent,
  type GuideJobStatus,
} from "../guide-jobs";
import { parseJson, parseList, stringify } from "../json";
import { routes } from "../urls";
import {
  arr,
  bool,
  int,
  limitOf,
  object,
  optStr,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
  type ToolContext,
} from "./kit";

/* ------------------------------------------------------------------ shared */

const commissionWith = {
  template: true,
  category: { select: { name: true, serviceName: true, slug: true } },
  country: { select: { name: true, code: true } },
  region: { select: { name: true } },
  city: { select: { name: true } },
  guide: { select: { id: true, slug: true, title: true, status: true } },
  rewriteOf: { select: { id: true, slug: true, title: true } },
} as const;

type Commission = NonNullable<
  Awaited<ReturnType<typeof db.guideJob.findFirst<{ where: object; include: typeof commissionWith }>>>
>;

/** Finds a commission by id, or says so in a sentence. */
async function find(id: string): Promise<Commission> {
  const row = await db.guideJob.findUnique({ where: { id }, include: commissionWith });
  if (!row) throw new ToolError(`No commission has the id ${id}. list_commissions shows what exists.`);
  return row;
}

function placeOf(row: Commission): string | null {
  if (row.city && row.region) return `${row.city.name}, ${row.region.name}`;
  if (row.region) return row.region.name;
  if (row.country) return row.country.name;
  return null;
}

/** The one-line form, which is what a list is for. */
function summarise(row: Commission) {
  return {
    id: row.id,
    status: row.status,
    means: GUIDE_JOB_MEANING[row.status as GuideJobStatus] ?? row.status,
    topic: row.topic,
    keyword: row.keyword,
    type: row.guideType,
    service: row.category?.serviceName ?? null,
    place: placeOf(row),
    rewriteOf: row.rewriteOf ? { id: row.rewriteOf.id, title: row.rewriteOf.title, url: routes.guide(row.rewriteOf.slug) } : null,
    writer: row.writer,
    researched: Boolean(row.research),
    guide: row.guide ? { id: row.guide.id, url: routes.guide(row.guide.slug), status: row.guide.status } : null,
    scheduledFor: row.scheduledFor ? fullDate(row.scheduledFor) : null,
    publishAt: row.publishAt ? fullDate(row.publishAt) : null,
    updated: fullDate(row.updatedAt),
    error: row.error,
  };
}

/** Whoever is calling, named the way the tracker will show it. */
const actorOf = (ctx: ToolContext) => ctx.clientName || ctx.user.email || "a connector";

/* ------------------------------------------------------------------- tools */

export const GUIDE_TOOLS: Tool[] = [
  {
    name: "guide_desk",
    title: "The guides desk",
    description:
      "Where every commission stands, what is waiting to be written, and what has happened lately. Call this first when picking up guide work.",
    schema: object({}),
    handler: async () => {
      const [byStatus, guides, waiting, recent] = await Promise.all([
        db.guideJob.groupBy({ by: ["status"], _count: true }),
        db.guide.groupBy({ by: ["status"], _count: true }),
        db.guideJob.findMany({
          where: { status: { in: ["BRIEFED", "WRITING", "DRAFTED"] } },
          orderBy: { updatedAt: "asc" },
          take: 25,
          include: commissionWith,
        }),
        db.guideJobEvent.findMany({ orderBy: { at: "desc" }, take: 15, include: { job: { select: { topic: true } } } }),
      ]);

      const counts = (rows: { status: string; _count: number }[]) =>
        Object.fromEntries(rows.map((row) => [row.status, row._count]));

      return {
        commissions: counts(byStatus),
        guides: counts(guides),
        meanings: GUIDE_JOB_MEANING,
        waiting: waiting.map(summarise),
        lately: recent.map((event) => ({
          at: fullDate(event.at),
          actor: event.actor,
          status: event.status,
          topic: event.job.topic,
          note: event.note,
        })),
      };
    },
  },

  {
    name: "list_commissions",
    title: "List commissions",
    description:
      "The work queue. BRIEFED means the research is on file and nobody has picked it up, which is what to write next.",
    schema: object({
      status: str(`One of ${GUIDE_JOB_STATUSES.join(", ")}. Omit for everything still open.`),
      query: str("Matches the topic or the keyword."),
      limit: int("Up to 200. Default 25."),
    }),
    handler: async (args) => {
      const status = optStr(args, "status")?.trim().toUpperCase();
      if (status && !GUIDE_JOB_STATUSES.includes(status as GuideJobStatus)) {
        throw new ToolError(`status must be one of ${GUIDE_JOB_STATUSES.join(", ")}.`);
      }
      const query = optStr(args, "query")?.trim();

      const rows = await db.guideJob.findMany({
        where: {
          ...(status ? { status } : { status: { in: ["PLANNED", "RESEARCHING", "BRIEFED", "WRITING", "DRAFTED"] } }),
          ...(query ? { OR: [{ topic: { contains: query } }, { keyword: { contains: query } }] } : {}),
        },
        orderBy: { updatedAt: "asc" },
        take: limitOf(args, 25),
        include: commissionWith,
      });

      return { items: rows.map(summarise) };
    },
  },

  {
    name: "get_commission",
    title: "Everything needed to write one guide",
    description:
      "The assignment: the house style with the research already in it, the pages this guide may link to, the domains it may cite, and the guide it replaces when it is a rewrite. Read this before writing anything.",
    schema: object({ id: str("The commission id."), history: bool("Include the progress log. Default false.") }, ["id"]),
    handler: async (args) => {
      const row = await find(reqStr(args, "id"));
      const research = parseJson<ResearchBrief>(row.research, emptyBrief(row.topic, "Nothing has been bought yet."));
      const targets = await linkTargets({
        categoryId: row.categoryId,
        countryId: row.countryId,
        regionId: row.regionId,
        cityId: row.cityId,
      });

      const context = {
        topic: row.topic,
        keyword: row.keyword?.trim() || row.topic,
        guideType: guideTypeOf(row.guideType),
        service: row.category?.serviceName ?? null,
        location: placeOf(row),
        wordTarget: row.template?.wordTarget ?? 3000,
        skills: parseList(row.template?.skills),
        brief: row.brief,
        links: linksAsText(targets),
        linkTargets: targets,
      };

      const assignment = [
        renderInstructions(row.template?.instructions || DEFAULT_INSTRUCTIONS, context, research),
        skillNotes(context.skills),
        row.brief ? `\n\nFOR THIS ONE\n${row.brief}` : "",
      ]
        .join("")
        .trim();

      const existing = row.rewriteOf
        ? await db.guide.findUnique({
            where: { id: row.rewriteOf.id },
            select: { title: true, slug: true, excerpt: true, body: true, illustrations: true },
          })
        : null;

      return {
        ...summarise(row),
        // The two halves of the brief a writer is given: who this site is, and
        // what this particular piece has to do.
        houseVoice: row.template?.system || DEFAULT_SYSTEM,
        assignment,
        wordFloor: context.wordTarget,
        internalLinks: targets.map((target) => ({ path: target.path, label: target.label })),
        citableDomains: authorityPromptBlock(),
        research: research.ok
          ? { ok: true, calls: research.calls, brief: briefAsText(research) }
          : { ok: false, note: research.note, brief: briefAsText(research) },
        replaces: existing
          ? {
              url: routes.guide(existing.slug),
              title: existing.title,
              excerpt: existing.excerpt,
              // A rewrite keeps the pictures that were already made and paid
              // for, so write figure blocks against these keys rather than
              // commissioning new ones.
              illustrations: parseIllustrations(existing.illustrations).map(({ key, slot, alt }) => ({ key, slot, alt })),
              body: parseJson(existing.body, []),
            }
          : null,
        blockKinds: BLOCK_REFERENCE,
        submitWith:
          "submit_guide, with the whole draft as the draft argument. Required fields: title, slug, excerpt, shortAnswer, keyTakeaways, body, bottomLine, faqs, sources, readingMinutes, metaTitle, metaDescription, focusKeyword, confidence, illustrations.",
        ...(args.history
          ? {
              history: (
                await db.guideJobEvent.findMany({ where: { jobId: row.id }, orderBy: { at: "asc" } })
              ).map((event) => ({ at: fullDate(event.at), actor: event.actor, status: event.status, note: event.note })),
            }
          : {}),
      };
    },
  },

  {
    name: "commission_guide",
    title: "Commission a guide",
    description:
      "Adds a guide to the queue. The research is bought automatically unless you say otherwise, so this can be called and then left alone until it is BRIEFED.",
    write: true,
    schema: object(
      {
        topic: str("The question the guide answers, as a title."),
        keyword: str("The phrase it should rank for. Defaults to the topic."),
        guideType: str(`One of ${GUIDE_TYPES.join(", ")}. Picks the house brief.`),
        brief: str("Anything specific to this one commission, on top of the house style."),
        categoryId: str("The service it is about."),
        countryId: str("Country id, when it is about somewhere in particular."),
        regionId: str("State or province id."),
        cityId: str("City id."),
        rewriteOfId: str("The id of a guide this replaces. A rewrite keeps the URL, the author and the pictures."),
        research: bool("Buy the search data. Default true."),
      },
      ["topic"],
    ),
    handler: async (args, ctx) => {
      const topic = reqStr(args, "topic");
      const guideType = guideTypeOf(optStr(args, "guideType") ?? "HOW_TO_CHOOSE") satisfies GuideType;
      const wantsResearch = args.research === undefined ? true : Boolean(args.research);

      const job = await db.guideJob.create({
        data: {
          topic,
          keyword: optStr(args, "keyword")?.trim() || null,
          guideType,
          brief: optStr(args, "brief") || null,
          templateId: await templateForGuideType(guideType),
          categoryId: optStr(args, "categoryId") || null,
          countryId: optStr(args, "countryId") || null,
          regionId: optStr(args, "regionId") || null,
          cityId: optStr(args, "cityId") || null,
          rewriteOfId: optStr(args, "rewriteOfId") || null,
          // Nothing to buy means nothing to wait for: it is ready to write.
          status: wantsResearch ? "PLANNED" : "BRIEFED",
        },
      });

      await logJobEvent(job.id, {
        actor: actorOf(ctx),
        status: job.status,
        note: wantsResearch ? `Commissioned: ${topic}` : `Commissioned without research: ${topic}`,
      });
      await recordWrite(ctx, {
        action: "create",
        entityType: "guideJob",
        entityId: job.id,
        summary: `commissioned ${topic}`,
        paths: [],
      });

      return { id: job.id, status: job.status, next: wantsResearch ? "Wait for BRIEFED, then get_commission." : "get_commission." };
    },
  },

  {
    name: "research_commission",
    title: "Buy the search data",
    description:
      "Runs the DataForSEO pass for a commission and attaches the brief. Costs money, so it refuses to buy the same answer twice unless you pass refresh.",
    write: true,
    schema: object({ id: str("The commission id."), refresh: bool("Buy it again even if there is a brief on file.") }, ["id"]),
    handler: async (args, ctx) => {
      const row = await find(reqStr(args, "id"));
      if (row.research && !args.refresh) {
        throw new ToolError("That commission already has a brief. Pass refresh:true to buy it again.");
      }

      const keyword = row.keyword?.trim() || row.topic;
      const market = [row.city?.name, row.region?.name, row.country?.name].filter(Boolean).join(",") || "United States";

      let brief: ResearchBrief;
      try {
        brief = await researchTopic({ keyword, locationName: market });
      } catch (error) {
        brief = emptyBrief(keyword, `Research failed: ${String(error)}`);
      }

      await db.guideJob.update({
        where: { id: row.id },
        data: {
          research: stringify(brief),
          researchCalls: { increment: brief.calls },
          ...(row.status === "PLANNED" || row.status === "RESEARCHING" ? { status: "BRIEFED" } : {}),
        },
      });
      await logJobEvent(row.id, {
        actor: actorOf(ctx),
        status: row.status === "PLANNED" || row.status === "RESEARCHING" ? "BRIEFED" : row.status,
        note: brief.ok ? `Research in, ${brief.calls} calls.` : `No research: ${brief.note}`,
      });

      return { ok: brief.ok, calls: brief.calls, note: brief.note, brief: briefAsText(brief) };
    },
  },

  {
    name: "claim_commission",
    title: "Take a commission",
    description:
      "Says who is writing it, so the tracker stops showing it as unclaimed and nobody else picks it up. Call it before writing, not after.",
    write: true,
    schema: object({ id: str("The commission id."), note: str("What you are about to do.") }, ["id"]),
    handler: async (args, ctx) => {
      const row = await find(reqStr(args, "id"));
      if (row.status === "PUBLISHED") throw new ToolError("That commission is finished.");

      const writer = actorOf(ctx);
      await db.guideJob.update({
        where: { id: row.id },
        data: { status: "WRITING", writer, startedAt: row.startedAt ?? new Date(), error: null, hint: null },
      });
      await logJobEvent(row.id, {
        actor: writer,
        status: "WRITING",
        note: optStr(args, "note") || "Picked it up.",
      });

      return { id: row.id, status: "WRITING", writer };
    },
  },

  {
    name: "note_commission",
    title: "Say what is happening",
    description:
      "Adds a line to a commission's history. Use it for anything a person reading the tracker would want to know: what you went and read, what the research was missing, why this one is taking a while.",
    write: true,
    schema: object({ id: str("The commission id."), note: str("One or two sentences.") }, ["id", "note"]),
    handler: async (args, ctx) => {
      const row = await find(reqStr(args, "id"));
      await logJobEvent(row.id, { actor: actorOf(ctx), status: row.status, note: reqStr(args, "note") });
      return { logged: true };
    },
  },

  {
    name: "submit_guide",
    title: "Hand over the draft",
    description:
      "The finished guide, as one object. Every source is checked against the research and the citable domains, and every internal link against the pages that really exist; whatever fails is removed and said out loud. The draft is then waiting for a person, who accepts it with accept_commission.",
    write: true,
    schema: object(
      {
        id: str("The commission id."),
        draft: {
          type: "object",
          additionalProperties: true,
          description:
            "The guide. Required: title, slug, excerpt, shortAnswer, keyTakeaways (array of strings), body (array of blocks), bottomLine, faqs (question and answer), sources (label, url, tier), readingMinutes, metaTitle, metaDescription, focusKeyword, confidence, illustrations (key, slot, scene, alt). Block kinds: heading, paragraph, list, steps, callout, criteria, checklist, compare, flags, figure, chart. A paragraph may carry links, each a phrase that appears verbatim in it and a path from the internal link list. Anything that does not fit is refused with the reason, so fix and resubmit.",
        },
        notes: str("What a person reviewing this should read first: what you were unsure about, what you left out."),
      },
      ["id", "draft"],
    ),
    handler: async (args, ctx) => {
      const row = await find(reqStr(args, "id"));
      const parsed = guideDraftSchema.safeParse(args.draft);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join(".") || "draft"}: ${issue.message}`)
          .join("; ");
        throw new ToolError(`The draft does not fit the shape a guide has to have. ${issues}`);
      }

      const research = parseJson<ResearchBrief>(row.research, emptyBrief(row.topic, "No research was bought."));
      const targets = await linkTargets({
        categoryId: row.categoryId,
        countryId: row.countryId,
        regionId: row.regionId,
        cityId: row.cityId,
      });

      let vetted: { draft: GuideDraft; notes: string[] };
      try {
        vetted = await vetDraft(parsed.data, { research, linkTargets: targets });
      } catch (error) {
        throw new ToolError(error instanceof Error ? error.message : String(error));
      }

      const writer = row.writer || actorOf(ctx);
      await db.guideJob.update({
        where: { id: row.id },
        data: {
          status: "DRAFTED",
          draft: stringify(vetted.draft),
          notes: optStr(args, "notes") || null,
          writer,
          attempts: { increment: 1 },
          finishedAt: new Date(),
          error: null,
          hint: null,
        },
      });
      await logJobEvent(row.id, {
        actor: writer,
        status: "DRAFTED",
        note: `Draft in: "${vetted.draft.title}", ${vetted.draft.body.length} blocks, ${vetted.draft.faqs.length} questions.`,
      });
      for (const note of vetted.notes) {
        await logJobEvent(row.id, { actor: "system", status: "DRAFTED", note });
      }

      await recordWrite(ctx, {
        action: "update",
        entityType: "guideJob",
        entityId: row.id,
        summary: `draft for ${row.topic}`,
        paths: [],
      });

      return {
        id: row.id,
        status: "DRAFTED",
        title: vetted.draft.title,
        blocks: vetted.draft.body.length,
        questions: vetted.draft.faqs.length,
        sourcesKept: vetted.draft.sources.length,
        // Whatever was taken out, said plainly, because a writer that does not
        // hear about a removed citation writes the same one again next time.
        removed: vetted.notes,
        illustrationsToMake: vetted.draft.illustrations.map(({ key, slot, scene }) => ({ key, slot, scene })),
        next: "accept_commission turns this into a page. illustrate_guide attaches the pictures afterwards.",
      };
    },
  },

  {
    name: "accept_commission",
    title: "Turn a draft into a page",
    description:
      "Creates the guide, as a draft with nobody's name on it unless you give one. A rewrite replaces its guide in place instead: same URL, same author, same pictures.",
    write: true,
    schema: object(
      {
        id: str("The commission id. It has to be DRAFTED."),
        authorId: str("The person whose byline goes on it. A guide is never published without one."),
        reviewerId: str("The person who checked it, when that is somebody else."),
      },
      ["id"],
    ),
    handler: async (args, ctx) => {
      const row = await find(reqStr(args, "id"));
      if (row.status !== "DRAFTED") throw new ToolError(`That commission is ${row.status}, so there is no draft waiting.`);

      let result;
      try {
        result = await acceptGuideJob(row.id, {
          authorId: optStr(args, "authorId") || null,
          reviewerId: optStr(args, "reviewerId") || null,
        });
      } catch (error) {
        throw new ToolError(error instanceof Error ? error.message : String(error));
      }

      await logJobEvent(row.id, {
        actor: actorOf(ctx),
        status: "PUBLISHED",
        note: row.rewriteOfId ? `Replaced ${routes.guide(result.slug)}.` : `Created ${routes.guide(result.slug)} as a draft.`,
      });
      await recordWrite(ctx, {
        action: row.rewriteOfId ? "update" : "create",
        entityType: "guide",
        entityId: result.guideId,
        summary: row.topic,
        paths: ["/", routes.guidesIndex(), routes.guide(result.slug)],
      });

      return { guideId: result.guideId, url: routes.guide(result.slug), status: "DRAFT" };
    },
  },

  {
    name: "illustrate_guide",
    title: "Attach the pictures",
    description:
      "Stores generated images on this site and points a guide's illustrations at the local copies, matched by key. Generate them wherever you like; do not leave the only copy on somebody else's CDN.",
    write: true,
    schema: object(
      {
        guide: str("The guide id or slug."),
        images: arr("One per picture.", {
          type: "object",
          additionalProperties: false,
          required: ["key", "url"],
          properties: {
            key: { type: "string", description: "The illustration key from the draft, for example cover or inline-1." },
            url: { type: "string", description: "A public https URL to the image." },
            alt: { type: "string", description: "Replaces the alt text, when the picture came out different." },
            caption: { type: "string", description: "Replaces the caption." },
          },
        }),
      },
      ["guide", "images"],
    ),
    handler: async (args, ctx) => {
      const key = reqStr(args, "guide");
      const guide = await db.guide.findFirst({
        where: { OR: [{ id: key }, { slug: key }] },
        select: { id: true, slug: true, status: true, illustrations: true, heroImage: true },
      });
      if (!guide) throw new ToolError(`No guide has the id or slug ${key}.`);

      const rows = Array.isArray(args.images) ? (args.images as Record<string, unknown>[]) : [];
      if (rows.length === 0) throw new ToolError("images must hold at least one picture.");

      const { storeImageFromUrl } = await import("../media");
      const existing = parseIllustrations(guide.illustrations);
      const done: { key: string; path: string }[] = [];
      const missed: string[] = [];

      for (const row of rows) {
        const wanted = String(row.key ?? "").trim();
        const target = existing.find((illustration) => illustration.key === wanted);
        if (!target) {
          missed.push(wanted || "(no key)");
          continue;
        }

        let stored;
        try {
          stored = await storeImageFromUrl(String(row.url ?? ""));
        } catch (error) {
          throw new ToolError(`${wanted}: ${error instanceof Error ? error.message : String(error)}`);
        }

        target.path = stored.path;
        if (typeof row.alt === "string" && row.alt.trim()) target.alt = row.alt.trim();
        if (typeof row.caption === "string" && row.caption.trim()) target.caption = row.caption.trim();
        done.push({ key: wanted, path: stored.path });
      }

      // The cover is also the page's hero image, which is what a card and a
      // share preview use, so it has to be in both places.
      const cover = existing.find((illustration) => illustration.slot === "cover" && illustration.path);

      await db.guide.update({
        where: { id: guide.id },
        data: {
          illustrations: stringify(existing satisfies Illustration[]),
          ...(cover ? { heroImage: cover.path } : {}),
        },
      });

      await recordWrite(ctx, {
        action: "update",
        entityType: "guide",
        entityId: guide.id,
        summary: `${done.length} picture${done.length === 1 ? "" : "s"} attached`,
        paths: ["/", routes.guidesIndex(), routes.guide(guide.slug)],
      });
      if (guide.status === "PUBLISHED") announceGuide(guide.slug);

      return {
        attached: done,
        // A key that matches nothing is a typo or a picture for a figure block
        // that is not in the body, and both are worth saying rather than
        // silently ignoring.
        unmatched: missed,
        stillMissing: existing.filter((illustration) => !illustration.path).map((illustration) => illustration.key),
      };
    },
  },

  {
    name: "publish_guide",
    title: "Publish a guide",
    description:
      "Puts a guide live, now or at a time you name. It refuses without an author, because a byline is a claim somebody has to make.",
    write: true,
    schema: object({ guide: str("The guide id or slug."), at: str("ISO date and time. Omit to publish now.") }, ["guide"]),
    handler: async (args, ctx) => {
      const key = reqStr(args, "guide");
      const guide = await db.guide.findFirst({
        where: { OR: [{ id: key }, { slug: key }] },
        select: { id: true, slug: true, title: true, status: true, authorId: true, publishedAt: true },
      });
      if (!guide) throw new ToolError(`No guide has the id or slug ${key}.`);
      if (!guide.authorId) {
        throw new ToolError("That guide has no author. Set one with upsert_guide before publishing it.");
      }

      const when = optStr(args, "at");
      if (when) {
        const at = new Date(when);
        if (Number.isNaN(at.getTime())) throw new ToolError("at is not a valid date.");

        const job = await db.guideJob.findFirst({ where: { guideId: guide.id }, select: { id: true } });
        if (!job) throw new ToolError("Only a guide with a commission can be scheduled. Publish it now instead.");

        await db.guideJob.update({ where: { id: job.id }, data: { publishAt: at } });
        await logJobEvent(job.id, { actor: actorOf(ctx), status: "PUBLISHED", note: `Scheduled for ${fullDate(at)}.` });
        return { scheduled: fullDate(at), url: routes.guide(guide.slug) };
      }

      await db.guide.update({
        where: { id: guide.id },
        data: { status: "PUBLISHED", publishedAt: guide.publishedAt ?? new Date() },
      });
      announceGuide(guide.slug);
      await recordWrite(ctx, {
        action: "update",
        entityType: "guide",
        entityId: guide.id,
        summary: `published ${guide.title}`,
        paths: ["/", routes.guidesIndex(), routes.guide(guide.slug)],
      });

      return { published: true, url: routes.guide(guide.slug) };
    },
  },

  {
    name: "guide_gaps",
    title: "What is worth writing",
    description:
      "Two lists: the topics the radar found and nobody has commissioned, and the published guides thin enough to be worth rewriting. Commission from either with commission_guide.",
    schema: object({ limit: int("Up to 50 of each. Default 15.") }),
    handler: async (args) => {
      const take = limitOf(args, 15, 50);

      const [ideas, thin] = await Promise.all([
        db.topicIdea.findMany({
          where: { jobId: null, status: { in: ["SUGGESTED", "ACCEPTED"] } },
          orderBy: { score: "desc" },
          take,
          include: { category: { select: { serviceName: true } }, plan: { select: { weekOf: true } } },
        }),
        rewriteCandidates(),
      ]);

      return {
        uncommissioned: ideas.map((idea) => ({
          topicIdeaId: idea.id,
          topic: idea.topic,
          keyword: idea.keyword,
          guideType: idea.guideType,
          service: idea.category?.serviceName ?? null,
          searches: idea.volume,
          difficulty: idea.difficulty,
          score: idea.score,
          angle: idea.angle,
          weekOf: idea.plan ? fullDate(idea.plan.weekOf) : null,
        })),
        worthRewriting: thin.slice(0, take).map((candidate) => ({
          guideId: candidate.guideId,
          title: candidate.title,
          url: routes.guide(candidate.slug),
          words: candidate.words,
          questions: candidate.faqs,
          keyword: candidate.keyword,
          // Already queued once. Commissioning it again would put two rewrites
          // of the same page in the queue.
          alreadyQueued: candidate.hasJob,
        })),
      };
    },
  },
];
