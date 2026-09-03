import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Event stream" };

export default async function AdminEventsPage() {
  await requireStaff();

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [events, todayCount, typeCount, connectors] = await Promise.all([
    db.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        business: { select: { id: true, name: true } },
        ranking: { select: { id: true, title: true } },
      },
    }),
    db.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
    db.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true } }),
    db.mcpConnector.count({ where: { enabled: true } }),
  ]);

  return (
    <>
      <AdminHeader
        title="Event stream"
        description="Raw events as they arrive, before the nightly rollup. Useful for checking that tracking on a new page is firing."
      />

      <StatRow
        compact
        stats={[
          { label: "Events today", value: todayCount },
          { label: "Event types", value: typeCount.length },
          { label: "Total recorded", value: typeCount.reduce((total, row) => total + row._count._all, 0) },
          { label: "Connected AI clients", value: connectors, hint: "Enabled MCP connectors" },
        ]}
      />

      <Panel title="Latest events" padded={events.length === 0}>
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            body="Events are written as visitors interact with listings and rankings."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Object</th>
                  <th scope="col">Path</th>
                  <th scope="col">Source</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Badge tone={event.type.includes("CLICK") ? "brand" : "neutral"}>
                        {event.type.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td>
                      {event.business ? (
                        <Link href={`/admin/businesses/${event.business.id}`} className="admin-table__primary">
                          {event.business.name}
                        </Link>
                      ) : event.ranking ? (
                        <Link href={`/admin/rankings/${event.ranking.id}`} className="admin-table__primary">
                          {event.ranking.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{event.path}</td>
                    <td>
                      {event.referrer ? new URL(event.referrer).hostname : "direct"}
                      <span className="admin-table__meta">
                        {event.device ?? "unknown device"}
                        {event.country ? ` · ${event.country}` : ""}
                      </span>
                    </td>
                    <td>{fullDate(event.createdAt)}</td>
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
