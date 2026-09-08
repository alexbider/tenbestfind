// Everything a connector depends on, checked against a running server.
//
// The one step this cannot do is the human one: a person signing in and
// pressing Allow. Everything either side of it is here, which is where the
// failures actually happen, because a connector that will not connect is
// almost always a discovery document disagreeing with itself, a registration
// refused, or a token minted for an audience the endpoint does not accept.
//
//   BASE=http://localhost:3000 npx tsx scripts/check-connector.ts
//
// Reads only. It registers a throwaway client, which is the one thing it
// leaves behind, and prints its id so it can be revoked.

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok   " : "WRONG"} ${label}`);
  if (!ok && detail !== undefined) console.log(`        ${String(detail).slice(0, 300)}`);
}

async function get(path: string): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await fetch(`${BASE}${path}`);
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

async function rpc(path: string, message: unknown, token?: string) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(message),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body: body as any, headers: response.headers };
}

async function main(): Promise<void> {
  console.log(`the connector, as a client finds it (${BASE})\n`);

  // 1. The front door. Both spellings, both unauthorised, both pointing home.
  for (const path of ["/mcp", "/api/mcp"]) {
    const probe = await rpc(path, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    check(`${path} answers 401 without a token`, probe.status === 401, probe.status);
    check(
      `${path} says where its metadata is`,
      (probe.headers.get("www-authenticate") ?? "").includes("resource_metadata="),
      probe.headers.get("www-authenticate"),
    );
  }

  // 2. Pasting the bare domain is the commonest mistake, and it should read as
  // a mistake rather than as a broken site.
  const bare = await rpc("/", { jsonrpc: "2.0", id: 1, method: "initialize" });
  check("the bare domain says what to use instead", String(bare.body?.error?.message ?? "").includes("/mcp"), bare.body);

  // 3. Discovery, and the two documents agreeing with each other.
  const pr = await get("/.well-known/oauth-protected-resource");
  check("protected resource metadata is served", pr.status === 200, pr.status);
  check("it points at this origin", String(pr.body?.resource ?? "").startsWith(BASE), pr.body?.resource);

  const as = await get("/.well-known/oauth-authorization-server");
  check("authorization server metadata is served", as.status === 200, as.status);
  check(
    "the resource names this authorization server",
    (pr.body?.authorization_servers ?? []).includes(as.body?.issuer),
    `${pr.body?.authorization_servers} vs ${as.body?.issuer}`,
  );
  for (const field of ["authorization_endpoint", "token_endpoint", "registration_endpoint"]) {
    check(`${field} is absolute and on this origin`, String(as.body?.[field] ?? "").startsWith(BASE), as.body?.[field]);
  }
  check("PKCE S256 is required", (as.body?.code_challenge_methods_supported ?? []).includes("S256"));
  check("the authorization code grant is offered", (as.body?.grant_types_supported ?? []).includes("authorization_code"));
  check("refresh is offered", (as.body?.grant_types_supported ?? []).includes("refresh_token"));

  // The path-suffixed form, which a client that was given /mcp will ask for.
  const suffixed = await get("/.well-known/oauth-protected-resource/mcp");
  check("the path-suffixed metadata answers too", suffixed.status === 200, suffixed.status);

  // 4. Registration, with no prior relationship and no key.
  const registration = await fetch(as.body.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Connector check",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      scope: "mcp:read mcp:write",
    }),
  });
  const client = await registration.json().catch(() => ({}));
  check("a client can register itself", registration.status === 201, registration.status);
  check("and is given an id", typeof client.client_id === "string", JSON.stringify(client).slice(0, 200));

  // Reconnecting is the commonest thing a person does after the first time, and
  // it should not leave a second identical row behind.
  const again = await fetch(as.body.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Connector check",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      scope: "mcp:read mcp:write",
    }),
  });
  const repeat = await again.json().catch(() => ({}));
  check("registering again is the same application", repeat.client_id === client.client_id, repeat.client_id);

  // 5. The authorize endpoint, refusing what it should refuse. Each of these is
  // a real failure mode, and each should say which one it is rather than
  // bouncing an unverified redirect.
  const authorize = async (params: Record<string, string>) => {
    const response = await fetch(`${as.body.authorization_endpoint}?${new URLSearchParams(params)}`, {
      redirect: "manual",
    });
    return { status: response.status, text: await response.text() };
  };
  const good = {
    response_type: "code",
    client_id: String(client.client_id ?? ""),
    redirect_uri: "https://claude.ai/api/mcp/auth_callback",
    code_challenge: "x".repeat(43),
    code_challenge_method: "S256",
    scope: "mcp:read mcp:write",
  };

  const unregistered = await authorize({ ...good, redirect_uri: "https://example.com/stolen" });
  check("an unregistered redirect is refused", unregistered.text.includes("not registered"), unregistered.status);

  const noPkce = await authorize({ ...good, code_challenge: "", code_challenge_method: "" });
  check("a request without PKCE is refused", noPkce.text.includes("PKCE"), noPkce.status);

  const unknown = await authorize({ ...good, client_id: "not-a-real-client" });
  check("an unknown client is refused", unknown.text.includes("Unknown application"), unknown.status);

  const valid = await authorize(good);
  check("a valid request reaches the sign-in", valid.text.includes("Connect an application"), valid.status);

  // 6. The token endpoint, refusing a code it never issued.
  const stolen = await fetch(as.body.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: "not-a-code",
      redirect_uri: good.redirect_uri,
      client_id: good.client_id,
      code_verifier: "x".repeat(64),
    }),
  });
  check("an invented code is refused", stolen.status === 400, stolen.status);

  console.log(
    failures === 0
      ? `\nall good. Registered "${client.client_name ?? "Connector check"}" as ${client.client_id}; revoke it under Admin, Connected apps.`
      : `\n${failures} wrong`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
