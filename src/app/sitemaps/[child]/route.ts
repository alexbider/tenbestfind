import { notFound } from "next/navigation";
import { sitemapChild, urlsetXml, xmlResponse } from "@/lib/sitemap";

// One child of the index. The name arrives with its extension, so a crawler
// asking for /sitemaps/cities.xml gets the cities and a crawler asking for
// something that does not exist gets a 404 rather than an empty file it will
// keep coming back to.

export const revalidate = 3600;

export async function GET(request: Request, context: { params: Promise<{ child: string }> }) {
  const { child } = await context.params;
  const name = child.replace(/\.xml$/, "");

  const entries = await sitemapChild(name);
  if (entries === null) notFound();
  return xmlResponse(urlsetXml(entries));
}
