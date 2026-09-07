import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { ApiKeyForm, ConnectorForm } from "@/components/admin/IntegrationForms";
import { SecretForm } from "@/components/admin/SecretForm";
import { deleteConnector, revokeApiKey, testConnector } from "@/app/actions/admin-system";
import { Badge } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { parseList } from "@/lib/json";
import { isConnected, secretStatus } from "@/lib/secrets";
import { db } from "@/lib/db";

export const metadata = { title: "Integrations & MCP" };

export default async function AdminIntegrationsPage() {
  await requireAdmin();

  const [connectors, keys, secrets] = await Promise.all([
    db.mcpConnector.findMany({ orderBy: { createdAt: "asc" } }),
    db.apiKey.findMany({ orderBy: { createdAt: "desc" } }),
    secretStatus(),
  ]);

  const HINT: Record<string, string> = {
    "apify.token": "Runs the Google Maps scraper. Apify console, Settings, Integrations.",
    "anthropic.apiKey":
      "Writes the imported listings, the guides and the weekly topic plan. console.anthropic.com, API keys.",
    "resend.apiKey":
      "Emails quote requests to companies. resend.com, API keys. The sending domain has to be verified there first.",
    "dataforseo.login":
      "Search volume, keyword difficulty and live results, for the guide writer and the topic radar. app.dataforseo.com, API access. This is the API login, which is an email address, not the one you sign in to the dashboard with.",
    "dataforseo.password":
      "The API password shown next to the login on the same screen. Both have to be set before any research runs.",
    "google.serviceAccount":
      "Submits new pages to the Google Indexing API. Create a service account in Google Cloud, enable the Indexing API on the project, download its JSON key and paste the whole file here. The key alone does not authorise anything: the account is granted access in Google Search Console, under Settings, Users and permissions, by adding its client_email address as an Owner of the property. Anything less than Owner and every call is refused. Once a key is on file the address it needs is printed next to the light above.",
  };

  const connected = secrets.filter(isConnected).length;

  const activeKeys = keys.filter((key) => !key.revokedAt);

  return (
    <>
      <AdminHeader
        title="Integrations and MCP"
        description="Connect this platform to an AI client over the Model Context Protocol, or issue an API key for a service that speaks plain HTTP."
      />

      <StatRow
        compact
        stats={[
          { label: "Connections", value: connectors.length },
          { label: "Enabled", value: connectors.filter((connector) => connector.enabled).length },
          { label: "API keys", value: activeKeys.length, hint: `${keys.length - activeKeys.length} revoked` },
          {
            label: "Last check",
            value: connectors.some((connector) => connector.lastConnectedAt)
              ? fullDate(
                  connectors
                    .map((connector) => connector.lastConnectedAt)
                    .filter(Boolean)
                    .sort((a, b) => b!.getTime() - a!.getTime())[0]!,
                )
              : "Never",
          },
        ]}
      />

      <Panel
        title="MCP connections"
        description="Each connection is a server this platform can be reached through. Scopes decide what the client is allowed to read or change."
        padded={connectors.length === 0}
      >
        {connectors.length === 0 ? (
          <EmptyState
            title="No connections yet"
            body="Add one below to let an AI client read rankings, businesses and guides."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Connection</th>
                  <th scope="col">Transport</th>
                  <th scope="col">Auth</th>
                  <th scope="col">Scopes</th>
                  <th scope="col">Last check</th>
                  <th scope="col">State</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {connectors.map((connector) => (
                  <tr key={connector.id}>
                    <td>
                      <span className="admin-table__primary">{connector.name}</span>
                      <span className="admin-table__meta">{connector.url}</span>
                    </td>
                    <td style={{ textTransform: "uppercase", fontSize: 12 }}>{connector.transport}</td>
                    <td>
                      {connector.authType}
                      {connector.tokenLast4 ? (
                        <span className="admin-table__meta">•••• {connector.tokenLast4}</span>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {parseList(connector.scopes).map((scope) => (
                          <Badge key={scope} tone={scope.endsWith("write") ? "warning" : "neutral"}>
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      {connector.lastConnectedAt ? fullDate(connector.lastConnectedAt) : "Never"}
                      {connector.lastError ? (
                        <span className="admin-table__meta" style={{ color: "var(--maple-600)" }}>
                          {connector.lastError}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {connector.enabled ? (
                        <Badge tone={connector.lastStatus === "error" ? "danger" : "positive"}>
                          {connector.lastStatus === "error" ? "Enabled, failing" : "Enabled"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <form action={testConnector}>
                          <input type="hidden" name="id" value={connector.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Test
                          </button>
                        </form>
                        <form action={deleteConnector}>
                          <input type="hidden" name="id" value={connector.id} />
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

      <Panel
        title="Outbound credentials"
        description={`Keys this platform uses to call other services, ${connected} of ${secrets.length} connected. Stored encrypted; a secret is never shown again, though an account name is, because that is how you check the right account is on the other end.`}
      >
        <div className="panel-grid">
          {secrets.map((secret) => (
            <SecretForm
              key={secret.key}
              secretKey={secret.key}
              label={secret.label}
              hint={HINT[secret.key] ?? ""}
              set={secret.set}
              fromEnv={secret.fromEnv}
              connection={secret.state}
              status={secret.status}
              detail={secret.detail}
            />
          ))}
        </div>
      </Panel>

      <div className="panel-grid">
        <Panel title="Add a connection">
          <ConnectorForm />
        </Panel>

        <div>
          <Panel title="API keys" description="For services that call the platform directly rather than over MCP.">
            <ApiKeyForm />
          </Panel>

          {keys.length > 0 ? (
            <Panel title="Issued keys" padded={false}>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Key</th>
                      <th scope="col">Scopes</th>
                      <th scope="col">Created</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id}>
                        <td>
                          <span className="admin-table__primary">{key.name}</span>
                          <span className="admin-table__meta">•••• {key.keyLast4}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {parseList(key.scopes).map((scope) => (
                              <Badge key={scope} tone="neutral">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td>{fullDate(key.createdAt)}</td>
                        <td>
                          {key.revokedAt ? (
                            <Badge tone="danger">Revoked</Badge>
                          ) : (
                            <form action={revokeApiKey} className="admin-table__actions">
                              <input type="hidden" name="id" value={key.id} />
                              <button type="submit" className="btn btn--ghost btn--sm">
                                Revoke
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <Panel title="What a connected client can do">
        <div className="panel-grid">
          <div>
            <h3 className="related-heading">Read scopes</h3>
            <ul style={{ display: "grid", gap: 8, fontSize: 14.5, color: "var(--text-secondary)" }}>
              <li>rankings:read — published lists, positions and criteria</li>
              <li>businesses:read — profiles, credentials and coverage</li>
              <li>guides:read — guide content and sources</li>
              <li>analytics:read — rolled-up listing performance</li>
            </ul>
          </div>
          <div>
            <h3 className="related-heading">Write scopes</h3>
            <ul style={{ display: "grid", gap: 8, fontSize: 14.5, color: "var(--text-secondary)" }}>
              <li>guides:write and pages:write — draft content, never auto-publish</li>
              <li>businesses:write — profile fields only, never editorial fields</li>
              <li>seo:write — titles, descriptions and robots directives</li>
              <li>
                No scope can set a ranking position. That stays with a named editor, and every write
                appears in the audit log.
              </li>
            </ul>
          </div>
        </div>
      </Panel>
    </>
  );
}
