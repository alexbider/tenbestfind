import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { refreshReviewsBatch } from "@/app/actions/admin-content";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await requireStaff();

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [refreshes, categories, cities, counts, stalest] = await Promise.all([
    db.reviewRefresh.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { createdBy: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      where: { businesses: { some: {} } },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    Promise.all([
      db.business.count({ where: { placeId: { not: null } } }),
      db.business.count({ where: { placeId: { not: null }, reviewsUpdatedAt: null } }),
      db.business.count({
        where: { placeId: { not: null }, reviewsUpdatedAt: { lt: monthAgo } },
      }),
      db.review.count(),
    ]),
    db.business.findMany({
      where: { placeId: { not: null } },
      orderBy: { reviewsUpdatedAt: { sort: "asc", nulls: "first" } },
      take: 12,
      select: {
        id: true,
        name: true,
        status: true,
        reviewsUpdatedAt: true,
        googleRating: true,
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  const [withPlaceId, neverRead, olderThanMonth, storedReviews] = counts;
  const running = refreshes.find((row) => row.status === "QUEUED" || row.status === "RUNNING");

  return (
    <>
      <AdminHeader
        title="Reviews"
        description="Google reviews are read through Apify and quoted on each profile with the reviewer's name, the date and a link back."
      />

      <StatRow
        stats={[
          { label: "Companies with a place id", value: withPlaceId },
          { label: "Never read", value: neverRead },
          { label: "Older than 30 days", value: olderThanMonth },
          { label: "Reviews stored", value: storedReviews },
        ]}
      />

      {running ? (
        <p className="form-success" style={{ marginBottom: 24 }}>
          A refresh is {running.status.toLowerCase()} for {running.requested} companies. The import
          worker picks it up within a few seconds; this page shows the result when it finishes.
        </p>
      ) : null}

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Refresh a batch"
          description="Picks the companies whose reviews were read longest ago, oldest first."
        >
          <form action={refreshReviewsBatch}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="rev-category">Service</label>
                <select id="rev-category" name="categoryId" defaultValue="">
                  <option value="">Every service</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rev-city">City</label>
                <select id="rev-city" name="cityId" defaultValue="">
                  <option value="">Everywhere</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.region.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="rev-stale">Only if not read for</label>
                <select id="rev-stale" name="staleDays" defaultValue="30">
                  <option value="0">Any age</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="rev-limit">How many at most</label>
                <input id="rev-limit" name="limit" type="number" min={1} max={200} defaultValue={50} />
                <span className="field__hint">Each company is one Apify place lookup.</span>
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--sm">
              Queue the refresh
            </button>
          </form>
        </Panel>

        <Panel title="Waiting longest" padded={stalest.length === 0}>
          {stalest.length === 0 ? (
            <EmptyState
              title="Nothing to refresh"
              body="No company in the directory has a Google place id yet. They arrive with an import."
            />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Company</th>
                    <th scope="col">Stored</th>
                    <th scope="col">Last read</th>
                  </tr>
                </thead>
                <tbody>
                  {stalest.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <Link
                          href={`/admin/businesses/${business.id}`}
                          className="admin-table__primary"
                        >
                          {business.name}
                        </Link>
                        <span className="admin-table__meta">
                          {business.googleRating ? `${business.googleRating.toFixed(1)} on Google` : "No rating"}
                        </span>
                      </td>
                      <td className="admin-table__num">{business._count.reviews}</td>
                      <td>
                        {business.reviewsUpdatedAt ? fullDate(business.reviewsUpdatedAt) : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Refresh history" padded={refreshes.length === 0}>
        {refreshes.length === 0 ? (
          <EmptyState
            title="No refreshes yet"
            body="Queue one above, or refresh a single company from its own profile."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Queued</th>
                  <th scope="col">Companies</th>
                  <th scope="col">New</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Status</th>
                  <th scope="col">By</th>
                </tr>
              </thead>
              <tbody>
                {refreshes.map((refresh) => (
                  <tr key={refresh.id}>
                    <td>
                      <span className="admin-table__primary">{fullDate(refresh.createdAt)}</span>
                      {refresh.error ? (
                        <span className="admin-table__meta">{refresh.error}</span>
                      ) : null}
                    </td>
                    <td className="admin-table__num">{refresh.requested}</td>
                    <td className="admin-table__num">{refresh.added}</td>
                    <td className="admin-table__num">{refresh.updated}</td>
                    <td>
                      <StatusPill status={refresh.status} />
                    </td>
                    <td>{refresh.createdBy?.name ?? "—"}</td>
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
