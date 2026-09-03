import Link from "next/link";
import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { setGuideStatus } from "@/app/actions/admin-content";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Posts & guides" };

export default async function AdminGuidesList() {
  await requireStaff();

  const [guides, posts, seoRecords] = await Promise.all([
    db.guide.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        category: { select: { name: true } },
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
        _count: { select: { sources: true, faqs: true } },
      },
    }),
    db.post.findMany({ orderBy: { updatedAt: "desc" }, include: { author: { select: { name: true } } } }),
    db.seoMeta.findMany({ where: { entityType: "guide" } }),
  ]);

  const seoByEntity = new Map(seoRecords.map((record) => [record.entityId, record]));
  const published = guides.filter((guide) => guide.status === "PUBLISHED").length;
  const inReview = guides.filter((guide) => guide.status === "REVIEW").length;
  const missingSources = guides.filter((guide) => guide._count.sources === 0).length;
  const scored = seoRecords.filter((record) => record.score > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, record) => total + record.score, 0) / scored.length)
    : 0;

  return (
    <>
      <AdminHeader
        title="Posts and guides"
        description="Editorial and cost guides, with their author, expert reviewer and source count."
        actions={
          <>
            <Link href="/admin/posts/new" className="btn btn--secondary btn--sm">
              New post
            </Link>
            <Link href="/admin/guides/new" className="btn btn--primary btn--sm">
              New guide
            </Link>
          </>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Published", value: published },
          { label: "In review", value: inReview },
          { label: "Avg SEO score", value: avgScore || "—" },
          {
            label: "Missing sources",
            value: missingSources,
            hint: "Guides with no citations recorded",
          },
        ]}
      />

      <Panel title="Guides" padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Category</th>
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
                  <td>{guide.type === "COST" ? "Cost" : "Editorial"}</td>
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
      </Panel>

      <Panel
        title="Posts"
        description="Blog posts share the editorial model but publish under /blog/."
        padded={posts.length === 0}
        actions={
          <Link href="/admin/posts/new" className="btn btn--ghost btn--sm">
            New post
          </Link>
        }
      >
        {posts.length === 0 ? (
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
            No posts yet.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Author</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <Link href={`/admin/posts/${post.id}`} className="admin-table__primary">
                        {post.title}
                      </Link>
                      <span className="admin-table__meta">/blog/{post.slug}/</span>
                    </td>
                    <td>{post.author?.name ?? "—"}</td>
                    <td>
                      <StatusPill status={post.status} />
                    </td>
                    <td>{fullDate(post.updatedAt)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/posts/${post.id}`} className="btn btn--secondary btn--sm">
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
