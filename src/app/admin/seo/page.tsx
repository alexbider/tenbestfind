import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { RedirectForm } from "@/components/admin/RedirectForm";
import { deleteRedirect } from "@/app/actions/admin-system";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Global SEO" };

const EDIT_PATH: Record<string, string> = {
  page: "/admin/pages",
  guide: "/admin/guides",
  ranking: "/admin/rankings",
  business: "/admin/businesses",
};

export default async function AdminSeoPage() {
  await requireStaff();

  const [records, redirects, settings, counts] = await Promise.all([
    db.seoMeta.findMany({ orderBy: { score: "asc" } }),
    db.redirect.findMany({ orderBy: { createdAt: "desc" } }),
    db.setting.findMany({ where: { groupName: "seo" }, orderBy: { key: "asc" } }),
    Promise.all([
      db.page.count({ where: { status: "PUBLISHED" } }),
      db.guide.count({ where: { status: "PUBLISHED" } }),
      db.ranking.count({ where: { status: "PUBLISHED" } }),
      db.business.count({ where: { status: "PUBLISHED" } }),
    ]),
  ]);

  const [pages, guides, rankings, businesses] = counts;
  const publishedTotal = pages + guides + rankings + businesses;
  const scored = records.filter((record) => record.score > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, record) => total + record.score, 0) / scored.length)
    : 0;
  const noindex = records.filter((record) => !record.robotsIndex).length;
  const weak = records.filter((record) => record.score > 0 && record.score < 60);

  return (
    <>
      <AdminHeader
        title="Global SEO"
        description="Site-wide defaults, the pages that have their own SEO record, and the redirect table."
      />

      <StatRow
        stats={[
          { label: "Published entities", value: publishedTotal },
          { label: "With SEO records", value: records.length, hint: `${publishedTotal - records.length} using defaults` },
          { label: "Avg content score", value: avgScore || "—" },
          { label: "Noindex", value: noindex },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Weakest content scores"
          description="Pages with a focus keyword set but a score below 60."
          padded={weak.length === 0}
        >
          {weak.length === 0 ? (
            <EmptyState
              title="Nothing flagged"
              body="Every analyzed page scores 60 or above, or has no focus keyword set yet."
            />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Entity</th>
                    <th scope="col">Focus keyword</th>
                    <th scope="col">Score</th>
                    <th scope="col">Index</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {weak.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <span className="admin-table__primary">{record.title ?? record.entityId}</span>
                        <span className="admin-table__meta">{record.entityType}</span>
                      </td>
                      <td>{record.focusKeyword ?? "—"}</td>
                      <td className="admin-table__num">{record.score}</td>
                      <td>{record.robotsIndex ? "Index" : <Badge tone="warning">Noindex</Badge>}</td>
                      <td>
                        <div className="admin-table__actions">
                          <Link
                            href={`${EDIT_PATH[record.entityType] ?? "/admin"}/${record.entityId}`}
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

        <Panel title="Site-wide defaults" description="Set in Settings; shown here for reference.">
          <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
            {settings.map((setting) => (
              <div key={setting.key}>
                <dt>{setting.label ?? setting.key}</dt>
                <dd>{String(parseJson<unknown>(setting.value, ""))}</dd>
              </div>
            ))}
          </dl>
          <Link href="/admin/settings" className="btn btn--secondary btn--sm" style={{ marginTop: 18 }}>
            Edit defaults
          </Link>
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Redirects" description="Applied before routing, so a moved page keeps its inbound links." padded={redirects.length === 0}>
          {redirects.length === 0 ? (
            <EmptyState title="No redirects" body="Add one when you change a slug." />
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                    <th scope="col">Type</th>
                    <th scope="col">Hits</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {redirects.map((redirect) => (
                    <tr key={redirect.id}>
                      <td className="admin-table__primary">{redirect.source}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{redirect.target}</td>
                      <td>{redirect.code}</td>
                      <td className="admin-table__num">{redirect.hits}</td>
                      <td>
                        <form action={deleteRedirect} className="admin-table__actions">
                          <input type="hidden" name="id" value={redirect.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Add a redirect">
          <RedirectForm />
        </Panel>
      </div>

      <Panel title="All SEO records" padded={records.length === 0}>
        {records.length === 0 ? (
          <EmptyState
            title="No overrides yet"
            body="Every page is using its computed title and description. Open any page, guide, ranking or business to set its own."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Keyword</th>
                  <th scope="col">Score</th>
                  <th scope="col">Robots</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="admin-table__primary">{record.title ?? "Using default"}</td>
                    <td>{record.entityType}</td>
                    <td>{record.focusKeyword ?? "—"}</td>
                    <td className="admin-table__num">{record.score || "—"}</td>
                    <td>
                      {record.robotsIndex ? "index" : "noindex"}, {record.robotsFollow ? "follow" : "nofollow"}
                    </td>
                    <td>{fullDate(record.updatedAt)}</td>
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
