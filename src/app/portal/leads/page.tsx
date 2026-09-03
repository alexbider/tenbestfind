import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireOwner } from "@/lib/auth";
import { leadAccessFor, maskLead, firstNameOf } from "@/lib/entitlements";
import { LEAD_STATUSES, URGENCY_LABEL } from "@/lib/leads";
import { resolvePortalBusiness } from "@/lib/portal";
import { routes } from "@/lib/urls";
import { db } from "@/lib/db";

export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<{ businessId?: string; status?: string }> };

export default async function PortalLeads({ searchParams }: Props) {
  const user = await requireOwner();
  const params = await searchParams;
  const { business } = await resolvePortalBusiness(user, params.businessId);

  if (!business) {
    return (
      <>
        <AdminHeader title="Leads" />
        <Panel>
          <EmptyState
            title="No listing is attached to this account yet"
            body="Once a claim is approved, enquiries for your listing appear here."
          />
        </Panel>
      </>
    );
  }

  const access = await leadAccessFor(business.id);
  const rows = await db.lead.findMany({
    where: { businessId: business.id, ...(params.status ? { status: params.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const leads = rows.map((lead) => ({
    ...maskLead(lead, access.unlocked),
    displayName: access.unlocked ? lead.name : `${firstNameOf(lead.name)} ${"•".repeat(6)}`,
  }));

  const counts = {
    total: rows.length,
    fresh: rows.filter((lead) => lead.status === "NEW").length,
    won: rows.filter((lead) => lead.status === "WON").length,
    thisMonth: rows.filter((lead) => lead.createdAt >= new Date(Date.now() - 30 * 86_400_000)).length,
  };

  const filters = [
    { label: "All", value: undefined },
    ...LEAD_STATUSES.filter((value) => value !== "SPAM").map((value) => ({
      label: value[0] + value.slice(1).toLowerCase(),
      value,
    })),
  ];

  return (
    <>
      <AdminHeader
        title="Leads"
        description="Everyone who asked for a quote through your profile. Nothing here is shared with another company."
      />

      {access.unlocked ? null : (
        <div className="form-error" style={{ marginBottom: 24 }}>
          <strong>The contact details on these are hidden.</strong> {access.reason} Every enquiry is
          saved in full and nothing expires, so the day the listing is on a plan all of this opens,
          including the ones already here.{" "}
          <Link href={routes.forBusinesses()}>See what a plan includes</Link>.
        </div>
      )}

      <StatRow
        stats={[
          { label: "Enquiries", value: counts.total },
          { label: "Last 30 days", value: counts.thisMonth },
          { label: "Not yet handled", value: counts.fresh },
          { label: "Marked won", value: counts.won },
        ]}
      />

      <Panel padded={false}>
        <div className="panel__body">
          <div className="admin-tabs" style={{ margin: 0, padding: 0, border: 0 }}>
            {filters.map((filter) => (
              <Link
                key={filter.label}
                href={filter.value ? `/portal/leads?status=${filter.value}` : "/portal/leads"}
                data-on={params.status === filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="panel__body">
            <EmptyState
              title="Nothing here yet"
              body="Enquiries sent through Request a quote on your profile land here and in your inbox."
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Who</th>
                  <th scope="col">What they need</th>
                  <th scope="col">Contact</th>
                  <th scope="col">When</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/portal/leads/${lead.id}`} className="admin-table__primary">
                        {lead.displayName}
                      </Link>
                      <span className="admin-table__meta">
                        {lead.postalCode ? `Near ${lead.postalCode}` : "No postal code given"}
                      </span>
                    </td>
                    <td>
                      {lead.jobType || "Not named"}
                      <span className="admin-table__meta">
                        {URGENCY_LABEL[lead.urgency] ?? lead.urgency}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13.5,
                          color: lead.masked ? "var(--text-muted)" : "var(--ink)",
                          filter: lead.masked ? "blur(0.4px)" : undefined,
                        }}
                      >
                        {lead.email}
                      </span>
                      {lead.phone ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: 13.5,
                            color: lead.masked ? "var(--text-muted)" : "var(--text-secondary)",
                            filter: lead.masked ? "blur(0.4px)" : undefined,
                          }}
                        >
                          {lead.phone}
                        </span>
                      ) : null}
                    </td>
                    <td>{fullDate(lead.createdAt)}</td>
                    <td>
                      <StatusPill status={lead.status} />
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
