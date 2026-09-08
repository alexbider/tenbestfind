// What a guide's pictures are, and where they are.
//
// A guide is written before it is illustrated, so the body refers to a picture
// by key and this holds the key-to-file map. That indirection is worth a small
// amount of ceremony: a figure whose image does not exist yet renders as
// nothing rather than as a broken image, a picture can be re-shot without
// touching a word of the body, and the brief that produced an image stays
// attached to it so the next one can match.
//
// Charts are deliberately not here. A chart is data rendered by the page, not
// a picture fetched from anywhere, because a generated chart carries invented
// numbers and this site's whole argument is that its numbers are real.

import { parseJson } from "./json";

export type IllustrationSlot = "cover" | "inline";

export type Illustration = {
  /** Stable, lowercase, hyphenated. What a figure block in the body refers to. */
  key: string;
  slot: IllustrationSlot;
  /** What to generate. Written by the writer, edited by a person, read by whoever makes the picture. */
  scene: string;
  alt: string;
  caption?: string;
  /** Where it ended up, once it has been made. Absent means still to do. */
  path?: string;
};

export function parseIllustrations(value: string | null | undefined): Illustration[] {
  const rows = parseJson<unknown[]>(value, []);
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      key: String(row.key ?? "").trim(),
      slot: row.slot === "cover" ? ("cover" as const) : ("inline" as const),
      scene: String(row.scene ?? "").trim(),
      alt: String(row.alt ?? "").trim(),
      caption: typeof row.caption === "string" && row.caption.trim() ? row.caption.trim() : undefined,
      path: typeof row.path === "string" && row.path.trim() ? row.path.trim() : undefined,
    }))
    .filter((row) => row.key.length > 0);
}

/** The map the body's figure blocks are resolved against. */
export function imageMap(illustrations: Illustration[]): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {};
  for (const illustration of illustrations) {
    if (illustration.path) map[illustration.key] = illustration.path;
  }
  return map;
}

/** The cover, which is also the guide's hero. */
export function coverOf(illustrations: Illustration[]): Illustration | null {
  return illustrations.find((illustration) => illustration.slot === "cover") ?? null;
}

/** What still needs making. */
export function pendingIllustrations(illustrations: Illustration[]): Illustration[] {
  return illustrations.filter((illustration) => !illustration.path);
}
