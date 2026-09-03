import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Audit log" };

const ACTION_TONE: Record<string, "positive" | "warning" | "neutral" | "danger"> = {
  create: "positive",
  publish: "positive",
  update: "neutral",
  review: "neutral",
  verify: "positive",
  decide: "warning",
  delete: "danger",
  revoke: "danger",
  login: "neutral",
  logout: "neutral",
};

export default async function AdminAuditPage() {
  await requireStaff();

  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);

  const [entries, dayCount, retentionSetting, byType] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      include: { user: { select: { name: true, role: true } } },
    }),
    db.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    db.setting.findUnique({ where: { key: "analytics.retentionDays" } }),
    db.auditLog.groupBy({ by: ["entityType"], _count: { _all: true } }),
  ]);

  const retention = parseJson<number>(retentionSetting?.value, 400);
  const apiEntries = entries.filter((entry) => !entry.userId).length;

  return (
    <>
      <AdminHeader
        title="Audit log"
        description="Every create, update, publish and decision, with who did it. Writes made through an API key or MCP client appear here with no user attached."
      />

      <StatRow
        compact
        stats={[
          { label: "Entries, 24 hours", value: dayCount },
          { label: "Object types", value: byType.length },
          { label: "Without a signed-in user", value: apiEntries, hint: "API or system writes" },
          { label: "Retention", value: `${retention} days` },
        ]}
      />

      <Panel title="Recent activity" padded={entries.length === 0}>
        {entries.length === 0 ? (
          <EmptyState title="Nothing logged yet" body="Actions appear here as staff use the console." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Object</th>
                  <th scope="col">Summary</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="admin-table__primary">{entry.user?.name ?? "System or API"}</span>
                      {entry.user ? (
                        <span className="admin-table__meta">{entry.user.role.toLowerCase()}</span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={ACTION_TONE[entry.action] ?? "neutral"}>{entry.action}</Badge>
                    </td>
                    <td>
                      {entry.entityType}
                      {entry.entityId ? (
                        <span className="admin-table__meta">{entry.entityId.slice(-8)}</span>
                      ) : null}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{entry.summary ?? "—"}</td>
                    <td>{fullDate(entry.createdAt)}</td>
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
