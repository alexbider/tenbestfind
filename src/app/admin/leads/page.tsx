import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { resendLead, setLeadStatus } from "@/app/actions/admin-content";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { LEAD_STATUSES, URGENCY_LABEL } from "@/lib/leads";
import { mailConfigured } from "@/lib/mail";
import { db } from "@/lib/db";

export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<{ status?: string; businessId?: string }> };

export default async function AdminLeadsPage({ searchParams }: Props) {
  await requireStaff();
  const params = await searchParams;
  const status = params.status;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [leads, counts, businesses, mailReady] = await Promise.all([
    db.lead.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(params.businessId ? { businessId: params.businessId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { id: true, name: true, slug: true, claimed: true } },
      },
    }),
    Promise.all([
      db.lead.count(),
      db.lead.count({ where: { createdAt: { gte: weekAgo } } }),
      db.lead.count({ where: { unlocked: false } }),
      db.lead.count({ where: { emailError: { not: null } } }),
    ]),
    db.business.findMany({
      where: { leads: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    mailConfigured(),
  ]);

  const [total, thisWeek, locked, failed] = counts;

  const filters = [
    { label: "All", value: undefined },
    ...LEAD_STATUSES.map((value) => ({ label: value[0] + value.slice(1).toLowerCase(), value })),
  ];

  return (
    <>
      <AdminHeader
        title="Leads"
        description="Every enquiry sent through the site, whatever the company pays. Staff see all of it; the company sees what its plan allows."
      />

      {mailReady ? null : (
        <p className="form-error" style={{ marginBottom: 24 }}>
          No Resend API key is set, so nothing is being emailed to companies. Leads are still stored.
          Add the key under Integrations.
        </p>
      )}

      <StatRow
        stats={[
          { label: "Total leads", value: total },
          { label: "Last 7 days", value: thisWeek },
          { label: "Landed on a locked listing", value: locked, hint: "The sales case, in one number" },
          { label: "Failed to email", value: failed },
        ]}
      />

      <Panel padded={false}>
        <div className="panel__body" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div className="admin-tabs" style={{ margin: 0, padding: 0, border: 0 }}>
            {filters.map((filter) => (
              <Link
                key={filter.label}
                href={filter.value ? `/admin/leads?status=${filter.value}` : "/admin/leads"}
                data-on={status === filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>
          {businesses.length > 0 ? (
            <form method="get" className="admin-search">
              {status ? <input type="hidden" name="status" value={status} /> : null}
              <select name="businessId" defaultValue={params.businessId ?? ""}>
                <option value="">Every company</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn--ghost btn--sm">
                Filter
              </button>
            </form>
          ) : null}
        </div>

        {leads.length === 0 ? (
          <div className="panel__body">
            <EmptyState
              title="No leads yet"
              body="They arrive when someone uses Request a quote on a published profile."
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Enquiry</th>
                  <th scope="col">Company</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Delivered</th>
                  <th scope="col">Status</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <span className="admin-table__primary">{lead.name}</span>
                      <span className="admin-table__meta">
                        {lead.jobType || "No job named"} · {URGENCY_LABEL[lead.urgency] ?? lead.urgency} ·{" "}
                        {fullDate(lead.createdAt)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/businesses/${lead.business.id}?tab=leads`}>
                        {lead.business.name}
                      </Link>
                      <span className="admin-table__meta">
                        {lead.unlocked ? "Details were visible" : "Details were hidden"}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "block", fontSize: 13.5 }}>{lead.email}</span>
                      {lead.phone ? (
                        <span style={{ display: "block", fontSize: 13.5, color: "var(--text-secondary)" }}>
                          {lead.phone}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {lead.emailedAt ? (
                        fullDate(lead.emailedAt)
                      ) : lead.emailError ? (
                        <span style={{ color: "var(--maple-600)", fontSize: 13 }}>{lead.emailError}</span>
                      ) : (
                        "Not sent"
                      )}
                    </td>
                    <td>
                      <StatusPill status={lead.status} />
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <form action={setLeadStatus} style={{ display: "flex", gap: 6 }}>
                          <input type="hidden" name="id" value={lead.id} />
                          <select name="status" defaultValue={lead.status} aria-label="Status">
                            {LEAD_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {value[0] + value.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Set
                          </button>
                        </form>
                        {lead.emailedAt ? null : (
                          <form action={resendLead}>
                            <input type="hidden" name="id" value={lead.id} />
                            <button type="submit" className="btn btn--secondary btn--sm">
                              Send again
                            </button>
                          </form>
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
