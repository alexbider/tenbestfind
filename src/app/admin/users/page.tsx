import { AdminHeader, Panel, StatRow } from "@/components/admin/shell";
import { UserForm } from "@/components/admin/UserForm";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Users & roles" };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  BUSINESS_OWNER: "Business owner",
};

const ROLE_SCOPE: Record<string, string> = {
  ADMIN: "Everything, including users, settings and integrations",
  EDITOR: "Content, businesses, claims and reports",
  BUSINESS_OWNER: "Their own listing only",
};

export default async function AdminUsersPage() {
  const current = await requireAdmin();

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { auditLogs: true, businesses: true } } },
  });

  const staff = users.filter((user) => user.role !== "BUSINESS_OWNER");

  return (
    <>
      <AdminHeader
        title="Users and roles"
        description="Who can sign in and what they can reach. Every action taken by these accounts is recorded in the audit log."
      />

      <StatRow
        compact
        stats={[
          { label: "Staff accounts", value: staff.length },
          { label: "Business owners", value: users.length - staff.length },
          { label: "Roles", value: 3 },
          { label: "Inactive", value: users.filter((user) => !user.active).length },
        ]}
      />

      <Panel title="Accounts" padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Role</th>
                <th scope="col">Scope</th>
                <th scope="col">Last sign in</th>
                <th scope="col">Actions logged</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="admin-table__primary">{user.name}</span>
                    <span className="admin-table__meta">{user.email}</span>
                  </td>
                  <td>{ROLE_LABEL[user.role] ?? user.role}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{ROLE_SCOPE[user.role]}</td>
                  <td>{user.lastLoginAt ? fullDate(user.lastLoginAt) : "Never"}</td>
                  <td className="admin-table__num">{user._count.auditLogs}</td>
                  <td>
                    {user.active ? <Badge tone="positive">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                    {user.id === current.id ? (
                      <span className="admin-table__meta">This is you</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Edit an account">
        <div style={{ display: "grid", gap: 10 }}>
          {users.map((user) => (
            <details key={user.id} className="macc" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <summary>
                {user.name}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                  {user.email}
                </span>
              </summary>
              <div style={{ padding: "16px 0 22px" }}>
                <UserForm
                  user={{
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    active: user.active,
                  }}
                />
              </div>
            </details>
          ))}
        </div>
      </Panel>

      <Panel title="Add an account">
        <UserForm />
      </Panel>
    </>
  );
}
