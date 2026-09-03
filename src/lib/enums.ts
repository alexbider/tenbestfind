// The schema stores these as strings so it stays portable to PostgreSQL, where
// they can become native enums. These unions are the single source of truth for
// the allowed values.

export const CONTENT_STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

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
  "city",
  "region",
  "country",
  "person",
] as const;
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number];

export const GUIDE_TYPES = ["EDITORIAL", "COST"] as const;
export type GuideType = (typeof GUIDE_TYPES)[number];

export const PLAN_KEYS = ["claim", "listing", "top10", "advertising"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const STATUS_TONES: Record<string, "positive" | "warning" | "neutral" | "danger"> = {
  PUBLISHED: "positive",
  ACTIVE: "positive",
  PAID: "positive",
  VERIFIED: "positive",
  APPROVED: "positive",
  RESOLVED: "positive",
  REVIEW: "warning",
  SUSPENDED: "danger",
  PENDING: "warning",
  VERIFYING: "warning",
  SUBMITTED: "warning",
  IN_REVIEW: "warning",
  PAST_DUE: "warning",
  OPEN: "warning",
  NEW: "warning",
  SELF_REPORTED: "neutral",
  REPORTED: "neutral",
  DRAFT: "neutral",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
  EXPIRED: "danger",
  REJECTED: "danger",
  CANCELED: "danger",
  VOID: "danger",
};
