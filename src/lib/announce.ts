// Telling the search engines that a page changed.
//
// There are three mechanisms and they are not interchangeable, so every publish
// goes through here rather than picking one:
//
//   The sitemap is the contract. It is complete, it is authoritative, and it is
//   what Google actually works from. It needs no announcement.
//
//   IndexNow is a push, and Bing, Yandex and Naver act on it within minutes.
//   Google ignores it. It is sent immediately because it is free and instant.
//
//   The Google Indexing API is queued rather than sent, because the quota is
//   200 URLs a day and one batch import would spend all of it on profiles
//   nobody is waiting for.
//
// Nothing here is awaited by its callers and nothing here can throw. Publishing
// a page must not depend on, or be delayed by, a search engine having a good
// day.

import { queueForIndexing } from "./google-indexing";
import { pingIndexNow } from "./indexnow";

/** Announce one or more site-relative paths, from a server action. */
export function announce(paths: string[]): void {
  pingIndexNow(paths);
  void queueForIndexing(paths).catch(() => {});
}
