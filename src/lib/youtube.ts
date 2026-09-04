// The company's own YouTube channel, read without an API key.
//
// Every channel publishes an Atom feed of its uploads at a stable URL, keyed on
// the channel id. So the whole job is: turn whatever link the website put in
// its footer into a channel id, then read that feed. No key to store, no quota
// to run out of, and nothing that breaks when a key is rotated.
//
// A handle link (/@company) does not carry the id, so the page is fetched once
// and the id read out of it. That is the only page fetch here; the feed itself
// is small and cheap.

const TIMEOUT_MS = 9000;
const USER_AGENT = "TenBestFindBot/1.0 (+https://tenbestfind.com/how-we-rank/)";

export type ChannelVideo = {
  videoId: string;
  title: string;
  publishedAt: Date | null;
};

async function fetchText(url: string, accept: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept },
    });
    if (!response.ok) return null;
    return (await response.text()).slice(0, 600_000);
  } catch {
    return null;
  }
}

/** The id out of a URL that already carries one, without a fetch. */
function idInUrl(url: string): string | null {
  return /youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})/i.exec(url)?.[1] ?? null;
}

/**
 * The channel id behind any YouTube link a website might print: a channel URL,
 * a handle, a custom /c/ name, a user page, or even a link to one of its
 * videos. Null when the link is not YouTube or the page does not say.
 */
export async function channelIdFor(url: string | null): Promise<string | null> {
  if (!url || !/youtube\.com|youtu\.be/i.test(url)) return null;

  const direct = idInUrl(url);
  if (direct) return direct;

  const html = await fetchText(url, "text/html");
  if (!html) return null;

  // YouTube prints the id in three places on a channel page and at least one of
  // them survives whatever the page is: the canonical link, the itemprop meta,
  // and the player config.
  return (
    idInUrl(html) ??
    /"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/.exec(html)?.[1] ??
    /"externalId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/.exec(html)?.[1] ??
    null
  );
}

/** Unescapes the five entities an Atom feed is allowed to carry. */
function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * The channel's most recent uploads, newest first. The feed holds the last
 * fifteen, which is more than any caller here wants.
 */
export async function latestChannelVideos(
  channelId: string,
  limit = 3,
): Promise<ChannelVideo[]> {
  const xml = await fetchText(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    "application/atom+xml,application/xml",
  );
  if (!xml) return [];

  const videos: ChannelVideo[] = [];
  for (const entry of xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []) {
    const videoId = /<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/.exec(entry)?.[1];
    if (!videoId) continue;
    const title = /<title>([\s\S]*?)<\/title>/.exec(entry)?.[1];
    const published = /<published>([^<]+)<\/published>/.exec(entry)?.[1];
    const at = published ? new Date(published) : null;
    videos.push({
      videoId,
      title: title ? decode(title).trim().slice(0, 160) : "Untitled video",
      publishedAt: at && !Number.isNaN(at.getTime()) ? at : null,
    });
    if (videos.length >= limit) break;
  }
  return videos;
}

/** "June 2026", the line the profile prints under a video's title. */
export function videoMeta(publishedAt: Date | null): string | null {
  if (!publishedAt) return null;
  return publishedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
