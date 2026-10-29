import { z } from "zod";

/** The plan key and the placement kind for a Top 10 featured placement. */
export const TOP10_PLAN_KEY = "top10";
export const FEATURED_PARTNER_KIND = "FEATURED_PARTNER";

export const top10Schema = z.object({
  businessSlug: z.string().trim().min(1, "Choose the business"),
  cityId: z.string().trim().min(1, "Choose the city"),
  categoryId: z.string().trim().min(1, "Choose the trade"),
  name: z.string().trim().min(2, "Tell us your name").max(200),
  email: z.string().trim().email("Enter a valid email address"),
});

export type Top10Input = z.infer<typeof top10Schema>;

/**
 * A Top 10 placement sits beside one city and trade page, so the business has
 * to be published there, and it has to be claimed so that someone who runs it
 * is the one paying for it.
 */
export function top10Eligibility(
  business: { status: string; claimed: boolean; cityId: string | null; categoryId: string },
  input: { cityId: string; categoryId: string },
): string | null {
  if (business.status !== "PUBLISHED") return "That business is not published yet.";
  if (!business.claimed) return "Claim the business before buying a featured placement for it.";
  if (business.cityId !== input.cityId || business.categoryId !== input.categoryId) {
    return "Pick a business that is listed in the same city and trade as the placement.";
  }
  return null;
}
