"use client";

import { useActionState, useState } from "react";
import { createApiKey, saveConnector, type ActionState } from "@/app/actions/admin-system";
import { Check, Icon } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type ConnectorRow = {
  id: string;
  name: string;
  url: string;
  transport: string;
  authType: string;
  headerName: string | null;
  scopes: string[];
  enabled: boolean;
  tokenLast4: string | null;
};

const SCOPES = [
  "rankings:read",
  "rankings:write",
  "businesses:read",
  "businesses:write",
  "guides:read",
  "guides:write",
  "pages:read",
  "pages:write",
  "analytics:read",
  "seo:write",
];

/** Add or edit an MCP connection. The token is write-only once saved. */
export function ConnectorForm({ connector }: { connector?: ConnectorRow }) {
  const [state, action, pending] = useActionState(saveConnector, initial);
  const [authType, setAuthType] = useState(connector?.authType ?? "bearer");

  return (
    <form action={action}>
      {connector ? <input type="hidden" name="id" value={connector.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor={`conn-name-${connector?.id ?? "new"}`}>Connection name</label>
        <input
          id={`conn-name-${connector?.id ?? "new"}`}
          name="name"
          type="text"
          defaultValue={connector?.name ?? ""}
          placeholder="Editorial research assistant"
        />
      </div>

      <div className="field">
        <label htmlFor={`conn-url-${connector?.id ?? "new"}`}>Server URL</label>
        <input
          id={`conn-url-${connector?.id ?? "new"}`}
          name="url"
          type="url"
          defaultValue={connector?.url ?? ""}
          placeholder="https://mcp.example.com/tenbestfind"
        />
        <span className="field__hint">The MCP endpoint the AI client connects to.</span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`conn-transport-${connector?.id ?? "new"}`}>Transport</label>
          <select
            id={`conn-transport-${connector?.id ?? "new"}`}
            name="transport"
            defaultValue={connector?.transport ?? "http"}
          >
            <option value="http">Streamable HTTP</option>
            <option value="sse">Server-sent events</option>
            <option value="stdio">Standard IO</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`conn-auth-${connector?.id ?? "new"}`}>Authentication</label>
          <select
            id={`conn-auth-${connector?.id ?? "new"}`}
            name="authType"
            value={authType}
            onChange={(event) => setAuthType(event.target.value)}
          >
            <option value="none">None</option>
            <option value="bearer">Bearer token</option>
            <option value="header">Custom header</option>
            <option value="oauth">OAuth</option>
          </select>
        </div>
      </div>

      {authType === "header" ? (
        <div className="field">
          <label htmlFor={`conn-header-${connector?.id ?? "new"}`}>Header name</label>
          <input
            id={`conn-header-${connector?.id ?? "new"}`}
            name="headerName"
            type="text"
            defaultValue={connector?.headerName ?? ""}
            placeholder="X-Api-Key"
          />
        </div>
      ) : null}

      {authType !== "none" ? (
        <div className="field">
          <label htmlFor={`conn-token-${connector?.id ?? "new"}`}>
            {connector?.tokenLast4 ? "Replace token" : "Token"}
          </label>
          <input
            id={`conn-token-${connector?.id ?? "new"}`}
            name="token"
            type="password"
            placeholder={connector?.tokenLast4 ? `•••• ${connector.tokenLast4}` : "Paste the token"}
          />
          <span className="field__hint">
            Stored hashed. Only the last four characters are shown again, so keep your own copy.
          </span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={`conn-scopes-${connector?.id ?? "new"}`}>Scopes</label>
        <input
          id={`conn-scopes-${connector?.id ?? "new"}`}
          name="scopes"
          type="text"
          defaultValue={connector?.scopes.join(", ") ?? "rankings:read, businesses:read"}
        />
        <span className="field__hint">
          Comma separated. Available: {SCOPES.join(", ")}
        </span>
      </div>

      <label className="radio-row" style={{ marginBottom: 18, padding: "12px 14px" }}>
        <input type="checkbox" name="enabled" defaultChecked={connector?.enabled ?? false} />
        <span>
          <strong>Enabled</strong>
          <span>
            A disabled connection keeps its configuration but rejects calls. Start disabled and turn
            it on once the test passes.
          </span>
        </span>
      </label>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : connector ? "Save connection" : "Add connection"}
      </button>
    </form>
  );
}

export function ApiKeyForm() {
  const [state, action, pending] = useActionState(createApiKey, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <>
          <p className="form-success">
            <Check size={18} />
            {state.message}
          </p>
          {state.secret ? (
            <p
              style={{
                padding: "14px 16px",
                marginBottom: 18,
                background: "var(--surface-page)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
                wordBreak: "break-all",
              }}
            >
              {state.secret}
            </p>
          ) : null}
        </>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="key-name">Key name</label>
        <input id="key-name" name="name" type="text" placeholder="Content sync" />
      </div>
      <div className="field">
        <label htmlFor="key-scopes">Scopes</label>
        <input id="key-scopes" name="scopes" type="text" defaultValue="rankings:read, businesses:read" />
      </div>
      <button type="submit" className="btn btn--secondary btn--sm" disabled={pending}>
        <Icon name="plus" size={15} />
        {pending ? "Creating…" : "Create key"}
      </button>
    </form>
  );
}
