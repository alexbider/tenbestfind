import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { setSubmissionStatus } from "@/app/actions/admin-content";
import { decideDescriptionEdit } from "@/app/actions/admin-profile-edits";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { DESCRIPTION_EDIT, type DescriptionEditPayload } from "@/lib/portal-profile";

export const metadata = { title: "Reports & corrections" };

const KIND_LABEL: Record<string, string> = {
  CORRECTION: "Correction",
  CONTACT: "Contact",
  BUSINESS: "Business submission",
  RANKING_REQUEST: "Ranking request",
  [DESCRIPTION_EDIT]: "Owner description",
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
                      {submission.kind === DESCRIPTION_EDIT ? (
                        <DescriptionChange payload={submission.payload} />
                      ) : submission.message ? (
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
                            {submission.kind === DESCRIPTION_EDIT ? (
                              <>
                                <form action={decideDescriptionEdit}>
                                  <input type="hidden" name="id" value={submission.id} />
                                  <input type="hidden" name="decision" value="approve" />
                                  <button type="submit" className="btn btn--primary btn--sm">
                                    Approve
                                  </button>
                                </form>
                                <form action={decideDescriptionEdit}>
                                  <input type="hidden" name="id" value={submission.id} />
                                  <input type="hidden" name="decision" value="decline" />
                                  <ConfirmButton question="Decline this description? The profile keeps the current one.">
                                    Decline
                                  </ConfirmButton>
                                </form>
                              </>
                            ) : (
                              <form action={setSubmissionStatus}>
                                <input type="hidden" name="id" value={submission.id} />
                                <input type="hidden" name="status" value="RESOLVED" />
                                <button type="submit" className="btn btn--secondary btn--sm">
                                  Resolve
                                </button>
                              </form>
                            )}
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

/** The proposed text beside what is live now, so an editor can compare. */
function DescriptionChange({ payload }: { payload: string | null }) {
  const change = parseJson<Partial<DescriptionEditPayload>>(payload, {});
  return (
    <details style={{ marginTop: 4 }}>
      <summary className="admin-table__meta" style={{ cursor: "pointer" }}>
        Compare with the live description
      </summary>
      <div style={{ display: "grid", gap: 8, marginTop: 8, fontSize: 13, maxWidth: 560 }}>
        <div>
          <strong>Proposed</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{change.description ?? "—"}</p>
        </div>
        <div>
          <strong>Live when sent</strong>
          <p style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>{change.previous || "—"}</p>
        </div>
      </div>
    </details>
  );
}
