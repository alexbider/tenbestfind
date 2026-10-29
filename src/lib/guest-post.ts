import { z } from "zod";

/** The plan key and submission kind for a paid guest post. */
export const GUEST_POST_PLAN_KEY = "guestpost";
export const GUEST_POST_KIND = "GUEST_POST";

/** Where a guest post order sits. The payment state is set by the webhook. */
export type GuestPostPayment =
  | { state: "awaiting_payment" }
  | { state: "recorded" }
  | { state: "paid"; sessionId: string; paidAt: string };

const https = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a full https:// address");

export const guestPostSchema = z.object({
  business: z.string().trim().min(2, "Tell us the business name").max(200),
  name: z.string().trim().min(2, "Tell us your name").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  topic: z.string().trim().min(10, "Describe the post topic in a sentence").max(300),
  url1: https,
  anchor1: z.string().trim().min(2, "Give the anchor text for link one").max(80),
  url2: https,
  anchor2: z.string().trim().min(2, "Give the anchor text for link two").max(80),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type GuestPostInput = z.infer<typeof guestPostSchema>;

/** The two paid links, in the order the customer gave them. */
export function guestPostLinks(input: GuestPostInput) {
  return [
    { url: input.url1, anchor: input.anchor1 },
    { url: input.url2, anchor: input.anchor2 },
  ];
}

/** Reads a stored order payload. A corrupt payload reads as empty, never throws. */
export function parseOrderPayload(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
