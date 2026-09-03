import Link from "next/link";
import { AdminHeader, BarChart, Panel, StackedChart, StatRow, TrendChart } from "@/components/admin/shell";
import { percentChange } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import {
  breakdowns,
  dailyActionSeries,
  leadPlaces,
  leadSeries,
  previousTotals,
  topBusinesses,
  totalsFor,
  type Window,
} from "@/lib/analytics";
import { URGENCY_LABEL } from "@/lib/leads";
import { db } from "@/lib/db";

export const metadata = { title: "Analytics" };

type Props = { searchParams: Promise<{ window?: string }> };

const WINDOWS: Window[] = [7, 30, 90];

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireStaff();
  const requested = Number((await searchParams).window);
  const window: Window = WINDOWS.includes(requested as Window) ? (requested as Window) : 30;

  const [totals, previous, actionSeries, top, eventsByType, topRankings, mix, places, leadsPerDay, lockedLeads] =
    await Promise.all([
    totalsFor(window),
    previousTotals(window),
    dailyActionSeries(window),
    topBusinesses(window, 10),
    db.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true } }),
    db.ranking.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: true,
        city: true,
        _count: { select: { events: true } },
      },
      take: 10,
    }),
    breakdowns(window),
    leadPlaces(window),
    leadSeries(window),
    db.lead.count({ where: { unlocked: false } }),
  ]);

  const contacts = totals.websiteClicks + totals.phoneClicks + totals.quoteClicks;
  const previousContacts = previous.websiteClicks + previous.phoneClicks + previous.quoteClicks;
  const conversion = totals.profileViews
    ? Math.round((contacts / totals.profileViews) * 1000) / 10
    : 0;

  return (
    <>
      <AdminHeader
        title="Analytics"
        description="Every measurable action on a listing, rolled up nightly. Raw events are kept separately in the event stream."
        actions={
          <div className="admin-tabs" style={{ margin: 0, padding: 0, border: 0 }}>
            {WINDOWS.map((value) => (
              <Link key={value} href={`/admin/analytics?window=${value}`} data-on={window === value}>
                {value} days
              </Link>
            ))}
          </div>
        }
      />

      <StatRow
        stats={[
          {
            label: "Impressions",
            value: totals.impressions,
            delta: percentChange(totals.impressions, previous.impressions),
          },
          {
            label: "Profile views",
            value: totals.profileViews,
            delta: percentChange(totals.profileViews, previous.profileViews),
          },
          {
            label: "Contact actions",
            value: contacts,
            delta: percentChange(contacts, previousContacts),
          },
          {
            label: "View to contact",
            value: `${conversion}%`,
            hint: "Share of profile views that led to a contact",
          },
        ]}
      />

      <StatRow
        stats={[
          { label: "Quote requests", value: totals.leads, delta: percentChange(totals.leads, previous.leads) },
          { label: "Phone clicks", value: totals.phoneClicks, delta: percentChange(totals.phoneClicks, previous.phoneClicks) },
          { label: "Website clicks", value: totals.websiteClicks, delta: percentChange(totals.websiteClicks, previous.websiteClicks) },
          {
            label: "Leads on locked listings",
            value: lockedLeads,
            hint: "All time. The sales pipeline, in one number",
          },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title={`Views and contact actions, last ${window} days`}>
          <StackedChart series={actionSeries} topLabel="Profile views" bottomLabel="Contact actions" />
        </Panel>
        <Panel title={`Quote requests, last ${window} days`}>
          <TrendChart series={leadsPerDay} />
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="What people asked for" padded={places.jobs.length === 0}>
          {places.jobs.length === 0 ? (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              No quote requests in this period.
            </p>
          ) : (
            <BarChart data={places.jobs} valueLabel="requests" />
          )}
        </Panel>
        <Panel title="How soon they needed someone" padded={places.urgency.length === 0}>
          {places.urgency.length === 0 ? (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              No quote requests in this period.
            </p>
          ) : (
            <BarChart
              data={places.urgency.map((row) => ({
                label: URGENCY_LABEL[row.label] ?? row.label,
                value: row.value,
              }))}
              valueLabel="requests"
            />
          )}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Devices" padded={mix.devices.length === 0}>
          {mix.devices.length === 0 ? (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>Nothing recorded yet.</p>
          ) : (
            <BarChart
              data={mix.devices.map((row) => ({
                label: row.label[0].toUpperCase() + row.label.slice(1),
                value: row.value,
              }))}
              valueLabel="events"
            />
          )}
        </Panel>
        <Panel title="Referring sites" padded={mix.sources.length === 0}>
          {mix.sources.length === 0 ? (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              Nobody arrived from another site in this period, or their browser did not say.
            </p>
          ) : (
            <BarChart data={mix.sources} valueLabel="visits" />
          )}
        </Panel>
      </div>

      <Panel title="Busiest pages" padded={mix.pages.length === 0}>
        {mix.pages.length === 0 ? (
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>Nothing recorded yet.</p>
        ) : (
          <BarChart data={mix.pages} valueLabel="events" />
        )}
      </Panel>

      <div className="panel-grid">
        <Panel title="Action mix">
          <BarChart
            data={[
              { label: "Impressions in lists", value: totals.impressions },
              { label: "Profile views", value: totals.profileViews },
              { label: "Website clicks", value: totals.websiteClicks },
              { label: "Phone clicks", value: totals.phoneClicks },
              { label: "Quote requests", value: totals.quoteClicks },
              { label: "Direction requests", value: totals.directionsClicks },
            ]}
          />
        </Panel>

        <Panel title="Event types recorded">
          <BarChart
            data={eventsByType
              .map((row) => ({
                label: row.type.replace(/_/g, " ").toLowerCase(),
                value: row._count._all,
              }))
              .sort((a, b) => b.value - a.value)}
            valueLabel="events"
          />
        </Panel>
      </div>

      <Panel title="Top listings" description={`Profile views over the last ${window} days.`} padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">City</th>
                <th scope="col">Profile views</th>
                <th scope="col">Contact actions</th>
                <th scope="col">Rate</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <tr key={row.business?.id ?? row.profileViews}>
                  <td>
                    {row.business ? (
                      <Link href={`/admin/businesses/${row.business.id}?tab=analytics`} className="admin-table__primary">
                        {row.business.name}
                      </Link>
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td>{row.business?.city?.name ?? "—"}</td>
                  <td className="admin-table__num">{row.profileViews.toLocaleString()}</td>
                  <td className="admin-table__num">{row.contactActions.toLocaleString()}</td>
                  <td className="admin-table__num">
                    {row.profileViews
                      ? `${Math.round((row.contactActions / row.profileViews) * 1000) / 10}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Ranking pages" description="Recorded views per published ranking." padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Ranking</th>
                <th scope="col">Trade</th>
                <th scope="col">City</th>
                <th scope="col">Recorded events</th>
              </tr>
            </thead>
            <tbody>
              {topRankings.map((ranking) => (
                <tr key={ranking.id}>
                  <td>
                    <Link href={`/admin/rankings/${ranking.id}`} className="admin-table__primary">
                      {ranking.title}
                    </Link>
                  </td>
                  <td>{ranking.category.name}</td>
                  <td>{ranking.city?.name ?? "—"}</td>
                  <td className="admin-table__num">{ranking._count.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
