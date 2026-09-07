// The dials on the weekly topic plan.
//
// Descriptors rather than a hand-written form, for the same reason the SEO
// settings are: adding a dial here makes it editable, readable and documented
// in one place. This file imports nothing so the admin form, which runs in the
// browser, can read the labels without dragging the database in with them.

export type TopicFieldType = "boolean" | "number" | "text" | "select" | "types" | "services";

export type TopicField = {
  key: string;
  label: string;
  type: TopicFieldType;
  group: TopicGroupId;
  default: unknown;
  hint?: string;
  half?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type TopicGroupId = "cadence" | "scope" | "filters" | "budget";

export const TOPIC_GROUPS: { id: TopicGroupId; title: string; description: string }[] = [
  {
    id: "cadence",
    title: "How often, and how many",
    description:
      "The plan runs once a week and stops at suggestions. Turn on auto-commissioning only when you are happy with what the last few weeks proposed.",
  },
  {
    id: "scope",
    title: "What it looks at",
    description:
      "Every published service crossed with every published country, state and city. Narrowing this makes each week sharper rather than cheaper: the pricing is bulk, so the matrix costs about the same whatever its size.",
  },
  {
    id: "filters",
    title: "What survives",
    description:
      "The gates a candidate has to pass before anyone pays to look at its search results, and the spread rules that stop one trade taking the whole week.",
  },
  {
    id: "budget",
    title: "What it may spend",
    description:
      "A hard ceiling on billable DataForSEO calls per run, and how long a price stays good before it is bought again.",
  },
];

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export const TOPIC_FIELDS: TopicField[] = [
  /* cadence */
  {
    key: "topics.enabled",
    label: "Plan a week automatically",
    type: "boolean",
    group: "cadence",
    default: false,
    hint: "Off, nothing runs unless you press the button. On, one plan is started each week and waits for you.",
  },
  { key: "topics.dayOfWeek", label: "Run on", type: "select", group: "cadence", default: "1", half: true, options: DAYS },
  {
    key: "topics.perWeek",
    label: "Suggestions a week",
    type: "number",
    group: "cadence",
    default: 10,
    half: true,
    min: 1,
    max: 50,
  },
  {
    key: "topics.autoCommission",
    label: "Commission the top few automatically",
    type: "number",
    group: "cadence",
    default: 0,
    min: 0,
    max: 10,
    hint: "How many of the week's highest-scoring ideas go straight into the guide writer as jobs. They still come back as drafts needing an author, a review and your say-so. Zero means nothing is written without you asking.",
  },

  /* scope */
  {
    key: "topics.market",
    label: "Market",
    type: "text",
    group: "scope",
    default: "United States",
    half: true,
    hint: "How DataForSEO names the country the volumes are measured in. Canadian places are priced against Canada automatically.",
  },
  {
    key: "topics.siteDomain",
    label: "Domain to check rankings for",
    type: "text",
    group: "scope",
    default: "",
    half: true,
    hint: "Leave empty to use the site URL. Knowing where you already sit turns a guess into an argument: a phrase you rank eleventh for is worth far more than one you have never appeared for.",
  },
  {
    key: "topics.guideTypes",
    label: "Kinds of guide to plan for",
    type: "types",
    group: "scope",
    default: ["HOW_TO_CHOOSE", "COST", "QUESTIONS", "CHECKLIST"],
  },
  {
    key: "topics.services",
    label: "Trades to include",
    type: "services",
    group: "scope",
    default: [],
    hint: "None ticked means every published trade.",
  },

  /* filters */
  {
    key: "topics.minVolume",
    label: "Minimum monthly searches",
    type: "number",
    group: "filters",
    default: 30,
    half: true,
    min: 0,
    max: 100_000,
  },
  {
    key: "topics.maxDifficulty",
    label: "Maximum difficulty",
    type: "number",
    group: "filters",
    default: 55,
    half: true,
    min: 1,
    max: 100,
    hint: "0 is easy, 100 is national news publishers. A new site should stay well under 40 for a while.",
  },
  {
    key: "topics.minBusinesses",
    label: "Companies a city needs before it gets a local guide",
    type: "number",
    group: "filters",
    default: 0,
    min: 0,
    max: 50,
    hint: "A guide about hiring a plumber in a city with no plumbers listed has nowhere to send the reader, which is the one thing a guide on this site is for. Leave it at zero while the directory is still filling up; raise it once most cities have listings.",
  },
  {
    key: "topics.localShare",
    label: "Share of the week that should be local (%)",
    type: "number",
    group: "filters",
    default: 60,
    half: true,
    min: 0,
    max: 100,
  },
  {
    key: "topics.maxPerService",
    label: "Most suggestions for one trade",
    type: "number",
    group: "filters",
    default: 2,
    half: true,
    min: 1,
    max: 20,
  },
  {
    key: "topics.maxPerPlace",
    label: "Most suggestions for one place",
    type: "number",
    group: "filters",
    default: 2,
    half: true,
    min: 1,
    max: 20,
  },

  /* budget */
  {
    key: "topics.callBudget",
    label: "Billable calls a run may spend",
    type: "number",
    group: "budget",
    default: 120,
    half: true,
    min: 10,
    max: 2000,
    hint: "The run stops where it is and reports rather than going over.",
  },
  {
    key: "topics.maxNewPrices",
    label: "New phrases to price each run",
    type: "number",
    group: "budget",
    default: 4000,
    half: true,
    min: 200,
    max: 40_000,
    hint: "The matrix is around thirty thousand phrases, which is too many to buy at once and pointless to buy twice. Each run prices this many of the ones nobody has priced yet, working outward from national to state to city, so the whole matrix is covered over a couple of months and every run after that is nearly free.",
  },
  {
    key: "topics.probeMultiplier",
    label: "Search results to pull, per suggestion",
    type: "number",
    group: "budget",
    default: 3,
    half: true,
    min: 1,
    max: 10,
    hint: "Ten suggestions at three means thirty live searches, which is where most of a run's money goes and all of its evidence comes from.",
  },
  {
    key: "topics.refreshDays",
    label: "Days a price stays good",
    type: "number",
    group: "budget",
    default: 60,
    half: true,
    min: 7,
    max: 365,
    hint: "Search volume moves slowly. The first run prices the whole matrix and every run after it pays only for what is new or stale.",
  },
  {
    key: "topics.checkOurRankings",
    label: "Check where this site already ranks",
    type: "boolean",
    group: "budget",
    default: true,
    hint: "One call a run. It is the single most useful thing the plan knows.",
  },
  {
    key: "topics.includeAiVolume",
    label: "Buy AI search volume",
    type: "boolean",
    group: "budget",
    default: false,
    hint: "How often a phrase is put to an assistant rather than a search box. A separate DataForSEO subscription; if yours does not include it the run carries on without it and says so.",
  },
];

export const TOPIC_FIELD_BY_KEY = new Map(TOPIC_FIELDS.map((field) => [field.key, field]));
