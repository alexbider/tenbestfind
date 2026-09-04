/**
 * Exercises the website-reading half of enrichment against a page you control.
 *
 * The crawler and the YouTube reader are the two pieces with no unit test of
 * their own and the two most likely to be broken by a change to a regular
 * expression, so this walks both: it crawls a URL and prints what came back,
 * then parses a captured channel page and feed without going near the network.
 *
 *   npx tsx scripts/check-enrich.ts http://127.0.0.1:3300/index.html
 */
import { crawlSite } from "../src/lib/site-crawl";
import { channelIdFor, latestChannelVideos } from "../src/lib/youtube";

const CHANNEL_PAGE = `<!doctype html><html><head>
<link rel="canonical" href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstu">
<meta itemprop="channelId" content="UCabcdefghijklmnopqrstu">
</head><body><script>{"externalId":"UCabcdefghijklmnopqrstu"}</script></body></html>`;

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>Full tear-off in Plano &amp; Frisco</title><published>2026-06-14T09:00:00+00:00</published></entry>
 <entry><yt:videoId>eeeeeeeeeee</yt:videoId><title>Standing seam metal install</title><published>2026-05-02T09:00:00+00:00</published></entry>
 <entry><yt:videoId>fffffffffff</yt:videoId><title>Insurance claim walkthrough</title><published>2026-04-11T09:00:00+00:00</published></entry>
 <entry><yt:videoId>ggggggggggg</yt:videoId><title>One too many</title><published>2026-03-01T09:00:00+00:00</published></entry>
</feed>`;

async function main(): Promise<void> {
  const url = process.argv[2];
  if (url) {
    const site = await crawlSite(url);
    console.log("pages read:", site.pagesRead);
    console.log("summary:", site.summary?.slice(0, 80));
    console.log("year founded:", site.yearFounded);
    console.log("phones:", site.phones, "emails:", site.emails);
    console.log("licences:", site.licenseNumbers);
    console.log("social:", site.social);
    console.log("videos:", site.videos);
  }

  // The two YouTube steps, against captured responses rather than the network.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const target = String(input);
    const body = target.includes("feeds/videos.xml") ? FEED : CHANNEL_PAGE;
    return new Response(body, { status: 200 });
  }) as typeof fetch;

  try {
    const fromHandle = await channelIdFor("https://www.youtube.com/@bluebonnetexteriors");
    const fromChannelUrl = await channelIdFor(
      "https://www.youtube.com/channel/UCabcdefghijklmnopqrstu",
    );
    console.log("channel id from a handle:", fromHandle);
    console.log("channel id from a channel url:", fromChannelUrl);
    console.log("not youtube:", await channelIdFor("https://example.com/"));
    console.log("latest three:", await latestChannelVideos("UCabcdefghijklmnopqrstu", 3));
  } finally {
    globalThis.fetch = realFetch;
  }
}

main();
