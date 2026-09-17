/**
 * Which images off a company's website are pictures of its work.
 *
 * A contractor's home page carries a gallery and it also carries a $50 off
 * coupon, a Google review badge, a BBB seal, a financing banner and a popup.
 * Those all pass a naive filter: they are large JPEGs on the same host with alt
 * text. Published on a profile they read as the company's work, and the ones
 * with an offer in them go stale the week after they are scraped.
 *
 * The rules live here rather than inside the crawler so the same judgement is
 * applied wherever a photo is about to be saved.
 */

/**
 * Words that mark an image as a promotion, a mark or a piece of furniture
 * rather than a photograph. Matched against the URL and the alt text together.
 */
export const NOT_A_PHOTO =
  /(offers?|promo|coupon|financ(?:e|ing)|rebate|badge|logos?|icons?|buttons?|review[-\s]?us|google[-\s]?reviews?|\bbbb\b|homestars|awards?|banner|popup|pop-?up|payment|visa|mastercard|amex|paypal|google[-\s]?play|app[-\s]?store|stars?-|rating|certified|accredit|\bseal\b|sprite|placeholder|spacer|pixel|1x1|blank|favicon)/i;

/** How wide a picture has to be before it is worth publishing. */
export const MIN_WIDTH = 400;

/**
 * A picture of a roof is between a tall portrait and a wide landscape. Outside
 * that it is a banner, a divider or a sidebar strip.
 */
export const MIN_RATIO = 0.4;
export const MAX_RATIO = 2.5;

export type PhotoCandidate = {
  url: string;
  alt?: string | null;
  /** Zero or absent when the page did not say, which is not a reason to reject. */
  width?: number | null;
  height?: number | null;
};

export type PhotoVerdict = { ok: true } | { ok: false; reason: string };

export function checkPhoto(candidate: PhotoCandidate): PhotoVerdict {
  const haystack = `${candidate.url} ${candidate.alt ?? ""}`;
  const marker = NOT_A_PHOTO.exec(haystack);
  if (marker) return { ok: false, reason: `"${marker[0]}" in the name or the alt text` };

  const width = Number(candidate.width ?? 0);
  const height = Number(candidate.height ?? 0);

  // A width we were never told is not a small width. The crawler's size check
  // catches those; guessing here would throw away most of a lazy-loaded site.
  if (width > 0 && width < MIN_WIDTH) return { ok: false, reason: `${width}px wide` };

  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      return { ok: false, reason: `${width}x${height}, which is a banner rather than a photo` };
    }
  }

  return { ok: true };
}

export function isPublishablePhoto(candidate: PhotoCandidate): boolean {
  return checkPhoto(candidate).ok;
}
