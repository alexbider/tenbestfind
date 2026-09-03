import Link from "next/link";
import { AdminHeader, BarChart, EmptyState, Panel, StatRow, TrendChart } from "@/components/admin/shell";
import { percentChange } from "@/lib/format";
import { requireOwner } from "@/lib/auth";
import { breakdowns, dailySeries, leadPlaces, leadSeries, previousTotals, totalsFor, type Window } from "@/lib/analytics";
import { URGENCY_LABEL } from "@/lib/leads";
import { resolvePortalBusiness } from "@/lib/portal";
import { db } from "@/lib/db";

export const metadata = { title: "Performance" };

type Props = { searchParams: Promise<{ businessId?: string; window?: string }> };

const WINDOWS: Window[] = [7, 30, 90];

// A change against a period that saw nothing is not a percentage, it is a
// first. Leaving it undefined keeps the card from claiming a 100% rise.
const delta = (now: number, before: number) =>
  before > 0 ? percentChange(now, before) : undefined;

export default async function PortalAnalytics({ searchParams }: Props) {
  const user = await requireOwner();
  const params = await searchParams;
  const { business } = await resolvePortalBusiness(user, params.businessId);

  if (!business) {
    return (
      <>
        <AdminHeader title="Performance" />
        <Panel>
          <EmptyState
            title="No listing is attached to this account yet"
            body="Once a claim is approved, your numbers appear here."
          />
        </Panel>
      </>
    );
  }

  const window = (WINDOWS.find((value) => String(value) === params.window) ?? 30) as Window;

  const [totals, previous, views, leadsPerDay, mix, places, ranked] = await Promise.all([
    totalsFor(window, business.id),
    previousTotals(window, business.id),
    dailySeries(window, business.id),
    leadSeries(window, business.id),
    breakdowns(window, business.id),
    leadPlaces(window, business.id),
    db.rankingEntry.findMany({
      where: { businessId: business.id },
      orderBy: { position: "asc" },
      include: { ranking: { select: { title: true, status: true } } },
    }),
  ]);

  const contacts = totals.phoneClicks + totals.websiteClicks + totals.quoteClicks;
  const previousContacts = previous.phoneClicks + previous.websiteClicks + previous.quoteClicks;
  const conversion = totals.profileViews > 0 ? (contacts / totals.profileViews) * 100 : 0;

  return (
    <>
      <AdminHeader
        title="Performance"
        description="How many people saw your listing, how many acted on it, and what they were looking for."
        actions={
          <div className="admin-tabs" style={{ margin: 0, padding: 0, border: 0 }}>
            {WINDOWS.map((value) => (
              <Link
                key={value}
                href={`/portal/analytics?window=${value}`}
                data-on={window === value}
              >
                {value} days
              </Link>
            ))}
          </div>
        }
      />

      <StatRow
        stats={[
          {
            label: "Times shown in a list",
            value: totals.impressions,
            delta: delta(totals.impressions, previous.impressions),
            hint: "Rankings, city pages and search results",
          },
          {
            label: "Profile views",
            value: totals.profileViews,
            delta: delta(totals.profileViews, previous.profileViews),
          },
          {
            label: "Phone clicks",
            value: totals.phoneClicks,
            delta: delta(totals.phoneClicks, previous.phoneClicks),
          },
          {
            label: "Quote requests",
            value: totals.leads,
            delta: delta(totals.leads, previous.leads),
          },
        ]}
      />

      <StatRow
        stats={[
          {
            label: "Website clicks",
            value: totals.websiteClicks,
            delta: delta(totals.websiteClicks, previous.websiteClicks),
          },
          {
            label: "Directions",
            value: totals.directionsClicks,
            delta: delta(totals.directionsClicks, previous.directionsClicks),
          },
          {
            label: "Contact actions",
            value: contacts,
            delta: delta(contacts, previousContacts),
          },
          {
            label: "View to contact",
            value: `${conversion.toFixed(1)}%`,
            hint: "Of everyone who opened your profile",
          },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title={`Profile views, last ${window} days`}>
          <TrendChart series={views} />
        </Panel>
        <Panel title={`Quote requests, last ${window} days`}>
          <TrendChart series={leadsPerDay} />
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel
          title="What people asked for"
          description="From the quote requests you received."
          padded={places.jobs.length === 0}
        >
          {places.jobs.length === 0 ? (
            <EmptyState title="No quote requests yet" body="They appear here as they arrive." />
          ) : (
            <BarChart data={places.jobs} valueLabel="requests" />
          )}
        </Panel>

        <Panel
          title="Where they were"
          description="By the postal code on the request."
          padded={places.places.length === 0}
        >
          {places.places.length === 0 ? (
            <EmptyState
              title="No locations yet"
              body="A postal code is optional on the form, so not every request carries one."
            />
          ) : (
            <BarChart data={places.places} valueLabel="requests" />
          )}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="How soon they needed someone" padded={places.urgency.length === 0}>
          {places.urgency.length === 0 ? (
            <EmptyState title="Nothing yet" body="This fills in as quote requests arrive." />
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

        <Panel title="What they were using" padded={mix.devices.length === 0}>
          {mix.devices.length === 0 ? (
            <EmptyState title="Nothing yet" body="This fills in as people visit your profile." />
          ) : (
            <BarChart
              data={mix.devices.map((row) => ({
                label: row.label[0].toUpperCase() + row.label.slice(1),
                value: row.value,
              }))}
              valueLabel="visits"
            />
          )}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Where they came from" padded={mix.sources.length === 0}>
          {mix.sources.length === 0 ? (
            <EmptyState
              title="Mostly direct"
              body="Nobody arrived from another site in this period, or their browser did not say."
            />
          ) : (
            <BarChart data={mix.sources} valueLabel="visits" />
          )}
        </Panel>

        <Panel title="Where you rank" padded={ranked.length === 0}>
          {ranked.length === 0 ? (
            <EmptyState
              title="Not on a list yet"
              body="Editorial positions are set against published criteria and cannot be bought."
            />
          ) : (
            <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, fontSize: 15 }}>
              {ranked.map((entry) => (
                <li key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{entry.ranking.title}</span>
                  <strong style={{ fontVariantNumeric: "tabular-nums" }}>#{entry.position}</strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
