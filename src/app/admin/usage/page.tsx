import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth";
import { fullDate } from "@/lib/format";
import {
  providerUsage,
  recentProviderErrors,
  knownQuotaResets,
  connectionsSeen,
} from "@/lib/provider-usage-report";
import { activeCooldowns } from "@/lib/provider-cooldown";

export const metadata = { title: "Provider usage" };
export const dynamic = "force-dynamic";

const OUTCOME_TONE: Record<string, "neutral" | "positive" | "warning" | "danger"> = {
  OK: "positive",
  AVOIDED: "neutral",
  RATE_LIMITED: "warning",
  QUOTA_EXHAUSTED: "danger",
  BILLING: "danger",
  AUTH: "danger",
  INVALID: "danger",
  SERVER: "warning",
  TIMEOUT: "warning",
  NETWORK: "warning",
};

export default async function AdminUsagePage() {
  await requireAdmin();

  const [day, errors, resets, connections, cooldowns] = await Promise.all([
    providerUsage(24),
    recentProviderErrors(40),
    knownQuotaResets(),
    connectionsSeen(168),
    activeCooldowns(),
  ]);

  const sharedAccount = connections.find((c) => c.connections > 1);

  return (
    <>
      <AdminHeader
        title="Provider usage"
        description="Every outbound call to Apify, Anthropic, DataForSEO, Resend and the Indexing API, with why each one failed. This is where a request limit is diagnosed: a per-minute throttle, a daily quota, or an empty balance are different problems."
      />

      <StatRow
        stats={[
          { label: "Requests (24h)", value: day.totals.total },
          { label: "Succeeded", value: day.totals.ok },
          { label: "Failed / limited", value: day.totals.failed, hint: "rate-limited, quota, billing, auth, invalid, server" },
          { label: "Avoided (reuse)", value: day.totals.avoided, hint: "calls skipped via cache or dedup" },
        ]}
      />

      {cooldowns.length > 0 ? (
        <Panel title="Provider paused (circuit breaker open)" description="These providers are not being called until the time shown; other providers keep working.">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Provider</th><th>Reason</th><th>Until</th></tr>
              </thead>
              <tbody>
                {cooldowns.map((c) => (
                  <tr key={c.provider}>
                    <td className="admin-table__primary">{c.provider}</td>
                    <td><Badge tone={OUTCOME_TONE[c.reason] ?? "warning"}>{c.reason}</Badge></td>
                    <td className="admin-table__meta">{fullDate(c.until)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {day.totals.total === 0 ? (
        <Panel>
          <EmptyState
            title="No provider calls recorded yet"
            body="Accounting is live, but nothing has called a provider in the last 24 hours. Run a small import or research pass and this fills in."
          />
        </Panel>
      ) : (
        <Panel title="By provider (last 24 hours)" description="Counts by outcome. Tokens are Anthropic's billable unit.">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th className="admin-table__num">Total</th>
                  <th className="admin-table__num">OK</th>
                  <th className="admin-table__num">Failed</th>
                  <th className="admin-table__num">Avoided</th>
                  <th className="admin-table__num">Tokens</th>
                  <th>Outcomes</th>
                </tr>
              </thead>
              <tbody>
                {day.providers.map((p) => (
                  <tr key={p.provider}>
                    <td className="admin-table__primary">{p.provider}</td>
                    <td className="admin-table__num">{p.total}</td>
                    <td className="admin-table__num">{p.ok}</td>
                    <td className="admin-table__num">{p.failed}</td>
                    <td className="admin-table__num">{p.avoided}</td>
                    <td className="admin-table__num">{p.tokens ? p.tokens.toLocaleString() : "—"}</td>
                    <td>
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(p.byOutcome)
                          .filter(([o]) => o !== "OK")
                          .map(([o, n]) => (
                            <Badge key={o} tone={OUTCOME_TONE[o] ?? "neutral"}>
                              {o} {n}
                            </Badge>
                          ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {sharedAccount ? (
        <Panel title="Heads up: one provider is being called under more than one credential">
          <p className="admin-table__meta">
            {sharedAccount.provider} has been called under {sharedAccount.connections} distinct credentials in the last 7
            days. If those map to the same billing project, they share one quota — adding a second key will not raise the
            ceiling.
          </p>
        </Panel>
      ) : null}

      {resets.length > 0 ? (
        <Panel title="Known quota resets" description="Only shown where a provider actually told us a reset time.">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Provider</th><th>Metric</th><th>Resets</th></tr>
              </thead>
              <tbody>
                {resets.map((r) => (
                  <tr key={r.provider}>
                    <td className="admin-table__primary">{r.provider}</td>
                    <td>{r.quotaMetric ?? "—"}</td>
                    <td className="admin-table__meta">{fullDate(r.quotaResetAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel title="Recent failures" description="The most recent calls that did not succeed, newest first.">
        {errors.length === 0 ? (
          <EmptyState title="No failures recorded" body="Nothing has failed since accounting went live." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Provider</th>
                  <th>Operation</th>
                  <th>Outcome</th>
                  <th className="admin-table__num">Code</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td className="admin-table__meta">{fullDate(e.at)}</td>
                    <td className="admin-table__primary">{e.provider}</td>
                    <td>{e.operation}</td>
                    <td><Badge tone={OUTCOME_TONE[e.outcome] ?? "neutral"}>{e.outcome}</Badge></td>
                    <td className="admin-table__num">{e.providerCode ?? e.httpStatus ?? "—"}</td>
                    <td className="admin-table__meta">
                      {e.note ?? ""}
                      {e.retryAfterMs ? ` · retry after ${Math.round(e.retryAfterMs / 1000)}s` : ""}
                      {e.quotaResetAt ? ` · resets ${fullDate(e.quotaResetAt)}` : ""}
                      {e.connectionRef ? ` · key ${e.connectionRef}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
