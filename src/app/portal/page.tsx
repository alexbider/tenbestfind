import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow, TrendChart } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate, percentChange } from "@/lib/format";
import { requireOwner } from "@/lib/auth";
import { dailySeries, previousTotals, totalsFor } from "@/lib/analytics";
import { leadAccessFor } from "@/lib/entitlements";
import { URGENCY_LABEL } from "@/lib/leads";
import { planFor, resolvePortalBusiness } from "@/lib/portal";
import { routes } from "@/lib/urls";
import { db } from "@/lib/db";

export const metadata = { title: "Overview" };

type Props = { searchParams: Promise<{ businessId?: string }> };

export default async function PortalOverview({ searchParams }: Props) {
  const user = await requireOwner();
  const { businessId } = await searchParams;
  const { business } = await resolvePortalBusiness(user, businessId);

  if (!business) {
    return (
      <>
        <AdminHeader title="Your business" />
        <Panel>
          <EmptyState
            title="No listing is attached to this account yet"
            body="Once a claim is approved, the listing and its leads appear here."
          />
          <p style={{ marginTop: 18 }}>
            <Link href={routes.claim()} className="btn btn--primary btn--sm">
              Claim your listing
            </Link>
          </p>
        </Panel>
      </>
    );
  }

  const [totals, previous, series, access, plan, leads, newLeads, leadTotal] = await Promise.all([
    totalsFor(30, business.id),
    previousTotals(30, business.id),
    dailySeries(30, business.id),
    leadAccessFor(business.id),
    planFor(business.id),
    db.lead.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.lead.count({ where: { businessId: business.id, status: "NEW" } }),
    db.lead.count({ where: { businessId: business.id } }),
  ]);

  const contactActions = totals.phoneClicks + totals.websiteClicks + totals.quoteClicks;
  const previousContacts = previous.phoneClicks + previous.websiteClicks + previous.quoteClicks;

  return (
    <>
      <AdminHeader
        title={business.name}
        description="How your listing performed over the last thirty days, and who has been in touch."
        actions={
          business.status === "PUBLISHED" ? (
            <Link
              href={routes.business(business.slug)}
              target="_blank"
              className="btn btn--secondary btn--sm"
            >
              View your profile
            </Link>
          ) : null
        }
      />

      {access.unlocked ? null : (
        <div className="form-error" style={{ marginBottom: 24 }}>
          <strong>{newLeads > 0 ? `${newLeads} enquir${newLeads === 1 ? "y is" : "ies are"} waiting.` : "Enquiries are waiting."}</strong>{" "}
          {access.reason} You can see who got in touch and what they need. The phone number, the
          email and the message open as soon as the listing is on a plan, and everything already
          held for you opens with them.{" "}
          <Link href={routes.forBusinesses()}>See what a plan includes</Link>.
        </div>
      )}

      <StatRow
        stats={[
          {
            label: "Profile views",
            value: totals.profileViews,
            delta: previous.profileViews ? percentChange(totals.profileViews, previous.profileViews) : undefined,
          },
          {
            label: "Times shown in a list",
            value: totals.impressions,
            hint: "Rankings, city pages and search",
          },
          {
            label: "Contact actions",
            value: contactActions,
            delta: previousContacts ? percentChange(contactActions, previousContacts) : undefined,
            hint: "Calls, website clicks and quote requests",
          },
          { label: "Enquiries", value: leadTotal, hint: `${newLeads} not yet handled` },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Profile views, last 30 days">
          <TrendChart series={series} />
        </Panel>

        <Panel title="Your plan">
          {plan ? (
            <>
              <p style={{ fontSize: 16, fontWeight: 650, marginBottom: 6 }}>{plan.name}</p>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {plan.status === "PAST_DUE"
                  ? "The last payment did not go through. Leads stay open for now, but the plan needs attention."
                  : "Active. Contact details on every enquiry are yours to read."}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 16, fontWeight: 650, marginBottom: 6 }}>No plan yet</p>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                Your listing stays published and keeps collecting enquiries either way. A plan opens
                the contact details on them.
              </p>
              <Link href={routes.forBusinesses()} className="btn btn--primary btn--sm">
                See the plans
              </Link>
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Latest enquiries"
        description="The five most recent."
        padded={leads.length === 0}
      >
        {leads.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            body="Enquiries sent through Request a quote on your profile land here and in your inbox."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Who</th>
                  <th scope="col">What they need</th>
                  <th scope="col">When</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/portal/leads/${lead.id}`} className="admin-table__primary">
                        {lead.name}
                      </Link>
                    </td>
                    <td>
                      {lead.jobType || "Not named"}
                      <span className="admin-table__meta">
                        {URGENCY_LABEL[lead.urgency] ?? lead.urgency}
                      </span>
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
