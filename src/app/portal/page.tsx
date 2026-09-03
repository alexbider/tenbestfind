import Link from "next/link";
import { AdminHeader, EmptyState, Panel, QueueList, StackedChart, StatRow } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate, percentChange } from "@/lib/format";
import { requireOwner } from "@/lib/auth";
import { dailyActionSeries, previousTotals, totalsFor } from "@/lib/analytics";
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

  const [totals, previous, series, access, plan, leads, newLeads, leadTotal, entries, photoCount] = await Promise.all([
    totalsFor(30, business.id),
    previousTotals(30, business.id),
    dailyActionSeries(14, business.id),
    leadAccessFor(business.id),
    planFor(business.id),
    db.lead.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.lead.count({ where: { businessId: business.id, status: "NEW" } }),
    db.lead.count({ where: { businessId: business.id } }),
    db.rankingEntry.findMany({
      where: { businessId: business.id, ranking: { status: "PUBLISHED" } },
      orderBy: { position: "asc" },
      take: 4,
      include: {
        ranking: {
          select: {
            title: true,
            slug: true,
            lastReviewedAt: true,
            publishedAt: true,
            category: { select: { slug: true } },
            city: { select: { name: true, slug: true, region: { select: { slug: true, country: { select: { code: true } } } } } },
          },
        },
      },
    }),
    db.businessPhoto.count({ where: { businessId: business.id } }),
  ]);

  const contactActions = totals.phoneClicks + totals.websiteClicks + totals.quoteClicks;
  const previousContacts = previous.phoneClicks + previous.websiteClicks + previous.quoteClicks;
  const topEntry = entries[0];
  const strengthColor =
    business.completeness >= 90 ? "#178054" : business.completeness >= 60 ? "#8A5F0B" : "#C32620";

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

      <section className="strength-bar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2>
            {business.completeness >= 90
              ? "Your profile is complete"
              : business.completeness >= 60
                ? "Your profile is nearly there"
                : "Your profile needs filling in"}
          </h2>
          <p>
            {topEntry
              ? `Ranked #${topEntry.position} on ${topEntry.ranking.title}. `
              : ""}
            {business.completeness >= 90
              ? "Everything a customer needs to call you is published and current."
              : "A fuller profile answers more of what a customer asks before they call."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            aria-hidden="true"
            className="strength-ring"
            style={{
              background: `conic-gradient(${strengthColor} 0 ${business.completeness}%, var(--border-subtle) ${business.completeness}% 100%)`,
            }}
          >
            <span style={{ color: strengthColor }}>{business.completeness}%</span>
          </span>
          <span style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
              Profile strength
            </span>
            <Link href="/portal/profile" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {photoCount < 3 ? `Add ${3 - photoCount} more photo${3 - photoCount === 1 ? "" : "s"} →` : "Review your details →"}
            </Link>
          </span>
        </div>
      </section>

      <StatRow
        compact
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
          },
          { label: "Enquiries", value: leadTotal, hint: `${newLeads} not yet handled` },
          { label: "Rankings you are on", value: entries.length, hint: "Published lists" },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="How customers found and contacted you" description="Last 14 days.">
          <StackedChart
            series={series}
            topLabel="Profile views"
            bottomLabel="Calls, clicks and quote requests"
          />
        </Panel>

        <Panel title="To do">
          <QueueList
            items={[
              {
                title: "Enquiries to answer",
                sub: "Nobody has replied yet",
                count: newLeads,
                href: "/portal/leads?status=NEW",
                icon: "mail",
                tone: "amber",
              },
              {
                title: "Photos on your profile",
                sub: "Three or more reads as a real company",
                count: photoCount,
                href: "/portal/profile",
                icon: "image",
                tone: "blue",
              },
              {
                title: "Rankings you appear on",
                sub: "Published top ten lists",
                count: entries.length,
                href: "/portal/analytics",
                icon: "trophy",
                tone: "green",
              },
            ]}
          />
        </Panel>
      </div>

      <div className="panel-grid panel-grid--wide">
        {entries.length > 0 ? (
          <Panel title="Where you rank">
            <ul style={{ display: "grid", gap: 11 }}>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 12px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 11,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: 9,
                      background: entry.position <= 3 ? "var(--amber-50)" : "var(--surface-page)",
                      color: entry.position <= 3 ? "#8A5F0B" : "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    #{entry.position}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                      {entry.ranking.city ? (
                        <Link
                          href={routes.ranking(
                            entry.ranking.city.region.country.code,
                            entry.ranking.city.region.slug,
                            entry.ranking.city.slug,
                            entry.ranking.category.slug,
                          )}
                        >
                          {entry.ranking.title}
                        </Link>
                      ) : (
                        entry.ranking.title
                      )}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                      Reviewed {fullDate(entry.ranking.lastReviewedAt ?? entry.ranking.publishedAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <Panel title="Where you rank">
            <EmptyState
              title="Not on a published list yet"
              body="Rankings are editorial. When your market and trade are researched, any position you earn shows here."
            />
          </Panel>
        )}

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
