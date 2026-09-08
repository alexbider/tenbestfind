import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { Badge } from "@/components/ui/primitives";
import {
  deleteClient,
  disableClient,
  enableClient,
  revokeSession,
} from "@/app/actions/admin-connections";
import { requireAdmin } from "@/lib/auth";
import { fullDate } from "@/lib/format";
import { parseList } from "@/lib/json";
import { TOOLS, TOOL_GROUPS } from "@/lib/mcp";
import { CopyField } from "@/components/admin/CopyField";
import { absoluteUrl } from "@/lib/urls";
import { db } from "@/lib/db";

export const metadata = { title: "Connected apps" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  await requireAdmin();

  const [clients, sessions] = await Promise.all([
    db.oAuthClient.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tokens: true } } },
    }),
    db.oAuthToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      include: { client: true, user: true },
      take: 50,
    }),
  ]);

  const writeTools = TOOLS.filter((tool) => tool.write);

  return (
    <>
      <AdminHeader
        title="Connected apps"
        description="Applications authorised to use this platform over MCP, and the sessions they hold."
      />

      <StatRow
        compact
        stats={[
          { label: "Applications", value: clients.length },
          { label: "Live sessions", value: sessions.length },
          { label: "Tools exposed", value: TOOLS.length, hint: `${writeTools.length} of them write` },
        ]}
      />

      <div className="panel-grid panel-grid--wide">
        <Panel
          title="Connect Claude to this site"
          description="One URL and one approval. There is no key to generate, copy or keep anywhere."
        >
          <CopyField
            id="mcp-url"
            label="Connector URL"
            value={absoluteUrl("/mcp")}
            hint={`In Claude: Settings, Connectors, Add custom connector, paste, Add. ${absoluteUrl("/api/mcp")} is the same endpoint if a client already has it.`}
          />

          <ol
            style={{
              display: "grid",
              gap: 12,
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              paddingLeft: 18,
              marginTop: 8,
            }}
          >
            <li>Claude finds this site&rsquo;s sign-in server from that URL and registers itself.</li>
            <li>
              A tab opens here. Sign in with your staff account and press Allow. That is the whole
              approval.
            </li>
            <li>
              Access lasts an hour at a time and renews for thirty days. Revoke it below and the
              connection stops working immediately.
            </li>
          </ol>

          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 18, lineHeight: 1.6 }}>
            A connected app acts as the person who approved it and can do nothing that account cannot.
            Every change it makes is written to the audit log with the application&rsquo;s name against it.
          </p>
        </Panel>

        <Panel
          title="What to say once it is connected"
          description="Claude is told what this site is and where to start the moment it connects, so plain questions work."
        >
          <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
            {[
              "What guides need writing?",
              "Write the top one, then show me the draft.",
              "Which of our published guides are too thin, and rewrite the worst.",
              "What did the topic radar find this week?",
              "Which businesses are missing an email address?",
              "Check the SEO report and fix anything scoring under fifty.",
            ].map((line) => (
              <li
                key={line}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 9,
                  padding: "10px 13px",
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                {line}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="What a connection can do"
          description="Read needs mcp:read. Write needs mcp:write and an editor. A few need an administrator."
        >
          <div style={{ display: "grid", gap: 18 }}>
            {TOOL_GROUPS.map((group) => (
              <div key={group.label}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>{group.label}</p>
                <ul
                  style={{
                    display: "grid",
                    gap: 5,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    paddingLeft: 18,
                    margin: 0,
                  }}
                >
                  {group.tools.map((tool) => (
                    <li key={tool.name}>
                      <code>{tool.name}</code>
                      {tool.admin ? " · admin" : tool.write ? " · write" : ""}
                      {tool.destructive ? " · deletes" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

      </div>

      <Panel title="Applications" padded={clients.length === 0}>
        {clients.length === 0 ? (
          <EmptyState
            title="Nothing connected yet"
            body="An application appears here the moment it registers, before anyone has approved it."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">Redirects</th>
                  <th scope="col">Sessions</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Last used</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <span className="admin-table__primary">{client.name}</span>
                      <span className="admin-table__meta">
                        {client.id}
                        {client.secretHash ? " · confidential" : " · public, PKCE only"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                      {parseList(client.redirectUris).slice(0, 2).map((uri) => (
                        <span key={uri} style={{ display: "block" }}>
                          {uri}
                        </span>
                      ))}
                    </td>
                    <td className="admin-table__num">{client._count.tokens}</td>
                    <td>{fullDate(client.createdAt)}</td>
                    <td>{client.lastUsedAt ? fullDate(client.lastUsedAt) : "never"}</td>
                    <td>
                      <div className="admin-table__actions">
                        {client.disabledAt ? (
                          <>
                            <Badge tone="danger">disabled</Badge>
                            <form action={enableClient}>
                              <input type="hidden" name="id" value={client.id} />
                              <button type="submit" className="btn btn--secondary btn--sm">
                                Enable
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={disableClient}>
                            <input type="hidden" name="id" value={client.id} />
                            <button type="submit" className="btn btn--secondary btn--sm">
                              Revoke
                            </button>
                          </form>
                        )}
                        <form action={deleteClient}>
                          <input type="hidden" name="id" value={client.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Live sessions" padded={sessions.length === 0}>
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions" body="A session appears here once someone approves a connection." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">Acting as</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Last call</th>
                  <th scope="col">Expires</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="admin-table__primary">{session.client.name}</td>
                    <td>
                      {session.user.name}
                      <span className="admin-table__meta">{session.user.role.toLowerCase()}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{session.scope}</td>
                    <td>{session.lastUsedAt ? fullDate(session.lastUsedAt) : "not yet"}</td>
                    <td>{fullDate(session.expiresAt)}</td>
                    <td>
                      <form action={revokeSession} className="admin-table__actions">
                        <input type="hidden" name="id" value={session.id} />
                        <button type="submit" className="btn btn--ghost btn--sm">
                          Revoke
                        </button>
                      </form>
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
