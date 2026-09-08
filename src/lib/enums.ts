// The schema stores these as strings so it stays portable to PostgreSQL, where
// they can become native enums. These unions are the single source of truth for
// the allowed values.

export const CONTENT_STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/**
 * What a question can be attached to.
 *
 * GLOBAL is the fallback pool every page draws on when it has nothing of its
 * own. The rest attach to one record, and each one names the column that holds
 * the link, so a scope cannot be added without saying where it is stored.
 */
export const FAQ_SCOPE_FIELDS = {
  RANKING: "rankingId",
  GUIDE: "guideId",
  COUNTRY: "countryId",
  PAGE: "pageId",
  BUSINESS: "businessId",
  CATEGORY: "categoryId",
  SUBSERVICE: "subserviceId",
  REGION: "regionId",
  CITY: "cityId",
} as const;

export type FaqAttachment = keyof typeof FAQ_SCOPE_FIELDS;
export const FAQ_SCOPES = ["GLOBAL", ...(Object.keys(FAQ_SCOPE_FIELDS) as FaqAttachment[])] as const;
export type FaqScope = (typeof FAQ_SCOPES)[number];

export const BUSINESS_STATUSES = [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  // Taken down for a reason that may end: a dispute, a complaint, unpaid
  // invoices. Distinct from ARCHIVED, which means retired for good.
  "SUSPENDED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const CREDENTIAL_STATUSES = ["VERIFIED", "REPORTED", "EXPIRED"] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const PERSON_CREDENTIAL_STATUSES = [
  "VERIFIED",
  "SELF_REPORTED",
  "EXPIRED",
] as const;
export type PersonCredentialStatus = (typeof PERSON_CREDENTIAL_STATUSES)[number];

export const IMPORTANCE_LEVELS = ["HIGH", "MODERATE", "SUPPORTING"] as const;
export type Importance = (typeof IMPORTANCE_LEVELS)[number];

export const SOURCE_TIERS = ["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const SUBSCRIPTION_STATUSES = [
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["OPEN", "PAID", "VOID", "REFUNDED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CLAIM_STATUSES = [
  "SUBMITTED",
  "VERIFYING",
  "APPROVED",
  "REJECTED",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const SUBMISSION_STATUSES = ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const USER_ROLES = ["ADMIN", "EDITOR", "BUSINESS_OWNER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ANALYTICS_EVENTS = [
  "PAGE_VIEW",
  "RANKING_VIEW",
  "PROFILE_VIEW",
  "IMPRESSION",
  "WEBSITE_CLICK",
  "PHONE_CLICK",
  "QUOTE_CLICK",
  "DIRECTIONS_CLICK",
  "SEARCH",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[number];

export const SEO_ENTITY_TYPES = [
  "page",
  "post",
  "ranking",
  "guide",
  "business",
  "category",
  // A subservice page is editable in the admin like any other landing page, so
  // it gets the same per-entity SEO record rather than being the one template
  // whose title nobody can override.
  "subservice",
  "city",
  "region",
  "country",
  "person",
] as const;
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number];

/**
 * What question a guide answers.
 *
 * These are the four buckets the site navigates by, so the type is not
 * decoration: it decides which hub a guide appears on. COST additionally
 * switches the template, because a cost guide carries price ranges and a
 * sourced table that the others have no use for.
 */
export const GUIDE_TYPES = ["HOW_TO_CHOOSE", "COST", "QUESTIONS", "CHECKLIST"] as const;
export type GuideType = (typeof GUIDE_TYPES)[number];

/**
 * What guides were called before the split, still readable from the database
 * until the backfill has run. Accepted on read, never written, and treated as
 * HOW_TO_CHOOSE, which is the bucket the old editorial guides mostly were.
 */
export const LEGACY_GUIDE_TYPE = "EDITORIAL";

export const GUIDE_TYPE_LABELS: Record<GuideType, string> = {
  HOW_TO_CHOOSE: "How to choose a pro",
  COST: "What things cost",
  QUESTIONS: "Questions to ask",
  CHECKLIST: "Project checklists",
};

/** Reads a stored value as one of the four, so a legacy row still lands somewhere. */
export function guideTypeOf(stored: string | null | undefined): GuideType {
  return (GUIDE_TYPES as readonly string[]).includes(stored ?? "")
    ? (stored as GuideType)
    : "HOW_TO_CHOOSE";
}

export const PLAN_KEYS = ["claim", "listing", "top10", "advertising"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const STATUS_TONES: Record<string, "positive" | "warning" | "neutral" | "danger"> = {
  PUBLISHED: "positive",
  ACTIVE: "positive",
  PAID: "positive",
  VERIFIED: "positive",
  APPROVED: "positive",
  RESOLVED: "positive",
  DONE: "positive",
  REVIEW: "warning",
  SUSPENDED: "danger",
  PENDING: "warning",
  VERIFYING: "warning",
  SUBMITTED: "warning",
  IN_REVIEW: "warning",
  PAST_DUE: "warning",
  OPEN: "warning",
  NEW: "warning",
  QUEUED: "warning",
  RUNNING: "warning",
  // The guide writer and the topic radar
  RESEARCHING: "warning",
  WRITING: "warning",
  PRICING: "warning",
  PROBING: "warning",
  DRAFTING: "warning",
  READY: "positive",
  COMMISSIONED: "positive",
  SUGGESTED: "warning",
  SNOOZED: "neutral",
  DISMISSED: "neutral",
  CANCELLED: "danger",
  SELF_REPORTED: "neutral",
  REPORTED: "neutral",
  DRAFT: "neutral",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
  EXPIRED: "danger",
  REJECTED: "danger",
  CANCELED: "danger",
  FAILED: "danger",
  VOID: "danger",
};
