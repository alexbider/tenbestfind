import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { SyncPlansButton } from "@/components/admin/BillingControls";
import { Badge } from "@/components/ui/primitives";
import { fullDate, money } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { isTestMode, stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Packages" };

export default async function AdminPackagesPage() {
  await requireStaff();
  const stripeReady = stripeConfigured();

  const plans = await db.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  const activeByPlan = await db.subscription.groupBy({
    by: ["planId"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });
  const activeLookup = new Map(activeByPlan.map((row) => [row.planId, row._count._all]));

  const mrr = plans.reduce(
    (total, plan) => total + plan.priceCents * (activeLookup.get(plan.id) ?? 0),
    0,
  );

  return (
    <>
      <AdminHeader
        title="Packages"
        description="What a business can buy. Plans flagged as placements affect labelled slots only; nothing here touches editorial position."
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {stripeReady ? (
              <Badge tone={isTestMode() ? "warning" : "positive"}>
                Stripe {isTestMode() ? "test mode" : "live"}
              </Badge>
            ) : (
              <Badge tone="neutral">Stripe not configured</Badge>
            )}
            <SyncPlansButton disabled={!stripeReady} />
            <Link href="/admin/packages/new" className="btn btn--primary btn--sm">
              New plan
            </Link>
          </div>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Plans", value: plans.length },
          { label: "Active subscriptions", value: [...activeLookup.values()].reduce((a, b) => a + b, 0) },
          { label: "MRR", value: money(mrr) },
          {
            label: "Placement plans",
            value: plans.filter((plan) => plan.editorial).length,
            hint: "Sold as labelled slots",
          },
        ]}
      />

      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {plans.map((plan) => {
          const active = activeLookup.get(plan.id) ?? 0;
          return (
            <li
              key={plan.id}
              style={{
                background: "var(--surface-card)",
                border: `1px solid ${plan.editorial ? "var(--border-subtle)" : "#EBCE95"}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                  <Link href={`/admin/packages/${plan.id}`}>{plan.name}</Link>
                </h2>
                <Badge tone={plan.editorial ? "neutral" : "warning"}>
                  {plan.editorial ? "Listing" : "Placement"}
                </Badge>
              </div>
              <p style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                  {plan.interval === "quote" ? "Quoted" : money(plan.priceCents, plan.currency)}
                </span>
                {plan.interval === "quote" ? null : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>/month</span>
                )}
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>{plan.unitLabel}</p>
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: 0 }}>
                {[
                  { label: "Active", value: String(active) },
                  { label: "MRR", value: money(active * plan.priceCents, plan.currency) },
                  { label: "Lifetime", value: String(plan._count.subscriptions) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{stat.label}</dt>
                    <dd style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      <Panel padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Price</th>
                <th scope="col">Unit</th>
                <th scope="col">Active</th>
                <th scope="col">Lifetime subs</th>
                <th scope="col">Stripe</th>
                <th scope="col">Type</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link href={`/admin/packages/${plan.id}`} className="admin-table__primary">
                      {plan.name}
                    </Link>
                    <span className="admin-table__meta">{plan.description}</span>
                    <span className="admin-table__meta">
                      {parseList(plan.features).length} features listed
                    </span>
                  </td>
                  <td className="admin-table__num">
                    {plan.interval === "quote" ? "Quoted" : money(plan.priceCents, plan.currency)}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{plan.unitLabel}</td>
                  <td className="admin-table__num">{activeLookup.get(plan.id) ?? 0}</td>
                  <td className="admin-table__num">{plan._count.subscriptions}</td>
                  <td>
                    {plan.interval === "quote" ? (
                      <span style={{ color: "var(--text-muted)" }}>Not applicable</span>
                    ) : plan.stripePriceId ? (
                      <>
                        <Badge tone="positive">Synced</Badge>
                        <span className="admin-table__meta">
                          {plan.stripePriceId}
                          {plan.stripeSyncedAt ? ` · ${fullDate(plan.stripeSyncedAt)}` : ""}
                        </span>
                      </>
                    ) : (
                      <Badge tone="warning">Not synced</Badge>
                    )}
                  </td>
                  <td>
                    {plan.editorial ? (
                      <Badge tone="gold">Labelled placement</Badge>
                    ) : (
                      <Badge tone="neutral">Profile management</Badge>
                    )}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link href={`/admin/packages/${plan.id}`} className="btn btn--secondary btn--sm">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="What these plans can and cannot do">
        <div className="panel-grid">
          <div>
            <h3 className="related-heading">Included</h3>
            <ul style={{ display: "grid", gap: 8, fontSize: 14.5, color: "var(--text-secondary)" }}>
              <li>Profile management and listing maintenance</li>
              <li>Listing performance analytics</li>
              <li>Labelled sponsored placements, where the plan says so</li>
            </ul>
          </div>
          <div>
            <h3 className="related-heading">Never included</h3>
            <ul style={{ display: "grid", gap: 8, fontSize: 14.5, color: "var(--text-secondary)" }}>
              <li>A position in the ranked ten</li>
              <li>Advance sight of a ranking before it publishes</li>
              <li>Influence over criteria, or removal of a competitor</li>
            </ul>
          </div>
        </div>
      </Panel>
    </>
  );
}
