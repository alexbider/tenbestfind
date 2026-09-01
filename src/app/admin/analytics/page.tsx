import Link from "next/link";
import { AdminHeader, BarChart, Panel, StatRow, TrendChart } from "@/components/admin/shell";
import { percentChange } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { dailySeries, previousTotals, topBusinesses, totalsFor, type Window } from "@/lib/analytics";
import { db } from "@/lib/db";

export const metadata = { title: "Analytics" };

type Props = { searchParams: Promise<{ window?: string }> };

const WINDOWS: Window[] = [7, 30, 90];

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireStaff();
  const requested = Number((await searchParams).window);
  const window: Window = WINDOWS.includes(requested as Window) ? (requested as Window) : 30;

  const [totals, previous, series, top, eventsByType, topRankings] = await Promise.all([
    totalsFor(window),
    previousTotals(window),
    dailySeries(window),
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

      <Panel title={`Profile views, last ${window} days`}>
        <TrendChart series={series} />
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
