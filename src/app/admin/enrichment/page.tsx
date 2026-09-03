import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { enrichSelection } from "@/app/actions/admin-content";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Website enrichment" };

type Entry = { business: string; filled: string[]; staff: number; photos: number; note: string | null };

export default async function AdminEnrichmentPage() {
  await requireStaff();

  const [runs, categories, cities, counts] = await Promise.all([
    db.enrichRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        createdBy: { select: { name: true } },
        batch: { select: { id: true, name: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      where: { businesses: { some: {} } },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    Promise.all([
      db.business.count({ where: { website: { not: null } } }),
      db.business.count({ where: { website: { not: null }, siteCrawledAt: null } }),
      db.staffMember.count(),
      db.business.count({ where: { logoUrl: null } }),
    ]),
  ]);

  const [withSite, neverRead, staffCount, noLogo] = counts;
  const running = runs.find((run) => run.status === "QUEUED" || run.status === "RUNNING");
  const lastDone = runs.find((run) => run.status === "DONE" && run.report);
  const lastEntries: Entry[] = lastDone?.report ? (JSON.parse(lastDone.report) as Entry[]) : [];

  return (
    <>
      <AdminHeader
        title="Website enrichment"
        description="Reads each company's own website and fills in what its listing is missing. It never overwrites a field that already holds something, so it is safe to run on anything."
      />

      <StatRow
        stats={[
          { label: "Companies with a website", value: withSite },
          { label: "Never read", value: neverRead },
          { label: "People on file", value: staffCount, hint: "Shown on a profile only when there are any" },
          { label: "Still without a logo", value: noLogo },
        ]}
      />

      {running ? (
        <p className="form-success" style={{ marginBottom: 24 }}>
          A pass is {running.status.toLowerCase()}: {running.processed} of {running.requested} read so
          far, {running.fieldsFilled} fields filled and {running.staffFound} people found.
        </p>
      ) : null}

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Read a set of websites"
          description="Oldest read first, so running it repeatedly works through the directory rather than over the same companies."
        >
          <form action={enrichSelection}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="en-category">Service</label>
                <select id="en-category" name="categoryId" defaultValue="">
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
                <select id="en-city" name="cityId" defaultValue="">
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
                <label htmlFor="en-limit">How many at most</label>
                <input id="en-limit" name="limit" type="number" min={1} max={200} defaultValue={25} />
                <span className="field__hint">
                  Each one is a small crawl plus, with the box ticked, one model call.
                </span>
              </div>
              <div className="field">
                <label htmlFor="en-scope">Which companies</label>
                <select id="en-scope" name="onlyNever" defaultValue="yes">
                  <option value="yes">Only ones never read</option>
                  <option value="no">Any, oldest read first</option>
                </select>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 18,
              }}
            >
              <input type="checkbox" name="useModel" value="yes" defaultChecked />
              Also read each site for the team, the warranty and the services it offers
            </label>

            <button type="submit" className="btn btn--primary btn--sm">
              Queue the pass
            </button>
          </form>
        </Panel>

        <Panel title="What it fills">
          <ul style={{ display: "grid", gap: 12, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            <li>
              <strong style={{ color: "var(--ink)" }}>Without the model</strong>
              <span style={{ display: "block" }}>
                Logo, extra photos, the year they started, a licence number in the page text, social
                profiles, a phone number and an email address.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>With the model</strong>
              <span style={{ display: "block" }}>
                The people the site names and what they do, the warranty, the employee count, the
                services matched against this category&apos;s own list, and a short description.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Always</strong>
              <span style={{ display: "block" }}>
                Service areas within the radius, and a credential recorded as reported rather than
                verified when the site prints a licence number.
              </span>
            </li>
          </ul>
          <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Nothing here is verified the way a licence check is. It is what the company says about
            itself, and the profile labels it that way.
          </p>
        </Panel>
      </div>

      {lastEntries.length > 0 ? (
        <Panel
          title="What the last finished pass did"
          description={`${lastDone ? fullDate(lastDone.createdAt) : ""}, company by company.`}
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
            body="Queue one above, or run it for a single company from its own profile, or for a whole batch from the import."
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
