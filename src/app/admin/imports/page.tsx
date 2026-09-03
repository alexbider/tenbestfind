import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { deleteBatch } from "@/app/actions/admin-import";
import { requireStaff } from "@/lib/auth";
import { secretStatus } from "@/lib/secrets";
import { fullDate } from "@/lib/format";
import { db } from "@/lib/db";

export const metadata = { title: "Imports" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "positive" | "warning" | "neutral" | "danger"> = {
  DONE: "positive",
  QUEUED: "neutral",
  PAUSED: "warning",
  FAILED: "danger",
};

export default async function ImportsPage() {
  const user = await requireStaff();

  const [batches, secrets, imported] = await Promise.all([
    db.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true, createdBy: true },
      take: 60,
    }),
    secretStatus(),
    db.business.count({ where: { importedAt: { not: null } } }),
  ]);

  const running = batches.filter((batch) =>
    ["QUEUED", "SCRAPING", "ENRICHING", "WRITING", "PUBLISHING"].includes(batch.status),
  ).length;
  const missing = secrets.filter((secret) => !secret.set);

  return (
    <>
      <AdminHeader
        title="Imports"
        description="Scrape a service across cities, write every profile, and publish what clears the bar."
        actions={
          user.role === "ADMIN" ? (
            <Link href="/admin/imports/new" className="btn btn--primary btn--sm">
              New batch
            </Link>
          ) : null
        }
      />

      {missing.length > 0 ? (
        <p className="form-error" style={{ marginBottom: 24 }}>
          {missing.map((secret) => secret.label).join(" and ")}{" "}
          {missing.length === 1 ? "is" : "are"} not set. Batches will fail until the credentials are
          in place. <Link href="/admin/integrations">Add them</Link>.
        </p>
      ) : null}

      <StatRow
        compact
        stats={[
          { label: "Batches", value: batches.length },
          { label: "Running", value: running },
          { label: "Businesses imported", value: imported },
          {
            label: "Places found",
            value: batches.reduce((total, batch) => total + batch.found, 0),
          },
        ]}
      />

      <Panel title="All batches" padded={batches.length === 0}>
        {batches.length === 0 ? (
          <EmptyState
            title="No batches yet"
            body="A batch takes one service and a set of cities, scrapes the Google Maps results, writes a profile for each company and scores it."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Batch</th>
                  <th scope="col">Service</th>
                  <th scope="col">Status</th>
                  <th scope="col">Found</th>
                  <th scope="col">Written</th>
                  <th scope="col">Published</th>
                  <th scope="col">Started</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <Link href={`/admin/imports/${batch.id}`} className="admin-table__primary">
                        {batch.name}
                      </Link>
                      <span className="admin-table__meta">
                        {JSON.parse(batch.cityIds).length} cities, up to {batch.perCity} each
                        {batch.createdBy ? ` · ${batch.createdBy.name}` : ""}
                      </span>
                    </td>
                    <td>{batch.category.name}</td>
                    <td>
                      <Badge tone={TONE[batch.status] ?? "neutral"}>{batch.status.toLowerCase()}</Badge>
                      {batch.error ? (
                        <span className="admin-table__meta" title={batch.error}>
                          {batch.error.slice(0, 60)}
                        </span>
                      ) : null}
                    </td>
                    <td className="admin-table__num">
                      {batch.found}
                      {batch.duplicates ? (
                        <span className="admin-table__meta">{batch.duplicates} skipped</span>
                      ) : null}
                    </td>
                    <td className="admin-table__num">{batch.written}</td>
                    <td className="admin-table__num">{batch.published}</td>
                    <td>{batch.startedAt ? fullDate(batch.startedAt) : "—"}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/imports/${batch.id}`} className="btn btn--secondary btn--sm">
                          Open
                        </Link>
                        {user.role === "ADMIN" ? (
                          <form action={deleteBatch}>
                            <input type="hidden" name="id" value={batch.id} />
                            <button type="submit" className="btn btn--ghost btn--sm">
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </div>
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
