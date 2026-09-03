import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { monthlyRecurringRevenue } from "@/lib/analytics";
import { db } from "@/lib/db";

export const metadata = { title: "Businesses" };

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminBusinessesList({ searchParams }: Props) {
  await requireStaff();
  const params = await searchParams;
  const status = params.status;
  const query = params.q?.trim();

  const [businesses, counts, mrr] = await Promise.all([
    db.business.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(query ? { name: { contains: query } } : {}),
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: 100,
      include: {
        category: { select: { name: true } },
        city: { include: { region: true } },
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
        entries: { select: { position: true }, orderBy: { position: "asc" }, take: 1 },
        placements: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    }),
    Promise.all([
      db.business.count(),
      db.business.count({ where: { claimed: true } }),
      db.business.count({ where: { verified: true } }),
    ]),
    monthlyRecurringRevenue(),
  ]);

  const [total, claimed, verified] = counts;

  const filters = [
    { label: "All", value: undefined },
    { label: "Published", value: "PUBLISHED" },
    { label: "Pending", value: "PENDING" },
    { label: "Draft", value: "DRAFT" },
    { label: "Suspended", value: "SUSPENDED" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  return (
    <>
      <AdminHeader
        title="Businesses"
        description="Every profile in the directory, its plan, its editorial status and where it ranks."
        actions={
          <Link href="/admin/businesses/new" className="btn btn--primary btn--sm">
            New business
          </Link>
        }
      />

      <StatRow
        stats={[
          { label: "Total profiles", value: total },
          { label: "Claimed", value: claimed, hint: `${Math.round((claimed / Math.max(1, total)) * 100)}% of profiles` },
          { label: "Verified details", value: verified },
          { label: "MRR", value: money(mrr) },
        ]}
      />

      <Panel padded={false}>
        <div className="panel__body" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <form className="admin-search" method="get">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <input name="q" type="search" placeholder="Search businesses" defaultValue={query ?? ""} />
            <button type="submit" className="btn btn--ghost btn--sm">
              Search
            </button>
          </form>
          <div className="admin-tabs" style={{ margin: 0, padding: 0, border: 0 }}>
            {filters.map((filter) => (
              <Link
                key={filter.label}
                href={filter.value ? `/admin/businesses?status=${filter.value}` : "/admin/businesses"}
                data-on={status === filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Market</th>
                <th scope="col">Plan</th>
                <th scope="col">Rank</th>
                <th scope="col">Google</th>
                <th scope="col">Status</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => {
                const subscription = business.subscriptions[0];
                return (
                  <tr key={business.id}>
                    <td>
                      <Link href={`/admin/businesses/${business.id}`} className="admin-table__primary">
                        {business.name}
                      </Link>
                      <span className="admin-table__meta">
                        {business.category.name}
                        {business.claimed ? " · claimed" : ""}
                        {business.placements.length > 0 ? " · sponsored" : ""}
                      </span>
                    </td>
                    <td>
                      {business.city
                        ? `${business.city.name}, ${business.city.region.code.toUpperCase()}`
                        : "—"}
                    </td>
                    <td>
                      {subscription ? (
                        <>
                          {subscription.plan.name}
                          <span className="admin-table__meta">
                            <StatusPill status={subscription.status} />
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>No plan</span>
                      )}
                    </td>
                    <td className="admin-table__num">
                      {business.entries[0] ? `#${business.entries[0].position}` : "—"}
                    </td>
                    <td className="admin-table__num">{business.googleRating?.toFixed(1) ?? "—"}</td>
                    <td>
                      <StatusPill status={business.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        {business.status === "PUBLISHED" ? (
                          <Link
                            href={`/companies/${business.slug}/`}
                            target="_blank"
                            className="btn btn--ghost btn--sm"
                          >
                            View
                          </Link>
                        ) : null}
                        <Link href={`/admin/businesses/${business.id}`} className="btn btn--secondary btn--sm">
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {businesses.length === 0 ? (
          <div className="panel__body">
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              Nothing matches that filter.
            </p>
          </div>
        ) : null}
      </Panel>
    </>
  );
}
