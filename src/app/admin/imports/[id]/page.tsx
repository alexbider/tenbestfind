import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import {
  pauseBatch,
  publishBatchDrafts,
  resumeBatch,
  retryItem,
  skipItem,
} from "@/app/actions/admin-import";
import { enrichBatch } from "@/app/actions/admin-content";
import { requireStaff } from "@/lib/auth";
import { fullDate } from "@/lib/format";
import { routes } from "@/lib/urls";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const RUNNING = ["QUEUED", "SCRAPING", "ENRICHING", "WRITING", "PUBLISHING"];

const ITEM_TONE: Record<string, "positive" | "warning" | "neutral" | "danger"> = {
  IMPORTED: "positive",
  WRITTEN: "neutral",
  WRITING: "neutral",
  DUPLICATE: "warning",
  SKIPPED: "warning",
  FAILED: "danger",
};

const STAGE_NOTE: Record<string, string> = {
  QUEUED: "Waiting for the worker to pick it up.",
  SCRAPING: "Apify is working through the city searches. This is the slow part.",
  ENRICHING: "Reading each company's own site for a contact address.",
  WRITING: "Claude is writing profiles a wave at a time, at the batch price. A wave usually lands within the hour.",
  PUBLISHING: "Creating the businesses, their schema and the ranking.",
  PAUSED: "Stopped. Resuming picks up where it left off.",
  FAILED: "Stopped on an error. Fix the cause, then resume.",
  DONE: "Finished.",
};

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;

  const batch = await db.importBatch.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: true,
      items: {
        orderBy: [{ status: "asc" }, { gmbRank: "asc" }],
        include: { city: true, business: true },
      },
    },
  });
  if (!batch) notFound();

  const cityIds = JSON.parse(batch.cityIds) as string[];
  const cities = await db.city.findMany({ where: { id: { in: cityIds } }, include: { region: true } });

  const running = RUNNING.includes(batch.status);
  const drafts = batch.items.filter(
    (item) => item.status === "IMPORTED" && item.business?.status === "DRAFT",
  );
  const scored = batch.items.filter((item) => item.seoScore > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, item) => total + item.seoScore, 0) / scored.length)
    : 0;
  const withEmail = batch.items.filter((item) => Boolean(item.email)).length;

  // Companies this batch actually created, and how many still have a website
  // nobody has read. That second number is what the enrichment pass is for.
  const imported = batch.items.filter((item) => item.business);
  const unread = imported.filter((item) => item.business?.website && !item.business.siteCrawledAt);
  const enrichRuns = await db.enrichRun.findMany({
    where: { batchId: batch.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const latestEnrich = enrichRuns[0];

  return (
    <>
      <AdminHeader
        title={batch.name}
        description={`${batch.category.name} across ${cities.map((city) => city.name).join(", ")}`}
        actions={
          user.role === "ADMIN" ? (
            <div className="admin__header-actions">
              {running ? (
                <form action={pauseBatch}>
                  <input type="hidden" name="id" value={batch.id} />
                  <button type="submit" className="btn btn--secondary btn--sm">
                    Pause
                  </button>
                </form>
              ) : batch.status === "PAUSED" || batch.status === "FAILED" ? (
                <form action={resumeBatch}>
                  <input type="hidden" name="id" value={batch.id} />
                  <button type="submit" className="btn btn--primary btn--sm">
                    Resume
                  </button>
                </form>
              ) : null}
              {drafts.length > 0 ? (
                <form action={publishBatchDrafts}>
                  <input type="hidden" name="id" value={batch.id} />
                  <button type="submit" className="btn btn--primary btn--sm">
                    Publish {drafts.length} draft{drafts.length === 1 ? "" : "s"}
                  </button>
                </form>
              ) : null}
              <Link href="/admin/imports" className="btn btn--secondary btn--sm">
                All batches
              </Link>
            </div>
          ) : null
        }
      />

      {batch.error ? <p className="form-error" style={{ marginBottom: 24 }}>{batch.error}</p> : null}

      <StatRow
        compact
        stats={[
          { label: "Stage", value: batch.status.toLowerCase(), hint: STAGE_NOTE[batch.status] },
          {
            label: "To import",
            value: batch.found,
            hint: [
              batch.duplicates ? `${batch.duplicates} already known` : "",
              batch.skipped ? `${batch.skipped} failed the quality gate` : "",
            ]
              .filter(Boolean)
              .join(", "),
          },
          { label: "Written", value: batch.written },
          { label: "Published", value: batch.published, hint: `${drafts.length} waiting as drafts` },
          { label: "Avg SEO score", value: avgScore || "—" },
          { label: "With an email", value: `${withEmail}/${batch.items.length}` },
        ]}
      />

      <Panel
        title="Places"
        description="Every result the scrape returned, and what happened to it."
        padded={batch.items.length === 0}
      >
        {batch.items.length === 0 ? (
          <EmptyState
            title="Nothing scraped yet"
            body={STAGE_NOTE[batch.status] ?? "Waiting for the worker."}
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Company</th>
                  <th scope="col">City</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Email</th>
                  <th scope="col">Score</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {batch.items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-table__num">{item.gmbRank ?? "—"}</td>
                    <td>
                      <span className="admin-table__primary">{item.name}</span>
                      {item.reason ? <span className="admin-table__meta">{item.reason}</span> : null}
                    </td>
                    <td>{item.city?.name ?? "—"}</td>
                    <td className="admin-table__num">
                      {item.rating ? `${item.rating}` : "—"}
                      {item.reviewCount ? (
                        <span className="admin-table__meta">{item.reviewCount} reviews</span>
                      ) : null}
                    </td>
                    <td>
                      {item.email ? (
                        <>
                          <span style={{ fontSize: 13 }}>{item.email}</span>
                          <span className="admin-table__meta">{item.emailSource}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="admin-table__num">{item.seoScore || "—"}</td>
                    <td>
                      <Badge tone={ITEM_TONE[item.status] ?? "neutral"}>{item.status.toLowerCase()}</Badge>
                      {item.business ? (
                        <span className="admin-table__meta">{item.business.status.toLowerCase()}</span>
                      ) : null}
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        {item.business ? (
                          <>
                            <Link
                              href={`/admin/businesses/${item.business.id}`}
                              className="btn btn--secondary btn--sm"
                            >
                              Edit
                            </Link>
                            <a
                              href={routes.business(item.business.slug)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn--ghost btn--sm"
                            >
                              View
                            </a>
                          </>
                        ) : item.status === "WRITTEN" || item.status === "FAILED" ? (
                          <form action={retryItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="btn btn--secondary btn--sm">
                              Rewrite
                            </button>
                          </form>
                        ) : null}
                        {!item.business && item.status !== "SKIPPED" && item.status !== "DUPLICATE" ? (
                          <form action={skipItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="btn btn--ghost btn--sm">
                              Skip
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

      <Panel
        title="Fill from the companies' own websites"
        description="A second pass over everything this batch imported. It reads each company's site and fills what the listing is missing, never overwriting anything already there."
      >
        {imported.length === 0 ? (
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
            This batch has not created any companies yet, so there is nothing to enrich.
          </p>
        ) : (
          <>
            <form
              action={enrichBatch}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <input type="hidden" name="batchId" value={batch.id} />
              <button type="submit" className="btn btn--primary btn--sm">
                Read {imported.length} website{imported.length === 1 ? "" : "s"}
              </button>
              <label
                style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "var(--text-secondary)" }}
              >
                <input type="checkbox" name="useModel" value="yes" defaultChecked />
                Also read them for the team, the warranty and the services
              </label>
            </form>

            <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {unread.length > 0
                ? `${unread.length} of these companies has a website nobody has read yet.`
                : "Every company here with a website has been read at least once."}{" "}
              Running it again is safe: a field that already holds something is never touched, so it
              only ever picks up what was added to the site since.
            </p>

            {enrichRuns.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: 18 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Read</th>
                      <th scope="col">Fields</th>
                      <th scope="col">People</th>
                      <th scope="col">Photos</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <span className="admin-table__primary">{fullDate(run.createdAt)}</span>
                          {run.error ? <span className="admin-table__meta">{run.error}</span> : null}
                        </td>
                        <td className="admin-table__num">
                          {run.processed} of {run.requested}
                        </td>
                        <td className="admin-table__num">{run.fieldsFilled}</td>
                        <td className="admin-table__num">{run.staffFound}</td>
                        <td className="admin-table__num">{run.photosAdded}</td>
                        <td>{run.status.toLowerCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {latestEnrich && (latestEnrich.status === "QUEUED" || latestEnrich.status === "RUNNING") ? (
              <p className="form-success" style={{ marginTop: 16 }}>
                A pass is {latestEnrich.status.toLowerCase()}: {latestEnrich.processed} of{" "}
                {latestEnrich.requested} read so far. It runs in the import worker, so it survives a
                deploy and this page shows where it got to.
              </p>
            ) : null}
          </>
        )}
      </Panel>

      <div className="panel-grid">
        <Panel title="Settings this batch ran with">
          <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
            <div>
              <dt>Places per city</dt>
              <dd>{batch.perCity}</dd>
            </div>
            <div>
              <dt>Minimum rating</dt>
              <dd>{batch.minRating ?? "none"}</dd>
            </div>
            <div>
              <dt>Minimum reviews</dt>
              <dd>{batch.minReviews ?? "none"}</dd>
            </div>
            <div>
              <dt>Auto-publish at</dt>
              <dd>{batch.autoPublishScore}</dd>
            </div>
            <div>
              <dt>Ranking</dt>
              <dd>{batch.buildRanking ? `top ${batch.rankingSize} from Google order` : "not built"}</dd>
            </div>
            <div>
              <dt>Queued</dt>
              <dd>{fullDate(batch.createdAt)}</dd>
            </div>
          </dl>
          {batch.note ? (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 18, lineHeight: 1.6 }}>
              {batch.note}
            </p>
          ) : null}
        </Panel>

        <Panel title="What the reader is told">
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Every profile this batch creates records where its rating came from and the date it was
            read. A ranking built from the Google Maps order says so in its methodology note, so the
            page never claims an editorial judgement that has not happened yet. Reordering the
            entries by hand is what turns it into one.
          </p>
        </Panel>
      </div>
    </>
  );
}
