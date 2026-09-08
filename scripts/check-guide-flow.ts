// The whole guide workflow, driven through the MCP tools rather than around
// them, against the real database.
//
// This is the check that would have caught the failure that started all of
// this: it commissions a guide, writes a draft, submits it, accepts it and
// publishes it, and every step goes through the tool a writer would actually
// call. Nothing here talks to Anthropic or DataForSEO, so it costs nothing and
// can be run on any checkout.
//
// It cleans up after itself, but it does write to whatever database it is
// pointed at, so it is not part of the deploy: run it on a development copy.
//
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/check-guide-flow.ts

import { db } from "../src/lib/db";
import { TOOLS } from "../src/lib/mcp";
import type { ToolContext } from "../src/lib/mcp/kit";

// Every write is audited against a real account, so the check runs as one.
let ctx: ToolContext;

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok   " : "WRONG"} ${label}`);
  if (!ok && detail !== undefined) console.log(`        ${JSON.stringify(detail).slice(0, 400)}`);
}

async function call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const tool = TOOLS.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`There is no tool called ${name}.`);
  return (await tool.handler(args, ctx)) as Record<string, unknown>;
}

/** A draft that satisfies the contract, with one bad link and one bad source. */
function draftFor(topic: string) {
  return {
    title: `${topic}, answered properly`,
    slug: "flow-check-guide",
    excerpt: "A short summary of what this guide covers, long enough to be a real excerpt rather than a label.",
    shortAnswer:
      "The short answer goes here, and it has to be long enough to be worth reading on its own because an assistant may quote nothing else.",
    keyTakeaways: ["The first thing worth knowing.", "The second thing.", "The third thing."],
    body: [
      { kind: "heading", text: "What this actually costs", id: "cost" },
      {
        kind: "paragraph",
        text: "This paragraph links to a page that does not exist on this site at all.",
        links: [{ text: "does not exist", href: "/nowhere-at-all/" }],
      },
      { kind: "list", items: ["One", "Two", "Three"] },
      { kind: "steps", items: [{ title: "First", body: "Do this." }, { title: "Second", body: "Then this." }] },
      { kind: "callout", tone: "alert", title: "Careful", body: "This is the thing to watch for." },
      {
        kind: "compare",
        title: "Side by side",
        rows: [
          { factor: "Price", check: "Ask for it in writing", why: "Because it moves" },
          { factor: "Insurance", check: "From the insurer", why: "Because a PDF proves nothing" },
        ],
      },
    ],
    bottomLine: "The closing paragraph, which says what to do with everything above it.",
    faqs: [{ question: "Is this a question?", answer: "Yes, and this is the answer to it." }],
    sources: [{ label: "An invented citation", url: "https://not-an-authority.example.com/page", tier: "PRIMARY" }],
    readingMinutes: 9,
    metaTitle: "A meta title long enough",
    metaDescription:
      "A meta description that is long enough to satisfy the minimum, which is sixty characters of real text.",
    focusKeyword: "flow check",
    confidence: "Written by a test.",
    illustrations: [
      { key: "cover", slot: "cover", scene: "A wide shot of the work being done.", alt: "Work being done" },
      { key: "inline-1", slot: "inline", scene: "A close shot of the tool in a hand.", alt: "A tool in a hand" },
    ],
  };
}

