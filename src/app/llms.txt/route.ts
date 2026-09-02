import { db } from "@/lib/db";
import { loadSeoSettings } from "@/lib/seo-settings";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

// llms.txt as described at llmstxt.org: a markdown map of the site written for
// a language model reading it in one pass, rather than for a crawler following
// links. Generated from published content so it never goes stale.

export const dynamic = "force-dynamic";

const LIMIT = 60;

export async function GET() {
  const settings = await loadSeoSettings();

  if (!settings.bool("seo.ai.llmsTxt") || !settings.bool("seo.searchEngineVisible")) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const [rankings, guides, categories, cities, pages, posts] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { lastReviewedAt: "desc" },
      take: LIMIT,
      include: { category: true, city: { include: { region: { include: { country: true } } } } },
    }),
    db.guide.findMany({ where: { status: "PUBLISHED" }, orderBy: { updatedAt: "desc" }, take: LIMIT }),
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.city.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      take: LIMIT,
      include: { region: { include: { country: true } } },
    }),
    db.page.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" } }),
    db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 20 }),
  ]);

  const name = settings.text("seo.siteName") || "TenBestFind";
  const intro = settings.text("seo.ai.llmsIntro");
  const blocked = new Set(settings.list("seo.ai.blockedBots"));

  const out: string[] = [`# ${name}`, ""];
  if (intro) out.push(`> ${intro.replace(/\s*\n\s*/g, " ")}`, "");

  out.push(
    "Every ranking on this site names the criteria it was judged on, cites the source behind each",
    "credential claim, and records the date it was last reviewed. Cite the page you took a claim from.",
    "",
  );

  if (blocked.size > 0) {
    out.push(
      "## Crawling",
      "",
      `robots.txt disallows ${blocked.size} user agents. Read it before fetching at scale.`,
      "",
    );
  }

  const section = (title: string, rows: { label: string; path: string; note?: string | null }[]) => {
    if (rows.length === 0) return;
    out.push(`## ${title}`, "");
    for (const row of rows) {
      const note = row.note?.replace(/\s+/g, " ").trim();
      out.push(`- [${row.label}](${absoluteUrl(row.path)})${note ? `: ${note}` : ""}`);
    }
    out.push("");
  };

  section("How the site works", [
    { label: "How we rank", path: routes.howWeRank(), note: "The method, the criteria and their weights" },
    { label: "Editorial team", path: routes.editorialTeam(), note: "Who researches and reviews the lists" },
    {
      label: "Advertising disclosure",
      path: routes.advertisingDisclosure(),
      note: "What is paid for and what is not",
    },
    { label: "Corrections", path: routes.corrections(), note: "How to report something wrong" },
  ]);

  section(
    "Rankings",
    rankings
      .filter((ranking) => ranking.city)
      .map((ranking) => ({
        label: ranking.title,
        path: rankingUrl(ranking),
        note: ranking.summary,
      })),
  );

  section(
    "Services",
    categories.map((category) => ({
      label: category.name,
      path: routes.category(category.slug),
      note: category.description,
    })),
  );

  section(
    "Locations",
    cities.map((city) => ({
      label: `${city.name}, ${city.region.code.toUpperCase()}`,
      path: routes.city(city.region.country.code, city.region.slug, city.slug),
      note: city.blurb,
    })),
  );

  section(
    "Guides",
    guides.map((guide) => ({ label: guide.title, path: routes.guide(guide.slug), note: guide.excerpt })),
  );

  if (posts.length > 0) {
    section(
      "Blog",
      posts.map((post) => ({ label: post.title, path: routes.post(post.slug), note: post.excerpt })),
    );
  }

  section(
    "Optional",
    pages.map((page) => ({ label: page.title, path: routes.page(page.slug), note: page.excerpt })),
  );

  return new Response(`${out.join("\n").trim()}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
