import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { setPlacementStatus } from "@/app/actions/admin-directory";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate, money } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Sponsored inventory" };

export default async function AdminSponsoredPage() {
  await requireStaff();

  const [placements, rankings, top10Plan] = await Promise.all([
    db.sponsoredPlacement.findMany({
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      include: {
        business: { select: { id: true, name: true } },
        city: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    db.ranking.count({ where: { status: "PUBLISHED" } }),
    db.plan.findUnique({ where: { key: "top10" } }),
  ]);

  const active = placements.filter((placement) => placement.status === "ACTIVE");
  const sponsoredMrr = active.length * (top10Plan?.priceCents ?? 0);
  const fillRate = rankings > 0 ? Math.round((active.length / rankings) * 100) : 0;
  const impressions = active.reduce((total, placement) => total + placement.impressions, 0);
  const clicks = active.reduce((total, placement) => total + placement.clicks, 0);

  return (
    <>
      <AdminHeader
        title="Sponsored inventory"
        description="One labelled Featured Partner slot per published ranking. The slot sits outside the ranked ten and always carries a Sponsored label."
        actions={
          <Link href="/admin/sponsored/new" className="btn btn--primary btn--sm">
            New placement
          </Link>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Slots defined", value: rankings, hint: "One per published ranking" },
          { label: "Sold", value: active.length },
          { label: "Fill rate", value: `${fillRate}%` },
          { label: "Sponsored MRR", value: money(sponsoredMrr) },
        ]}
      />

      <Panel title="Placements" padded={placements.length === 0}>
        {placements.length === 0 ? (
          <EmptyState
            title="No placements sold"
            body="Every ranking currently runs without a featured partner."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Placement</th>
                  <th scope="col">Market</th>
                  <th scope="col">Started</th>
                  <th scope="col">Impressions</th>
                  <th scope="col">Clicks</th>
                  <th scope="col">CTR</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr key={placement.id}>
                    <td>
                      <Link href={`/admin/businesses/${placement.business.id}`} className="admin-table__primary">
                        {placement.business.name}
                      </Link>
                    </td>
                    <td>
                      <Badge tone="gold">{placement.kind.replace(/_/g, " ").toLowerCase()}</Badge>
                      <span className="admin-table__meta">Labelled &ldquo;{placement.label}&rdquo;</span>
                    </td>
                    <td>
                      {placement.city?.name ?? "All cities"}
                      <span className="admin-table__meta">{placement.category?.name ?? "All trades"}</span>
                    </td>
                    <td>{fullDate(placement.startsAt)}</td>
                    <td className="admin-table__num">{placement.impressions.toLocaleString()}</td>
                    <td className="admin-table__num">{placement.clicks.toLocaleString()}</td>
                    <td className="admin-table__num">
                      {placement.impressions
                        ? `${((placement.clicks / placement.impressions) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td>
                      <StatusPill status={placement.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <form action={setPlacementStatus}>
                          <input type="hidden" name="id" value={placement.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={placement.status === "ACTIVE" ? "PAUSED" : "ACTIVE"}
                          />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            {placement.status === "ACTIVE" ? "Pause" : "Resume"}
                          </button>
                        </form>
                        <Link
                          href={`/admin/sponsored/${placement.id}`}
                          className="btn btn--secondary btn--sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Delivery">
        <div className="panel-grid">
          <div>
            <h3 className="related-heading">Active placements, all time</h3>
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
              {impressions.toLocaleString()} impressions and {clicks.toLocaleString()} clicks, an
              overall CTR of{" "}
              {impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—"}.
            </p>
          </div>
          <div>
            <h3 className="related-heading">Rules that hold whatever is sold</h3>
            <ul style={{ display: "grid", gap: 8, fontSize: 14.5, color: "var(--text-secondary)" }}>
              <li>A placement never earns a ranked position</li>
              <li>Every slot is labelled and carries a disclosure</li>
              <li>Eligibility is checked before a placement runs</li>
            </ul>
          </div>
        </div>
      </Panel>
    </>
  );
}
