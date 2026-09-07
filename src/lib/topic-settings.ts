// Reading and writing the topic plan's dials.
//
// Same storage as the SEO settings: one row per key in the Setting table, so a
// value survives a redeploy and an editor changes it without a deploy. The
// descriptors live next door in topic-fields.ts, which imports nothing, so the
// admin form can read the labels without pulling the database into the browser.

import { db } from "./db";
import { GUIDE_TYPES, type GuideType } from "./enums";
import { parseJson } from "./json";
import { TOPIC_FIELDS, type TopicField } from "./topic-fields";

export type TopicSettings = {
  enabled: boolean;
  dayOfWeek: number;
  perWeek: number;
  autoCommission: number;
  market: string;
  siteDomain: string;
  guideTypes: GuideType[];
  services: string[];
  minVolume: number;
  maxDifficulty: number;
  minBusinesses: number;
  localShare: number;
  maxPerService: number;
  maxPerPlace: number;
  callBudget: number;
  maxNewPrices: number;
  probeMultiplier: number;
  refreshDays: number;
  checkOurRankings: boolean;
  includeAiVolume: boolean;
};

function coerce(field: TopicField, stored: unknown): unknown {
  if (stored === undefined || stored === null) return field.default;
  switch (field.type) {
    case "boolean":
      return typeof stored === "boolean" ? stored : stored === "true" || stored === "on";
    case "number": {
      const parsed = Number(stored);
      if (!Number.isFinite(parsed)) return field.default;
      const floor = field.min ?? Number.NEGATIVE_INFINITY;
      const ceiling = field.max ?? Number.POSITIVE_INFINITY;
      return Math.min(ceiling, Math.max(floor, Math.round(parsed)));
    }
    case "types":
    case "services":
      return Array.isArray(stored) ? stored.map(String) : field.default;
    default:
      return String(stored);
  }
}

/** Every dial, layered over the defaults, in one query. */
export async function loadTopicSettings(): Promise<TopicSettings> {
  let stored: Record<string, unknown> = {};
  try {
    const rows = await db.setting.findMany({ where: { key: { startsWith: "topics." } } });
    stored = Object.fromEntries(rows.map((row) => [row.key, parseJson<unknown>(row.value, undefined)]));
  } catch {
    stored = {};
  }

  const raw: Record<string, unknown> = {};
  for (const field of TOPIC_FIELDS) raw[field.key] = coerce(field, stored[field.key]);

  const bool = (key: string) => raw[key] === true;
  const num = (key: string) => (typeof raw[key] === "number" ? (raw[key] as number) : 0);
  const text = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const list = (key: string) => (Array.isArray(raw[key]) ? (raw[key] as string[]) : []);

  const types = list("topics.guideTypes").filter((type): type is GuideType =>
    (GUIDE_TYPES as readonly string[]).includes(type),
  );

  return {
    enabled: bool("topics.enabled"),
    dayOfWeek: Number(text("topics.dayOfWeek")) || 1,
    perWeek: num("topics.perWeek"),
    autoCommission: num("topics.autoCommission"),
    market: text("topics.market") || "United States",
    siteDomain: text("topics.siteDomain"),
    // An empty list would silently plan nothing, which is never what anyone
    // meant by unticking the last box.
    guideTypes: types.length > 0 ? types : [...GUIDE_TYPES],
    services: list("topics.services"),
    minVolume: num("topics.minVolume"),
    maxDifficulty: num("topics.maxDifficulty"),
    minBusinesses: num("topics.minBusinesses"),
    localShare: num("topics.localShare"),
    maxPerService: num("topics.maxPerService"),
    maxPerPlace: num("topics.maxPerPlace"),
    callBudget: num("topics.callBudget"),
    maxNewPrices: num("topics.maxNewPrices"),
    probeMultiplier: num("topics.probeMultiplier"),
    refreshDays: num("topics.refreshDays"),
    checkOurRankings: bool("topics.checkOurRankings"),
    includeAiVolume: bool("topics.includeAiVolume"),
  };
}

/** Writes only the keys the descriptors know about. */
export async function saveTopicSettings(values: Record<string, unknown>): Promise<void> {
  for (const field of TOPIC_FIELDS) {
    if (!(field.key in values)) continue;
    const value = coerce(field, values[field.key]);
    await db.setting.upsert({
      where: { key: field.key },
      update: { value: JSON.stringify(value), groupName: "topics", label: field.label },
      create: { key: field.key, value: JSON.stringify(value), groupName: "topics", label: field.label },
    });
  }
}

/** The Monday of the week a date falls in, at midnight UTC. */
export function weekStart(date = new Date()): Date {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const shift = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - shift);
  return monday;
}
