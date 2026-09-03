import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { enrichSelection, rescoreListings } from "@/app/actions/admin-content";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { GAPS } from "@/lib/completeness";
import { orderFor, parseFilter, whereFor } from "@/lib/enrich-filter";
import { db } from "@/lib/db";

export const metadata = { title: "Website enrichment" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Entry = { business: string; filled: string[]; staff: number; photos: number; note: string | null };

export default async function AdminEnrichmentPage({ searchParams }: Props) {
  await requireStaff();
  const params = await searchParams;
  const filter = parseFilter(params);
  const where = whereFor(filter);

  const [matching, preview, runs, categories, cities, batches, counts] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: orderFor(filter),
      take: Math.min(300, Math.max(1, filter.limit ?? 25)),
      select: {
        id: true,
        name: true,
        completeness: true,
        status: true,
        siteCrawledAt: true,
        city: { select: { name: true } },
      },
    }),
    db.enrichRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { createdBy: { select: { name: true } }, batch: { select: { id: true, name: true } } },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      where: { businesses: { some: {} } },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    db.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, name: true },
    }),
    Promise.all([
      db.business.count(),
      db.business.count({ where: { website: { not: null } } }),
      db.business.count({ where: { completeness: { lt: 60 } } }),
      db.business.aggregate({ _avg: { completeness: true } }),
    ]),
  ]);

  const [total, withSite, thin, average] = counts;
  const running = runs.find((run) => run.status === "QUEUED" || run.status === "RUNNING");
  const lastDone = runs.find((run) => run.status === "DONE" && run.report);
  const lastEntries: Entry[] = lastDone?.report ? (JSON.parse(lastDone.report) as Entry[]) : [];

  const chosen = new Set(filter.missing ?? []);
  const willRun = Math.min(matching, filter.limit ?? 25);

  return (
    <>
      <AdminHeader
        title="Website enrichment"
        description="Reads a company's own website and fills in what its listing is missing. It never overwrites a field that already holds something, so it is safe to run on anything, as often as you like."
        actions={
          <form action={rescoreListings}>
            <button type="submit" className="btn btn--secondary btn--sm">
              Rescore every listing
            </button>
          </form>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Listings", value: total, hint: `${withSite} have a website to read` },
          { label: "Average completeness", value: `${Math.round(average._avg.completeness ?? 0)}%` },
          { label: "Under 60%", value: thin, hint: "Worth a pass" },
          { label: "Matching this filter", value: matching },
        ]}
      />

      {running ? (
        <p className="form-success" style={{ marginBottom: 24 }}>
          A pass is {running.status.toLowerCase()}: {running.processed} of {running.requested} read,{" "}
          {running.fieldsFilled} fields filled, {running.photosAdded} photos and {running.staffFound}{" "}
          people found so far.
        </p>
      ) : null}

      {/* The filter is a GET form so the selection can be seen before it is run,
          and so a chosen selection survives a reload and can be bookmarked. */}
      <Panel
        title="Choose what to enrich"
        description="Narrow it however you like. The count updates when you apply, and the run takes exactly what you see."
      >
        <form method="get">
          <div className="field-row">
            <div className="field">
              <label htmlFor="en-category">Service</label>
              <select id="en-category" name="categoryId" defaultValue={filter.categoryId ?? ""}>
                <option value="">Every service</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="en-city">City</label>
              <select id="en-city" name="cityId" defaultValue={filter.cityId ?? ""}>
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
              <label htmlFor="en-batch">From an import</label>
              <select id="en-batch" name="batchId" defaultValue={filter.batchId ?? ""}>
                <option value="">Any listing</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="en-status">Status</label>
              <select id="en-status" name="status" defaultValue={filter.status ?? ""}>
                <option value="">Published, draft and pending</option>
                <option value="PUBLISHED">Published only</option>
                <option value="DRAFT">Drafts only</option>
                <option value="PENDING">Pending only</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="en-read">Already read</label>
              <select id="en-read" name="read" defaultValue={filter.read ?? "any"}>
                <option value="any">Read it again whatever</option>
                <option value="never">Only sites never read</option>
                <option value="stale">Only sites not read recently</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="en-stale">Not read for</label>
              <select id="en-stale" name="staleDays" defaultValue={String(filter.staleDays ?? 30)}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
              <span className="field__hint">Only applies to the option above it.</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="en-score">Completeness at most</label>
              <select id="en-score" name="maxScore" defaultValue={filter.maxScore?.toString() ?? ""}>
                <option value="">Any, however complete</option>
                <option value="40">40% or less, the thinnest</option>
                <option value="60">60% or less</option>
                <option value="80">80% or less</option>
                <option value="99">Anything not already full</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="en-order">Work through them</label>
              <select id="en-order" name="order" defaultValue={filter.order ?? "thinnest"}>
                <option value="thinnest">Least complete first</option>
                <option value="oldest">Longest since read first</option>
                <option value="newest">Newest listings first</option>
              </select>
            </div>
          </div>

          <fieldset className="fieldset" style={{ marginTop: 8 }}>
            <legend>Missing specifically</legend>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 14 }}>
              Tick nothing to ignore this. Tick several and a listing has to be missing all of them.
              The ones a website read can actually fill are marked.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
              {/* "No website" is left out: a listing without one is never in the
                  selection anyway, so offering it would only ever return none. */}
              {GAPS.filter((gap) => gap.key !== "website").map((gap) => (
                <label
                  key={gap.key}
                  style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}
                >
                  <input
                    type="checkbox"
                    name="missing"
                    value={gap.key}
                    defaultChecked={chosen.has(gap.key)}
                  />
                  <span>
                    No {gap.label.toLowerCase()}
                    {gap.fromWebsite ? null : (
                      <span style={{ color: "var(--text-muted)" }}> · not from a website</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-row">
            <div className="field">
              <label htmlFor="en-limit">How many at most</label>
              <input
                id="en-limit"
                name="limit"
                type="number"
                min={1}
                max={300}
                defaultValue={filter.limit ?? 25}
              />
              <span className="field__hint">
                Each one is a small crawl plus, with the model on, one call.
              </span>
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button type="submit" className="btn btn--secondary btn--sm">
                Apply the filter
              </button>
            </div>
          </div>
        </form>
      </Panel>

      <Panel
        title={`${matching} listing${matching === 1 ? "" : "s"} match`}
        description={
          matching > willRun
            ? `The run takes the first ${willRun}. Raise the limit above, or run it again afterwards to work through the rest.`
            : "The run takes all of them."
        }
        padded={matching === 0}
      >
        {matching === 0 ? (
          <EmptyState
            title="Nothing matches"
            body="Loosen the filter above. A company with no website on file is never included, because there is nothing to read."
          />
        ) : (
          <>
            {/* The queue button carries the same filter the preview counted, so
                what runs is what is on screen. */}
            <form action={enrichSelection} style={{ marginBottom: 20 }}>
              <input type="hidden" name="categoryId" value={filter.categoryId ?? ""} />
              <input type="hidden" name="cityId" value={filter.cityId ?? ""} />
              <input type="hidden" name="batchId" value={filter.batchId ?? ""} />
              <input type="hidden" name="status" value={filter.status ?? ""} />
              <input type="hidden" name="read" value={filter.read ?? "any"} />
              <input type="hidden" name="staleDays" value={String(filter.staleDays ?? 30)} />
              <input type="hidden" name="maxScore" value={filter.maxScore?.toString() ?? ""} />
              <input type="hidden" name="order" value={filter.order ?? "thinnest"} />
              <input type="hidden" name="limit" value={String(filter.limit ?? 25)} />
              {(filter.missing ?? []).map((key) => (
                <input key={key} type="hidden" name="missing" value={key} />
              ))}

              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn--primary btn--sm">
                  Read {willRun} website{willRun === 1 ? "" : "s"}
                </button>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                  <input type="checkbox" name="useModel" value="yes" defaultChecked />
                  Also read each site for the team, the warranty and the services
                </label>
              </div>
            </form>

            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Company</th>
                    <th scope="col">Complete</th>
                    <th scope="col">Last read</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <Link href={`/admin/businesses/${business.id}`} className="admin-table__primary">
                          {business.name}
                        </Link>
                        <span className="admin-table__meta">{business.city?.name ?? "No city"}</span>
                      </td>
                      <td className="admin-table__num">{business.completeness}%</td>
                      <td>
                        {business.siteCrawledAt ? fullDate(business.siteCrawledAt) : "Never"}
                      </td>
                      <td>
                        <StatusPill status={business.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {lastEntries.length > 0 ? (
        <Panel
          title="What the last finished pass did"
          description={lastDone ? fullDate(lastDone.createdAt) : undefined}
          padded={false}
        >
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Filled</th>
                  <th scope="col">People</th>
                  <th scope="col">Photos</th>
                </tr>
              </thead>
              <tbody>
                {lastEntries.map((entry) => (
                  <tr key={entry.business}>
                    <td className="admin-table__primary">{entry.business}</td>
                    <td style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                      {entry.filled.length > 0 ? entry.filled.join(", ") : (entry.note ?? "Nothing")}
                    </td>
                    <td className="admin-table__num">{entry.staff}</td>
                    <td className="admin-table__num">{entry.photos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel title="Recent passes" padded={runs.length === 0}>
        {runs.length === 0 ? (
          <EmptyState
            title="Nothing run yet"
            body="Pick a selection above, or run it for a single company from its own profile."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Queued</th>
                  <th scope="col">Read</th>
                  <th scope="col">Fields</th>
                  <th scope="col">People</th>
                  <th scope="col">Photos</th>
                  <th scope="col">Status</th>
                  <th scope="col">By</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <span className="admin-table__primary">{fullDate(run.createdAt)}</span>
                      <span className="admin-table__meta">
                        {run.batch ? (
                          <Link href={`/admin/imports/${run.batch.id}`}>{run.batch.name}</Link>
                        ) : (
                          "Directory selection"
                        )}
                        {run.useModel ? "" : " · parser only"}
                      </span>
                      {run.error ? (
                        <span className="admin-table__meta" style={{ color: "var(--maple-600)" }}>
                          {run.error}
                        </span>
                      ) : null}
                    </td>
                    <td className="admin-table__num">
                      {run.processed} of {run.requested}
                    </td>
                    <td className="admin-table__num">{run.fieldsFilled}</td>
                    <td className="admin-table__num">{run.staffFound}</td>
                    <td className="admin-table__num">{run.photosAdded}</td>
                    <td>
                      <StatusPill status={run.status} />
                    </td>
                    <td>{run.createdBy?.name ?? "—"}</td>
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
