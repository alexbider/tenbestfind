import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { decideClaim } from "@/app/actions/admin-content";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseJson, type FieldChange } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Claims & verification" };

export default async function AdminClaimsPage() {
  await requireStaff();

  const claims = await db.claimRequest.findMany({
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: { business: { select: { id: true, name: true, slug: true } } },
  });

  const awaiting = claims.filter((claim) => claim.status === "SUBMITTED" || claim.status === "VERIFYING");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const approved = claims.filter(
    (claim) => claim.status === "APPROVED" && (claim.reviewedAt ?? new Date(0)) > thirtyDaysAgo,
  );
  const rejected = claims.filter(
    (claim) => claim.status === "REJECTED" && (claim.reviewedAt ?? new Date(0)) > thirtyDaysAgo,
  );

  const decided = claims.filter((claim) => claim.reviewedAt);
  const avgHours = decided.length
    ? Math.round(
        decided.reduce(
          (total, claim) =>
            total + (claim.reviewedAt!.getTime() - claim.submittedAt.getTime()) / (1000 * 60 * 60),
          0,
        ) / decided.length,
      )
    : 0;

  return (
    <>
      <AdminHeader
        title="Claims and verification"
        description="Ownership requests. Approving marks the listing claimed and activates the subscription; rejecting refunds the charge."
      />

      <StatRow
        stats={[
          { label: "Awaiting review", value: awaiting.length },
          { label: "Avg time to decide", value: avgHours ? `${avgHours}h` : "—" },
          { label: "Approved, 30 days", value: approved.length },
          { label: "Refunded, 30 days", value: rejected.length, hint: "Rejected claims are refunded in full" },
        ]}
      />

      <Panel title="All claims" padded={claims.length === 0}>
        {claims.length === 0 ? (
          <EmptyState title="No claims yet" body="Requests appear here as owners submit them." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Method</th>
                  <th scope="col">Requested changes</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const changes = parseJson<FieldChange[]>(claim.requested, []);
                  return (
                    <tr key={claim.id} id={claim.id}>
                      <td>
                        {claim.business ? (
                          <Link href={`/admin/businesses/${claim.business.id}`} className="admin-table__primary">
                            {claim.businessName}
                          </Link>
                        ) : (
                          <span className="admin-table__primary">{claim.businessName}</span>
                        )}
                        <span className="admin-table__meta">Submitted {fullDate(claim.submittedAt)}</span>
                      </td>
                      <td>
                        {claim.ownerName}
                        <span className="admin-table__meta">
                          {claim.ownerEmail}
                          {claim.role ? ` · ${claim.role}` : ""}
                        </span>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {claim.verificationMethod.replace("_", " ").toLowerCase()}
                      </td>
                      <td>
                        {changes.length === 0 ? (
                          <span style={{ color: "var(--text-muted)" }}>None</span>
                        ) : (
                          <ul style={{ display: "grid", gap: 4 }}>
                            {changes.map((change) => (
                              <li key={change.field} style={{ fontSize: 13 }}>
                                <strong>{change.field}:</strong> {change.current} → {change.requested}
                                <span className="admin-table__meta">
                                  {change.immediate ? "Publishes immediately" : "Goes to editorial review"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <StatusPill status={claim.status} />
                      </td>
                      <td>
                        {claim.status === "APPROVED" || claim.status === "REJECTED" ? (
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            Decided {fullDate(claim.reviewedAt)}
                          </span>
                        ) : (
                          <div className="admin-table__actions">
                            <form action={decideClaim}>
                              <input type="hidden" name="id" value={claim.id} />
                              <input type="hidden" name="decision" value="reject" />
                              <button type="submit" className="btn btn--ghost btn--sm">
                                Reject
                              </button>
                            </form>
                            {claim.status === "SUBMITTED" ? (
                              <form action={decideClaim}>
                                <input type="hidden" name="id" value={claim.id} />
                                <input type="hidden" name="decision" value="verify" />
                                <button type="submit" className="btn btn--secondary btn--sm">
                                  Start verifying
                                </button>
                              </form>
                            ) : null}
                            <form action={decideClaim}>
                              <input type="hidden" name="id" value={claim.id} />
                              <input type="hidden" name="decision" value="approve" />
                              <button type="submit" className="btn btn--primary btn--sm">
                                Approve
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
