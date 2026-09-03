import { db } from "./db";

// What a company can see of its own leads.
//
// A lead is always stored and always emailed. What a plan buys is the contact
// details on it. That is the whole commercial argument for claiming a listing,
// so the rule lives in one function: change it here and every screen, every
// email and every API response follows.

export type LeadAccess = {
  unlocked: boolean;
  /** Why, in a sentence, for the screen that has to explain it. */
  reason: string;
  claimed: boolean;
  planName: string | null;
};

const LOCKED_CLAIMED =
  "This listing is claimed but has no active plan, so the contact details on new leads stay hidden.";
const LOCKED_UNCLAIMED =
  "This listing has not been claimed, so the contact details on new leads stay hidden.";

/** Reads the plan behind a business and decides whether leads open up. */
export async function leadAccessFor(businessId: string): Promise<LeadAccess> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      claimed: true,
      subscriptions: {
        where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: { select: { name: true } } },
      },
    },
  });
  if (!business) return { unlocked: false, reason: LOCKED_UNCLAIMED, claimed: false, planName: null };

  const plan = business.subscriptions[0]?.plan.name ?? null;
  if (plan) {
    return {
      unlocked: true,
      reason: `Contact details are visible on the ${plan} plan.`,
      claimed: business.claimed,
      planName: plan,
    };
  }

  return {
    unlocked: false,
    reason: business.claimed ? LOCKED_CLAIMED : LOCKED_UNCLAIMED,
    claimed: business.claimed,
    planName: null,
  };
}

/**
 * Blanks the parts of a lead a locked listing may not read. The row itself is
 * never changed: this is a view of it, so the day a plan starts the same lead
 * comes back whole.
 */
export function maskLead<T extends { email: string; phone: string | null; postalCode: string | null; message: string }>(
  lead: T,
  unlocked: boolean,
): T & { masked: boolean } {
  if (unlocked) return { ...lead, masked: false };
  return {
    ...lead,
    email: hide(lead.email),
    phone: lead.phone ? hide(lead.phone) : null,
    postalCode: lead.postalCode ? "•••" : null,
    // The message can carry a phone number or an address in the text, so it is
    // held back whole rather than picked over for the bits that identify.
    message: "",
    masked: true,
  };
}

/** Keeps the shape of a value without giving it away: "j••••@g•••.com". */
function hide(value: string): string {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    const [host, ...tld] = domain.split(".");
    return `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}@${host.slice(0, 1)}${"•".repeat(3)}.${tld.join(".")}`;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length > 3 ? `${digits.slice(0, 3)} ••• ••••` : "••• ••• ••••";
}

/** The first name only, which is what a locked listing is shown. */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 1 ? first : name;
}
