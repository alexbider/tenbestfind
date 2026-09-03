import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { setSubmissionStatus } from "@/app/actions/admin-content";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Reports & corrections" };

const KIND_LABEL: Record<string, string> = {
  CORRECTION: "Correction",
  CONTACT: "Contact",
  BUSINESS: "Business submission",
  RANKING_REQUEST: "Ranking request",
};

export default async function AdminSubmissionsPage() {
  await requireStaff();

  const submissions = await db.submission.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });

  const open = submissions.filter((item) => item.status === "NEW" || item.status === "IN_REVIEW");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const corrections = submissions.filter(
    (item) => item.kind === "CORRECTION" && item.createdAt > thirtyDaysAgo,
  );
  const resolved = submissions.filter((item) => item.resolvedAt);
  const medianHours = resolved.length
    ? Math.round(
        resolved
          .map((item) => (item.resolvedAt!.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60))
          .sort((a, b) => a - b)[Math.floor(resolved.length / 2)],
      )
    : 0;

  return (
    <>
      <AdminHeader
        title="Reports and corrections"
        description="Everything readers, owners and advertisers have sent in. Corrections are checked against the primary source before anything changes."
      />

      <StatRow
        compact
        stats={[
          { label: "Open reports", value: open.length },
          { label: "Corrections, 30 days", value: corrections.length },
          { label: "Resolved", value: resolved.length },
          { label: "Median response", value: medianHours ? `${medianHours}h` : "—" },
        ]}
      />

      <Panel title="Inbox" padded={submissions.length === 0}>
        {submissions.length === 0 ? (
          <EmptyState title="Inbox is empty" body="Nothing has been submitted yet." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Type</th>
                  <th scope="col">From</th>
                  <th scope="col">Received</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <span className="admin-table__primary">{submission.subject}</span>
                      {submission.message ? (
                        <span className="admin-table__meta">{submission.message.slice(0, 120)}</span>
                      ) : null}
                      {submission.pageUrl ? (
                        <span className="admin-table__meta">Page: {submission.pageUrl}</span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={submission.kind === "CORRECTION" ? "warning" : "neutral"}>
                        {KIND_LABEL[submission.kind] ?? submission.kind}
                      </Badge>
                    </td>
                    <td>
                      {submission.name ?? "—"}
                      <span className="admin-table__meta">{submission.email}</span>
                    </td>
                    <td>{fullDate(submission.createdAt)}</td>
                    <td>
                      <StatusPill status={submission.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        {submission.status !== "RESOLVED" && submission.status !== "CLOSED" ? (
                          <>
                            {submission.status === "NEW" ? (
                              <form action={setSubmissionStatus}>
                                <input type="hidden" name="id" value={submission.id} />
                                <input type="hidden" name="status" value="IN_REVIEW" />
                                <button type="submit" className="btn btn--ghost btn--sm">
                                  Take it
                                </button>
                              </form>
                            ) : null}
                            <form action={setSubmissionStatus}>
                              <input type="hidden" name="id" value={submission.id} />
                              <input type="hidden" name="status" value="RESOLVED" />
                              <button type="submit" className="btn btn--secondary btn--sm">
                                Resolve
                              </button>
                            </form>
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            {fullDate(submission.resolvedAt)}
                          </span>
                        )}
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
