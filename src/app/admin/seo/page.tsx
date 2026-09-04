import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { GlobalSeoEditor } from "@/components/admin/GlobalSeoEditor";
import { RedirectForm } from "@/components/admin/RedirectForm";
import { deleteRedirect } from "@/app/actions/admin-system";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { AI_BOTS, loadSeoSettings } from "@/lib/seo-settings";
import { db } from "@/lib/db";
import { buildSeoReport } from "@/lib/seo-report";

export const metadata = { title: "Global SEO" };

const EDIT_PATH: Record<string, string> = {
  page: "/admin/pages",
  guide: "/admin/guides",
  ranking: "/admin/rankings",
  business: "/admin/businesses",
};

export default async function AdminSeoPage() {
  const user = await requireStaff();

  const [records, redirects, settings, counts, report] = await Promise.all([
    db.seoMeta.findMany({ orderBy: { score: "asc" } }),
    db.redirect.findMany({ orderBy: { createdAt: "desc" } }),
    loadSeoSettings(),
    Promise.all([
      db.page.count({ where: { status: "PUBLISHED" } }),
      db.guide.count({ where: { status: "PUBLISHED" } }),
      db.ranking.count({ where: { status: "PUBLISHED" } }),
      db.business.count({ where: { status: "PUBLISHED" } }),
    ]),
    buildSeoReport(),
  ]);

  const [pages, guides, rankings, businesses] = counts;
  const publishedTotal = pages + guides + rankings + businesses;
  const scored = records.filter((record) => record.score > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, record) => total + record.score, 0) / scored.length)
    : 0;
  const noindex = records.filter((record) => !record.robotsIndex).length;
  const weak = records.filter((record) => record.score > 0 && record.score < 60);

  // Blocking first: a page that cannot be indexed at all matters more than one
  // that could be better.
  const findings = [
    ...report.companies.findings,
    ...report.rankings.findings,
    ...report.contradictions,
  ].sort((a, b) => Number(b.severity === "blocking") - Number(a.severity === "blocking"));

  const visible = settings.bool("seo.searchEngineVisible");
  const blockedBots = settings.list("seo.ai.blockedBots").length;

  return (
    <>
      <AdminHeader
        title="Global SEO"
        description="The site-wide configuration, the pages that have their own SEO record, and the redirect table."
      />

      {visible ? null : (
        <p className="form-error" style={{ marginBottom: 24 }}>
          Indexing is switched off. Every page publishes noindex, robots.txt disallows every crawler
          and the sitemap is empty. Turn it back on under Search engine visibility below.
        </p>
      )}

      <StatRow
        compact
        stats={[
          { label: "Indexing", value: visible ? "On" : "Off" },
          { label: "Published entities", value: publishedTotal },
          { label: "With SEO records", value: records.length, hint: `${publishedTotal - records.length} using defaults` },
          { label: "Avg content score", value: avgScore || "—" },
          { label: "Page noindex", value: noindex },
          { label: "AI crawlers blocked", value: `${blockedBots}/${AI_BOTS.length}` },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Global SEO" description="Applies to every page. A value set on a page always wins.">
          {user.role === "ADMIN" ? (
            <GlobalSeoEditor values={settings.raw} />
          ) : (
            <EmptyState
              title="Administrators only"
              body="The site-wide configuration is edited by an administrator. Per-page SEO is on each page's own editor."
            />
          )}
        </Panel>

        <Panel
          title="What is holding pages back"
          description="Checked against the live data every time this page loads. Nothing here is fixed automatically: each one is a decision with an editor's name on it."
        >
          <StatRow
            compact
            stats={[
              {
                label: "Profiles fit to index",
                value: `${report.companies.indexable}/${report.companies.total}`,
                hint: report.companies.findings.length
                  ? `${report.companies.findings.length} too thin to publish`
                  : "every published profile passes",
              },
              {
                label: "Complete Top 10s",
                value: `${report.rankings.complete}/${report.rankings.total}`,
                hint: "a list of nine cannot call itself a Top 10",
              },
              {
                label: "Contradictions",
                value: report.contradictions.length,
                hint: "the same fact, said twice, differently",
              },
            ]}
          />

          {findings.length === 0 ? (
            <EmptyState
              title="Nothing to fix"
              body="Every published page passes the checks: enough on it to be worth landing on, nothing claimed that the data does not support, and no fact that disagrees with itself."
            />
          ) : (
            <ul style={{ display: "grid", gap: 12, marginTop: 18, fontSize: 14.5, lineHeight: 1.55 }}>
              {findings.slice(0, 25).map((finding) => (
                <li key={`${finding.path}-${finding.problem}`} style={{ display: "grid", gap: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge tone={finding.severity === "blocking" ? "danger" : "warning"}>
                      {finding.severity === "blocking" ? "Blocking" : "Worth fixing"}
                    </Badge>
                    {finding.editHref ? (
                      <Link href={finding.editHref} style={{ fontWeight: 600 }}>
                        {finding.label}
                      </Link>
                    ) : (
                      <strong>{finding.label}</strong>
                    )}
                    <a href={finding.path} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      view
                    </a>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{finding.problem}</span>
                </li>
              ))}
              {findings.length > 25 ? (
                <li style={{ color: "var(--text-secondary)" }}>
                  and {findings.length - 25} more.
                </li>
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel title="What this publishes" description="Open each one to check what a crawler sees.">
          <ul style={{ display: "grid", gap: 14, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            <li>
              <a href="/robots.txt" target="_blank" rel="noreferrer">
                /robots.txt
              </a>
              <span style={{ display: "block" }}>
                Crawl rules, the AI crawler blocks and the sitemap pointer.
              </span>
            </li>
            <li>
              <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                /sitemap.xml
              </a>
              <span style={{ display: "block" }}>
                An index of one file per kind of page. Only URLs that are allowed in the index are
                offered, so a city with nothing published under it is not in it.
              </span>
            </li>
            <li>
              <a href="/llms.txt" target="_blank" rel="noreferrer">
                /llms.txt
              </a>
              <span style={{ display: "block" }}>
                A markdown map of the site written for language models, generated from published
                content.
              </span>
            </li>
            <li>
              <a href="/.well-known/tdmrep.json" target="_blank" rel="noreferrer">
                /.well-known/tdmrep.json
              </a>
              <span style={{ display: "block" }}>
                The text and data mining reservation. Returns 404 until you switch it on.
              </span>
            </li>
          </ul>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 18, lineHeight: 1.6 }}>
            Blocking an answer engine also removes the site from its citations. The defaults block
            the bulk training crawlers that send no traffic back and leave the answer engines alone.
          </p>
        </Panel>
      </div>

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
