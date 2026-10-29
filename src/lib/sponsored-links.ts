/**
 * Paid links never pass ranking signals. Every link we are paid to place gets
 * rel="sponsored", and nothing paid is ever rendered as a plain followed link.
 */
export const SPONSORED_REL = "sponsored";

/** The attributes a paid link must carry. Spread onto the anchor. */
export function sponsoredLinkProps(): { rel: typeof SPONSORED_REL } {
  return { rel: SPONSORED_REL };
}
