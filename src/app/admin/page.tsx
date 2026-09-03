import Link from "next/link";
import { AdminHeader, BarChart, EmptyState, Panel, QueueList, StackedChart, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate, money, percentChange, shortMonthYear } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { dailyActionSeries, monthlyRecurringRevenue, previousTotals, topBusinesses, totalsFor } from "@/lib/analytics";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await requireStaff();

  const [totals, previous, series, top, mrr, counts, dueRankings, openClaims, openSubmissions, recentAudit, activeSubscriptions] =
    await Promise.all([
      totalsFor(30),
      previousTotals(30),
      dailyActionSeries(14),
      topBusinesses(30, 6),
      monthlyRecurringRevenue(),
      Promise.all([
        db.business.count({ where: { status: "PUBLISHED" } }),
        db.business.count({ where: { status: "PENDING" } }),
        db.ranking.count({ where: { status: "PUBLISHED" } }),
        db.guide.count({ where: { status: "PUBLISHED" } }),
        db.page.count({ where: { status: "PUBLISHED" } }),
        db.subscription.count({ where: { status: "ACTIVE" } }),
      ]),
      db.ranking.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { lastReviewedAt: "asc" },
        take: 5,
        include: { category: true, city: true },
      }),
      db.claimRequest.findMany({
        where: { status: { in: ["SUBMITTED", "VERIFYING"] } },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
      db.submission.findMany({
        where: { status: { in: ["NEW", "IN_REVIEW"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true } } },
      }),
      db.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: { select: { id: true, name: true, priceCents: true, currency: true, unitLabel: true } } },
      }),
    ]);

  const [publishedBusinesses, pendingBusinesses, rankings, guides, pages, activeSubs] = counts;
  const contactActions = totals.websiteClicks + totals.phoneClicks + totals.quoteClicks;
  const previousActions = previous.websiteClicks + previous.phoneClicks + previous.quoteClicks;

  // Revenue grouped by the package it came from, so a plan that is not paying
  // for itself is visible rather than buried in the total.
  const byPlan = new Map<string, { name: string; unit: string; count: number; cents: number }>();
  for (const subscription of activeSubscriptions) {
    const plan = subscription.plan;
    const current = byPlan.get(plan.id) ?? { name: plan.name, unit: plan.unitLabel, count: 0, cents: 0 };
    current.count += 1;
    current.cents += plan.priceCents;
    byPlan.set(plan.id, current);
  }
  const packages = [...byPlan.values()].sort((a, b) => b.cents - a.cents);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Everything that needs attention, and how the directory performed over the last thirty days."
      />

      <StatRow
        stats={[
          { label: "Monthly recurring revenue", value: money(mrr), hint: `${activeSubs} active subscriptions` },
          { label: "Active subscriptions", value: activeSubs, hint: `across ${packages.length} packages` },
          {
            label: "Listing actions, 30 days",
            value: contactActions,
            delta: percentChange(contactActions, previousActions),
          },
          {
            label: "Needs attention",
            value: openClaims.length + openSubmissions.length + pendingBusinesses,
            hint: `${openClaims.length} claims, ${openSubmissions.length} reports, ${pendingBusinesses} pending listings`,
          },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Listing actions, last 14 days"
          description="Every event across published profiles."
        >
          <StackedChart series={series} topLabel="Profile views" bottomLabel="Contact actions" />
        </Panel>

        <Panel title="Needs your attention">
          <QueueList
            items={[
              {
                title: "Claims awaiting review",
                sub: "Ownership verification",
                count: openClaims.length,
                href: "/admin/claims",
                icon: "key",
                tone: "amber",
              },
              {
                title: "Rankings due a re-check",
                sub: "Oldest review date first",
                count: dueRankings.length,
                href: "/admin/rankings",
                icon: "trophy",
                tone: "blue",
              },
              {
                title: "Listings pending publication",
                sub: "Submitted and not yet decided",
                count: pendingBusinesses,
                href: "/admin/businesses?status=PENDING",
                icon: "store",
                tone: "green",
              },
              {
                title: "Reports and corrections",
                sub: "Flagged by readers or owners",
                count: openSubmissions.length,
                href: "/admin/submissions",
                icon: "flag",
                tone: "red",
              },
            ]}
          />
        </Panel>
      </div>

      <div className="panel-grid panel-grid--wide">
        <Panel title="Revenue by package" description="Active subscriptions only.">
          {packages.length === 0 ? (
            <EmptyState title="No active subscriptions" body="Revenue appears once a plan is bought." />
          ) : (
            <BarChart
              format={(value) => money(value)}
              data={packages.map((entry) => ({
                label: entry.name,
                value: entry.cents,
                meta: `${entry.count} ${entry.unit}`,
              }))}
            />
          )}
        </Panel>

        <Panel title="Directory at a glance">
          <ul style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Published businesses", value: publishedBusinesses, href: "/admin/businesses" },
              { label: "Pending listings", value: pendingBusinesses, href: "/admin/businesses?status=PENDING" },
              { label: "Live rankings", value: rankings, href: "/admin/rankings" },
              { label: "Published guides", value: guides, href: "/admin/guides" },
              { label: "Published pages", value: pages, href: "/admin/pages" },
            ].map((row) => (
              <li
                key={row.label}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14.5 }}
              >
                <Link href={row.href}>{row.label}</Link>
                <strong style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{row.value}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel
          title="Claims awaiting review"
          description="Ownership verification, oldest first."
          actions={
            <Link href="/admin/claims" className="btn btn--secondary btn--sm">
              All claims
            </Link>
          }
          padded={false}
        >
          {openClaims.length === 0 ? (
            <EmptyState title="Nothing waiting" body="Every claim has been decided." />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col">Method</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <Link href={`/admin/claims#${claim.id}`} className="admin-table__primary">
                          {claim.businessName}
                        </Link>
                        <span className="admin-table__meta">
                          {claim.ownerName} · {fullDate(claim.submittedAt)}
                        </span>
                      </td>
                      <td>{claim.verificationMethod.replace("_", " ").toLowerCase()}</td>
                      <td>
                        <StatusPill status={claim.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Reports and corrections"
          description="Anything readers or owners have flagged."
          actions={
            <Link href="/admin/submissions" className="btn btn--secondary btn--sm">
              All reports
            </Link>
          }
          padded={false}
        >
          {openSubmissions.length === 0 ? (
            <EmptyState title="Inbox clear" body="No open reports or corrections." />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openSubmissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>
                        <span className="admin-table__primary">{submission.subject}</span>
                        <span className="admin-table__meta">
                          {submission.email} · {fullDate(submission.createdAt)}
                        </span>
                      </td>
                      <td>{submission.kind.toLowerCase().replace("_", " ")}</td>
                      <td>
                        <StatusPill status={submission.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Most viewed listings" description="Profile views over the last thirty days.">
          {top.length === 0 ? (
            <EmptyState title="No data yet" body="Analytics appear once listings start getting traffic." />
          ) : (
            <BarChart
              valueLabel="views"
              data={top.map((row) => ({
                label: row.business?.name ?? "Unknown",
                value: row.profileViews,
                meta: `${row.contactActions} contacts`,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Rankings due a re-check"
          description="Oldest review date first."
          actions={
            <Link href="/admin/rankings" className="btn btn--secondary btn--sm">
              All rankings
            </Link>
          }
          padded={false}
        >
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Ranking</th>
                  <th scope="col">Last reviewed</th>
                </tr>
              </thead>
              <tbody>
                {dueRankings.map((ranking) => (
                  <tr key={ranking.id}>
                    <td>
                      <Link href={`/admin/rankings/${ranking.id}`} className="admin-table__primary">
                        {ranking.title}
                      </Link>
                      <span className="admin-table__meta">
                        {ranking.category.name} · {ranking.city?.name}
                      </span>
                    </td>
                    <td>{shortMonthYear(ranking.lastReviewedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        description="Every change is recorded, including changes made through the API."
        actions={
          <Link href="/admin/audit" className="btn btn--secondary btn--sm">
            Full audit log
          </Link>
        }
        padded={false}
      >
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Object</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.map((entry) => (
                <tr key={entry.id}>
                  <td className="admin-table__primary">{entry.user?.name ?? "System"}</td>
                  <td>{entry.action}</td>
                  <td>
                    {entry.entityType}
                    {entry.summary ? <span className="admin-table__meta">{entry.summary}</span> : null}
                  </td>
                  <td>{fullDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
