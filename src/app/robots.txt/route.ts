import { absoluteUrl } from "@/lib/urls";
import { AI_BOTS, loadSeoSettings } from "@/lib/seo-settings";

// A route handler rather than Next's robots.ts, because the file needs per-bot
// blocks, a crawl delay and whatever custom lines the admin has added, and the
// metadata helper can only express a subset of that.

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSeoSettings();
  const lines: string[] = [];

  if (!settings.bool("seo.searchEngineVisible")) {
    lines.push("# Indexing is switched off in the admin.", "User-agent: *", "Disallow: /");
    return text(lines);
  }

  const disallow = [
    "/admin",
    "/search",
    "/api/",
    ...settings.list("seo.robots.extraDisallow").map((path) => (path.startsWith("/") ? path : `/${path}`)),
  ];

  lines.push("User-agent: *");
  for (const path of disallow) lines.push(`Disallow: ${path}`);
  lines.push("Allow: /");

  const crawlDelay = settings.num("seo.robots.crawlDelay");
  if (crawlDelay > 0) lines.push(`Crawl-delay: ${crawlDelay}`);

  const blocked = new Set(settings.list("seo.ai.blockedBots"));
  const blockedBots = AI_BOTS.filter((bot) => blocked.has(bot.agent));
  if (blockedBots.length > 0) {
    lines.push("", "# AI crawlers blocked in the admin.");
    for (const bot of blockedBots) {
      lines.push(`User-agent: ${bot.agent}`, "Disallow: /", "");
    }
    lines.pop();
  }

  lines.push("", `Sitemap: ${absoluteUrl("/sitemap.xml")}`);

  if (settings.bool("seo.ai.llmsTxt")) {
    lines.push(`# Site map for language models: ${absoluteUrl("/llms.txt")}`);
  }

  const custom = settings.text("seo.robots.custom");
  if (custom) lines.push("", custom);

  return text(lines);
}

function text(lines: string[]) {
  return new Response(`${lines.join("\n").trim()}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
