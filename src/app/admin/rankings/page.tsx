import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { markRankingReviewed, setRankingStatus } from "@/app/actions/admin-content";
import { StatusPill } from "@/components/ui/primitives";
import { shortMonthYear } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";

export const metadata = { title: "Top 10 rankings" };

export default async function AdminRankingsList() {
  await requireStaff();

  const [rankings, placements, cadenceSetting] = await Promise.all([
    db.ranking.findMany({
      orderBy: [{ status: "asc" }, { lastReviewedAt: "asc" }],
      include: {
        category: true,
        city: { include: { region: { include: { country: true } } } },
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
        _count: { select: { entries: true } },
      },
    }),
    db.sponsoredPlacement.count({ where: { status: "ACTIVE", kind: "FEATURED_PARTNER" } }),
    db.setting.findUnique({ where: { key: "rankings.reviewCadenceMonths" } }),
  ]);

  const cadence = parseJson<number>(cadenceSetting?.value, 6);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cadence);

  const live = rankings.filter((ranking) => ranking.status === "PUBLISHED");
  const due = live.filter((ranking) => (ranking.lastReviewedAt ?? new Date(0)) < cutoff);
  const avgFilled = live.length
    ? Math.round((live.reduce((total, ranking) => total + ranking._count.entries, 0) / live.length) * 10) / 10
    : 0;

  return (
    <>
      <AdminHeader
        title="Top 10 rankings"
        description={`Every published list, its editorial owner and when it was last reviewed. Cadence is every ${cadence} months.`}
        actions={
          <Link href="/admin/rankings/new" className="btn btn--primary btn--sm">
            New ranking
          </Link>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Live rankings", value: live.length },
          { label: "Due re-check", value: due.length, hint: `Older than ${cadence} months` },
          { label: "Featured slots sold", value: placements },
          { label: "Avg positions filled", value: avgFilled, hint: "Out of ten" },
        ]}
      />

      <Panel padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Ranking</th>
                <th scope="col">Country</th>
                <th scope="col">Trade</th>
                <th scope="col">Positions</th>
                <th scope="col">Author</th>
                <th scope="col">Reviewed</th>
                <th scope="col">Status</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => {
                const overdue = (ranking.lastReviewedAt ?? new Date(0)) < cutoff && ranking.status === "PUBLISHED";
                return (
                  <tr key={ranking.id}>
                    <td>
                      <Link href={`/admin/rankings/${ranking.id}`} className="admin-table__primary">
                        {ranking.title}
                      </Link>
                      <span className="admin-table__meta">
                        {ranking.city?.name}, {ranking.city?.region.code.toUpperCase()} ·{" "}
                        {ranking.companiesReviewed} reviewed
                      </span>
                    </td>
                    <td>{ranking.city?.region.country.name}</td>
                    <td>{ranking.category.name}</td>
                    <td className="admin-table__num">{ranking._count.entries}</td>
                    <td>{ranking.author?.name ?? "—"}</td>
                    <td style={{ color: overdue ? "var(--maple-600)" : undefined, fontWeight: overdue ? 600 : undefined }}>
                      {shortMonthYear(ranking.lastReviewedAt)}
                      {overdue ? " · due" : ""}
                    </td>
                    <td>
                      <StatusPill status={ranking.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <form action={markRankingReviewed}>
                          <input type="hidden" name="id" value={ranking.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Mark reviewed
                          </button>
                        </form>
                        <form action={setRankingStatus}>
                          <input type="hidden" name="id" value={ranking.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={ranking.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                          />
                          <button type="submit" className="btn btn--secondary btn--sm">
                            {ranking.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
