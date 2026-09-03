import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Pages" };

export default async function AdminPagesList() {
  await requireStaff();

  const [pages, seoRecords] = await Promise.all([
    db.page.findMany({ orderBy: { title: "asc" } }),
    db.seoMeta.findMany({ where: { entityType: "page" } }),
  ]);

  const seoByEntity = new Map(seoRecords.map((record) => [record.entityId, record]));
  const published = pages.filter((page) => page.status === "PUBLISHED").length;
  const drafts = pages.filter((page) => page.status === "DRAFT").length;
  const noindex = seoRecords.filter((record) => !record.robotsIndex).length;
  const scored = seoRecords.filter((record) => record.score > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, record) => total + record.score, 0) / scored.length)
    : 0;

  return (
    <>
      <AdminHeader
        title="Pages"
        description="Static pages with full SEO control. Templates decide the layout: document, contact or sitemap."
        actions={
          <Link href="/admin/pages/new" className="btn btn--primary btn--sm">
            New page
          </Link>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Published", value: published },
          { label: "Drafts", value: drafts },
          { label: "Noindex", value: noindex, hint: "Excluded from search results" },
          { label: "Avg SEO score", value: avgScore || "—", hint: `${scored.length} pages analyzed` },
        ]}
      />

      <Panel padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Template</th>
                <th scope="col">Status</th>
                <th scope="col">Index</th>
                <th scope="col">SEO</th>
                <th scope="col">Updated</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const seo = seoByEntity.get(page.id);
                return (
                  <tr key={page.id}>
                    <td>
                      <Link href={`/admin/pages/${page.id}`} className="admin-table__primary">
                        {page.title}
                      </Link>
                      <span className="admin-table__meta">/{page.slug}/</span>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{page.template}</td>
                    <td>
                      <StatusPill status={page.status} />
                    </td>
                    <td>{seo && !seo.robotsIndex ? "Noindex" : "Index"}</td>
                    <td className="admin-table__num">{seo?.score ? seo.score : "—"}</td>
                    <td>{fullDate(page.updatedAt)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/${page.slug}/`} target="_blank" className="btn btn--ghost btn--sm">
                          View
                        </Link>
                        <Link href={`/admin/pages/${page.id}`} className="btn btn--secondary btn--sm">
                          Edit
                        </Link>
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