async function main(): Promise<void> {
  console.log("the guides desk, end to end\n");

  const staff = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } });
  if (!staff) {
    console.log("  no admin account on this database, so nothing can be audited. Seed it first.");
    process.exit(1);
  }
  ctx = {
    user: { id: staff.id, email: staff.email, name: staff.name, role: "ADMIN" },
    scope: "mcp:read mcp:write",
    tokenId: "flow-check",
    clientName: "Claude (flow check)",
  };

  const before = await call("guide_desk", {});
  check("guide_desk answers", typeof before.commissions === "object", before);

  // 1. Commission it. No research: this must not spend money or need a key.
  const commissioned = await call("commission_guide", {
    topic: "How much does a flow check cost?",
    keyword: "flow check cost",
    guideType: "COST",
    research: false,
  });
  const id = String(commissioned.id);
  check("commissioning returns an id", id.length > 0, commissioned);
  check("with nothing to buy it is ready to write", commissioned.status === "BRIEFED", commissioned);

  try {
    // 2. The assignment.
    const pack = await call("get_commission", { id, history: true });
    check("the assignment is rendered", String(pack.assignment ?? "").length > 200);
    check("the house voice is there", String(pack.houseVoice ?? "").length > 200);
    check("the block reference is there", Object.keys((pack.blockKinds ?? {}) as object).length === 11, pack.blockKinds);
    check("the internal links are a real list", Array.isArray(pack.internalLinks));
    check("the citable domains are named", String(pack.citableDomains ?? "").includes("."));

    // 3. Claim it.
    const claimed = await call("claim_commission", { id, note: "Reading the research." });
    check("claiming sets the writer", claimed.writer === ctx.clientName, claimed);
    check("claiming moves it to WRITING", claimed.status === "WRITING", claimed);

    // 4. A draft that does not fit must be refused, with the reason.
    let refused = "";
    try {
      await call("submit_guide", { id, draft: { title: "too short" } });
    } catch (error) {
      refused = error instanceof Error ? error.message : String(error);
    }
    check("a malformed draft is refused by field", refused.includes("body") || refused.includes("title"), refused);

    // 5. The real one.
    const submitted = await call("submit_guide", {
      id,
      draft: draftFor("How much does a flow check cost?"),
      notes: "Nothing to flag.",
    });
    check("the draft lands", submitted.status === "DRAFTED", submitted);
    check("the invented citation is gone", submitted.sourcesKept === 0, submitted);
    check("the link to nowhere is gone", JSON.stringify(submitted.removed ?? []).includes("LINK CHECK"), submitted.removed);
    check("the pictures to make are listed", Array.isArray(submitted.illustrationsToMake), submitted);

    // 6. The history reads as a story.
    const withHistory = await call("get_commission", { id, history: true });
    const history = (withHistory.history ?? []) as { note: string }[];
    check("every step is logged", history.length >= 4, history);

    // 7. Accept it, which is where it becomes a page.
    const accepted = await call("accept_commission", { id });
    const guideId = String(accepted.guideId);
    check("a guide comes out of it", guideId.length > 0, accepted);
    check("and it is a draft, not live", accepted.status === "DRAFT", accepted);

    const guide = await db.guide.findUnique({
      where: { id: guideId },
      include: { faqs: true, sources: true },
    });
    check("the questions came with it", (guide?.faqs.length ?? 0) === 1);
    check("the SEO record was written", Boolean(await db.seoMeta.findFirst({ where: { entityId: guideId } })));

    // 8. Publishing without a byline is refused.
    let blocked = "";
    try {
      await call("publish_guide", { guide: guideId });
    } catch (error) {
      blocked = error instanceof Error ? error.message : String(error);
    }
    check("publishing needs an author", blocked.includes("author"), blocked);

    // 9. Give it one, and it goes live.
    const person = await db.person.findFirst({ select: { id: true } });
    if (person) {
      await db.guide.update({ where: { id: guideId }, data: { authorId: person.id } });
      const published = await call("publish_guide", { guide: guideId });
      check("with a byline it publishes", published.published === true, published);
    } else {
      console.log("  skip  no people on file, so the byline case cannot run");
    }

    // 10. And the gaps list still works.
    const gaps = await call("guide_gaps", {});
    check("the gaps list answers", Array.isArray(gaps.uncommissioned) && Array.isArray(gaps.worthRewriting), gaps);

    await db.guide.delete({ where: { id: guideId } });
    await db.seoMeta.deleteMany({ where: { entityId: guideId } });
  } finally {
    await db.guideJob.deleteMany({ where: { id } });
  }

  console.log(failures === 0 ? "\nall good" : `\n${failures} wrong`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
