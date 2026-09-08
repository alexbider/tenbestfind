import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { setGuideStatus } from "@/app/actions/admin-content";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { parseIllustrations } from "@/lib/guide-images";

export const metadata = { title: "Library" };

/**
 * Everything the site publishes.
 *
 * There is no second kind of article any more. A blog post and a guide were the
 * same object with different URLs, and having both meant every commission
 * started with a question nobody had a reason to answer.
 */
export default async function GuideLibrary() {
  await requireStaff();

  const [guides, seoRecords] = await Promise.all([
    db.guide.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        category: { select: { name: true } },
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
        _count: { select: { sources: true, faqs: true } },
      },
    }),
    db.seoMeta.findMany({ where: { entityType: "guide" } }),
  ]);

  const seoByEntity = new Map(seoRecords.map((record) => [record.entityId, record]));
  const published = guides.filter((guide) => guide.status === "PUBLISHED").length;
  const drafts = guides.filter((guide) => guide.status !== "PUBLISHED").length;
  const missingSources = guides.filter((guide) => guide._count.sources === 0).length;

  // A guide whose figure blocks point at pictures nobody has made yet renders
  // with gaps where the pictures should be, which is worth seeing from here.
  const missingPictures = guides.filter((guide) => {
    const illustrations = parseIllustrations(guide.illustrations);
    return illustrations.length > 0 && illustrations.some((illustration) => !illustration.path);
  }).length;

  return (
    <>
      <AdminHeader
        title="Guides"
        description="Every guide on the site. Written by Claude through the connector, edited here."
        actions={
          <>
            <Link href="/admin/guides/pipeline" className="btn btn--secondary btn--sm">
              Commission one
            </Link>
            <Link href="/admin/guides/new" className="btn btn--primary btn--sm">
              Write one by hand
            </Link>
          </>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Published", value: published },
          { label: "Drafts", value: drafts },
          { label: "Missing sources", value: missingSources, hint: "No citations recorded" },
          { label: "Missing pictures", value: missingPictures, hint: "Figure blocks with nothing behind them" },
        ]}
      />

      <Panel title="Every guide" padded={guides.length === 0}>
        {guides.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            body="Commission one from the Pipeline tab, or ask Claude for it directly through the connector."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Service</th>
                  <th scope="col">Author</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Sources</th>
                  <th scope="col">SEO</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {guides.map((guide) => (
                  <tr key={guide.id}>
                    <td>
                      <Link href={`/admin/guides/${guide.id}`} className="admin-table__primary">
                        {guide.title}
                      </Link>
                      <span className="admin-table__meta">
                        /guides/{guide.slug}/ · updated {fullDate(guide.updatedAt)}
                      </span>
                    </td>
                    <td>{GUIDE_TYPE_LABELS[guideTypeOf(guide.type)]}</td>
                    <td>{guide.category?.name ?? "General"}</td>
                    <td>{guide.author?.name ?? "—"}</td>
                    <td>{guide.reviewer?.name ?? "Not required"}</td>
                    <td className="admin-table__num">{guide._count.sources}</td>
                    <td className="admin-table__num">{seoByEntity.get(guide.id)?.score || "—"}</td>
                    <td>
                      <StatusPill status={guide.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <form action={setGuideStatus}>
                          <input type="hidden" name="id" value={guide.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={guide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                          />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            {guide.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <Link href={`/admin/guides/${guide.id}`} className="btn btn--secondary btn--sm">
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
    </>
  );
}
