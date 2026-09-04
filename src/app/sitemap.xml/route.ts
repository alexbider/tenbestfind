import { sitemapIndex, sitemapIndexXml, xmlResponse } from "@/lib/sitemap";

// The index, not a list of URLs. A route handler rather than Next's sitemap.ts
// because that helper can only produce one urlset, and one file cannot carry a
// directory this size.

export const revalidate = 3600;

export async function GET() {
  return xmlResponse(sitemapIndexXml(await sitemapIndex()));
}
