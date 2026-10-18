import { db } from "./db";

/**
 * Read side of provider accounting: aggregates ProviderRequest rows for the
 * admin "Provider usage" screen. Separate from provider-usage.ts (the write
 * path) so the hot per-call recorder stays small.
 */

const FAIL_OUTCOMES = ["RATE_LIMITED", "QUOTA_EXHAUSTED", "BILLING", "AUTH", "INVALID", "SERVER", "TIMEOUT", "NETWORK"];

export type ProviderStat = {
  provider: string;
  total: number;
  ok: number;
  avoided: number;
  failed: number;
  byOutcome: Record<string, number>;
  tokens: number; // summed billableUnits where the metric is tokens-ish
};

export type UsageReport = {
  sinceHours: number;
  providers: ProviderStat[];
  totals: { total: number; ok: number; avoided: number; failed: number };
};

/** Per-provider counts by outcome over the last `sinceHours` hours. */
export async function providerUsage(sinceHours = 24): Promise<UsageReport> {
  const since = new Date(Date.now() - sinceHours * 3600_000);
  const grouped = await db.providerRequest.groupBy({
    by: ["provider", "outcome"],
    where: { at: { gte: since } },
    _count: { _all: true },
    _sum: { billableUnits: true },
  });

  const map = new Map<string, ProviderStat>();
  for (const g of grouped) {
    const stat =
      map.get(g.provider) ??
      { provider: g.provider, total: 0, ok: 0, avoided: 0, failed: 0, byOutcome: {}, tokens: 0 };
    const n = g._count._all;
    stat.total += n;
    stat.byOutcome[g.outcome] = (stat.byOutcome[g.outcome] ?? 0) + n;
    if (g.outcome === "OK") stat.ok += n;
    else if (g.outcome === "AVOIDED") stat.avoided += n;
    else if (FAIL_OUTCOMES.includes(g.outcome)) stat.failed += n;
    stat.tokens += Math.round(g._sum.billableUnits ?? 0);
    map.set(g.provider, stat);
  }

  const providers = [...map.values()].sort((a, b) => b.total - a.total);
  const totals = providers.reduce(
    (acc, p) => ({ total: acc.total + p.total, ok: acc.ok + p.ok, avoided: acc.avoided + p.avoided, failed: acc.failed + p.failed }),
    { total: 0, ok: 0, avoided: 0, failed: 0 },
  );
  return { sinceHours, providers, totals };
}

export type UsageErrorRow = {
  at: Date;
  provider: string;
  operation: string;
  outcome: string;
  httpStatus: number | null;
  providerCode: string | null;
  retryAfterMs: number | null;
  quotaResetAt: Date | null;
  connectionRef: string | null;
  note: string | null;
};

/** The most recent non-OK, non-AVOIDED calls — the "why am I being limited" list. */
export async function recentProviderErrors(limit = 40): Promise<UsageErrorRow[]> {
  return db.providerRequest.findMany({
    where: { outcome: { notIn: ["OK", "AVOIDED"] } },
    orderBy: { at: "desc" },
    take: limit,
    select: {
      at: true, provider: true, operation: true, outcome: true, httpStatus: true,
      providerCode: true, retryAfterMs: true, quotaResetAt: true, connectionRef: true, note: true,
    },
  });
}

/** Known future quota resets (only where a provider actually told us one). */
export async function knownQuotaResets(): Promise<{ provider: string; quotaResetAt: Date; quotaMetric: string | null }[]> {
  const rows = await db.providerRequest.findMany({
    where: { quotaResetAt: { gt: new Date() } },
    orderBy: { quotaResetAt: "asc" },
    distinct: ["provider"],
    take: 10,
    select: { provider: true, quotaResetAt: true, quotaMetric: true },
  });
  return rows.filter((r): r is { provider: string; quotaResetAt: Date; quotaMetric: string | null } => r.quotaResetAt != null);
}

/** Distinct credentials seen per provider — surfaces "two accounts share a limit". */
export async function connectionsSeen(sinceHours = 168): Promise<{ provider: string; connections: number }[]> {
  const since = new Date(Date.now() - sinceHours * 3600_000);
  const rows = await db.providerRequest.findMany({
    where: { at: { gte: since }, connectionRef: { not: null } },
    distinct: ["provider", "connectionRef"],
    select: { provider: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.provider, (counts.get(r.provider) ?? 0) + 1);
  return [...counts.entries()].map(([provider, connections]) => ({ provider, connections }));
}
