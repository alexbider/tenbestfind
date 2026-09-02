import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { parseList } from "./json";
import { absoluteUrl } from "./urls";
import type { UserRole } from "./enums";

// The OAuth 2.1 authorization server that fronts the MCP endpoint.
//
// Shaped to what an MCP client expects: discovery through RFC 9728 protected
// resource metadata and RFC 8414 server metadata, registration through RFC 7591
// dynamic client registration, an authorization code flow with PKCE required
// rather than optional, and tokens bound to this server with RFC 8707 resource
// indicators. There is no implicit grant and no password grant.

export const MCP_PATH = "/api/mcp";
export const SCOPES = ["mcp:read", "mcp:write"] as const;
export type Scope = (typeof SCOPES)[number];

const ACCESS_TTL = 60 * 60; // one hour
const REFRESH_TTL = 60 * 60 * 24 * 30; // thirty days
const CODE_TTL = 60 * 5;

export function issuer(): string {
  return absoluteUrl("/").replace(/\/$/, "");
}

export function resourceId(): string {
  return absoluteUrl(MCP_PATH);
}

/**
 * RFC 8707 audience comparison. Strict on origin and path, forgiving about a
 * trailing slash and letter case, because a person pasting the connector URL
 * into a client will not always match the canonical form and a token that
 * silently fails every call is a miserable thing to debug.
 */
export function sameResource(candidate: string | null | undefined): boolean {
  if (!candidate) return true;
  const normalise = (value: string) => {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
    } catch {
      return value.replace(/\/+$/, "");
    }
  };
  return normalise(candidate) === normalise(resourceId());
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");

/** Constant-time compare, so a wrong secret cannot be found by timing. */
function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/* ---------------------------------------------------------------- metadata */

export function protectedResourceMetadata() {
  return {
    resource: resourceId(),
    authorization_servers: [issuer()],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/admin/connections/"),
  };
}

export function authorizationServerMetadata() {
  const base = issuer();
  return {
    issuer: base,
    authorization_endpoint: `${base}/connect/`,
    token_endpoint: `${base}/api/mcp/token`,
    registration_endpoint: `${base}/api/mcp/register`,
    revocation_endpoint: `${base}/api/mcp/revoke`,
    scopes_supported: [...SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // PKCE is required, not offered: OAuth 2.1 drops the implicit grant and
    // plain challenges, and every MCP client sends S256.
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    resource_indicators_supported: true,
    service_documentation: absoluteUrl("/admin/connections/"),
  };
}

/** The header that tells a client where to go and start the flow. */
export function challengeHeader(error?: string, description?: string): string {
  const parts = [
    `Bearer resource_metadata="${absoluteUrl("/.well-known/oauth-protected-resource")}"`,
  ];
  if (error) parts.push(`error="${error}"`);
  if (description) parts.push(`error_description="${description.replace(/"/g, "'")}"`);
  return parts.join(", ");
}

/* -------------------------------------------------------------- registration */

export type RegistrationRequest = {
  client_name?: unknown;
  redirect_uris?: unknown;
  token_endpoint_auth_method?: unknown;
  grant_types?: unknown;
  scope?: unknown;
  software_id?: unknown;
  logo_uri?: unknown;
  client_uri?: unknown;
};

/**
 * A redirect URI has to be an exact absolute URL. https is required except on
 * loopback, which is how a desktop client receives the callback.
 */
export function validRedirect(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") {
    return url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  }
  // A custom scheme is how a native app is called back. Allowed, but it must
  // look like a real scheme rather than javascript: or data:.
  return /^[a-z][a-z0-9+.-]*:$/.test(url.protocol) && !["javascript:", "data:", "file:"].includes(url.protocol);
}

export async function registerClient(body: RegistrationRequest) {
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (uris.length === 0) {
    return { error: "invalid_redirect_uri", description: "redirect_uris is required." } as const;
  }
  if (uris.length > 10) {
    return { error: "invalid_redirect_uri", description: "Too many redirect URIs." } as const;
  }
  for (const uri of uris) {
    if (!validRedirect(uri)) {
      return { error: "invalid_redirect_uri", description: `${uri} is not a usable redirect URI.` } as const;
    }
  }

  const confidential = body.token_endpoint_auth_method === "client_secret_post" ||
    body.token_endpoint_auth_method === "client_secret_basic";
  const secret = confidential ? token() : null;

  const client = await db.oAuthClient.create({
    data: {
      name: String(body.client_name ?? "Unnamed client").slice(0, 120),
      redirectUris: JSON.stringify(uris),
      secretHash: secret ? await bcrypt.hash(secret, 10) : null,
      scope: typeof body.scope === "string" && body.scope.trim() ? body.scope.trim() : SCOPES.join(" "),
      softwareId: body.software_id ? String(body.software_id).slice(0, 120) : null,
      logoUri: body.logo_uri ? String(body.logo_uri).slice(0, 400) : null,
      clientUri: body.client_uri ? String(body.client_uri).slice(0, 400) : null,
    },
  });

  return {
    registration: {
      client_id: client.id,
      ...(secret ? { client_secret: secret } : {}),
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: confidential ? body.token_endpoint_auth_method : "none",
      scope: client.scope,
    },
  } as const;
}

/* ------------------------------------------------------------- authorize */

export async function loadClient(clientId: string) {
  if (!clientId) return null;
  const client = await db.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client || client.disabledAt) return null;
  return client;
}

export function clientRedirects(client: { redirectUris: string }): string[] {
  return parseList(client.redirectUris);
}

/** Narrows a requested scope to what the client registered and we support. */
export function narrowScope(requested: string | null, clientScope: string): string {
  const allowed = new Set(clientScope.split(/\s+/).filter(Boolean));
  const wanted = (requested ?? "").split(/\s+/).filter(Boolean);
  const granted = (wanted.length > 0 ? wanted : [...allowed]).filter(
    (scope) => allowed.has(scope) && (SCOPES as readonly string[]).includes(scope),
  );
  return granted.length > 0 ? granted.join(" ") : "mcp:read";
}

export async function issueCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string | null;
}): Promise<string> {
  const code = token();
  await db.oAuthCode.create({
    data: {
      codeHash: hash(code),
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      scope: input.scope,
      resource: input.resource,
      expiresAt: new Date(Date.now() + CODE_TTL * 1000),
    },
  });
  return code;
}

/* ----------------------------------------------------------------- tokens */

export type TokenPair = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

async function mint(input: {
  clientId: string;
  userId: string;
  scope: string;
  resource: string | null;
  userAgent: string | null;
}): Promise<TokenPair> {
  const access = token();
  const refresh = token();

  await db.oAuthToken.create({
    data: {
      accessHash: hash(access),
      refreshHash: hash(refresh),
      clientId: input.clientId,
      userId: input.userId,
      scope: input.scope,
      resource: input.resource,
      expiresAt: new Date(Date.now() + ACCESS_TTL * 1000),
      refreshUntil: new Date(Date.now() + REFRESH_TTL * 1000),
      userAgent: input.userAgent?.slice(0, 200) ?? null,
    },
  });

  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TTL,
    refresh_token: refresh,
    scope: input.scope,
  };
}

export type TokenError = { error: string; description?: string };

export async function exchangeCode(input: {
  code: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  codeVerifier: string;
  resource: string | null;
  userAgent: string | null;
}): Promise<TokenPair | TokenError> {
  const client = await loadClient(input.clientId);
  if (!client) return { error: "invalid_client" };

  if (client.secretHash) {
    if (!input.clientSecret || !(await bcrypt.compare(input.clientSecret, client.secretHash))) {
      return { error: "invalid_client" };
    }
  }

  const row = await db.oAuthCode.findUnique({ where: { codeHash: hash(input.code) } });
  if (!row || row.clientId !== client.id) return { error: "invalid_grant" };

  // A code presented twice means it may have been stolen, so every token that
  // came from it is revoked rather than only refusing the second use.
  if (row.usedAt) {
    await db.oAuthToken.updateMany({
      where: { clientId: row.clientId, userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { error: "invalid_grant", description: "That code was already used." };
  }
  if (row.expiresAt < new Date()) return { error: "invalid_grant", description: "That code expired." };
  if (!sameString(row.redirectUri, input.redirectUri)) {
    return { error: "invalid_grant", description: "The redirect URI does not match." };
  }

  const computed = createHash("sha256").update(input.codeVerifier).digest("base64url");
  if (!sameString(computed, row.codeChallenge)) {
    return { error: "invalid_grant", description: "The PKCE verifier does not match." };
  }

  // RFC 8707: a token is bound to one resource. A mismatch means the client is
  // asking for a token it should not get.
  if (input.resource && !sameResource(input.resource)) {
    return { error: "invalid_target", description: "That resource is not this server." };
  }

  await db.oAuthCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  await db.oAuthClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } });

  return mint({
    clientId: client.id,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource ?? input.resource ?? resourceId(),
    userAgent: input.userAgent,
  });
}

export async function refresh(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string | null;
  userAgent: string | null;
}): Promise<TokenPair | TokenError> {
  const client = await loadClient(input.clientId);
  if (!client) return { error: "invalid_client" };
  if (client.secretHash) {
    if (!input.clientSecret || !(await bcrypt.compare(input.clientSecret, client.secretHash))) {
      return { error: "invalid_client" };
    }
  }

  const row = await db.oAuthToken.findUnique({ where: { refreshHash: hash(input.refreshToken) } });
  if (!row || row.clientId !== client.id || row.revokedAt) return { error: "invalid_grant" };
  if (row.refreshUntil && row.refreshUntil < new Date()) {
    return { error: "invalid_grant", description: "The refresh token expired." };
  }

  // Rotation: the old pair is retired as the new one is issued, so a replayed
  // refresh token is a dead token rather than a second live session.
  await db.oAuthToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });

  return mint({
    clientId: client.id,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource,
    userAgent: input.userAgent,
  });
}

/* ------------------------------------------------------------ verification */

export type Bearer = {
  user: { id: string; email: string; name: string; role: UserRole };
  scope: string;
  tokenId: string;
  clientName: string;
};

/**
 * Verifies a presented access token. The audience check is the part that stops
 * a token minted for another service being replayed here.
 */
export async function verifyBearer(header: string | null): Promise<Bearer | null> {
  const raw = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!raw) return null;

  const row = await db.oAuthToken.findUnique({
    where: { accessHash: hash(raw) },
    include: { user: true, client: true },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  if (!row.user.active) return null;
  if (row.client.disabledAt) return null;
  if (!sameResource(row.resource)) return null;

  // Written on a schedule rather than every call, so a busy client does not
  // turn every tool call into a write.
  const stale = !row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000;
  if (stale) {
    await db.oAuthToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }

  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role as UserRole,
    },
    scope: row.scope,
    tokenId: row.id,
    clientName: row.client.name,
  };
}

export async function revokeByToken(value: string): Promise<void> {
  const digest = hash(value);
  await db.oAuthToken.updateMany({
    where: { OR: [{ accessHash: digest }, { refreshHash: digest }], revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Housekeeping, run when the token endpoint is hit rather than on a timer. */
export async function sweepExpired(): Promise<void> {
  const now = new Date();
  await db.oAuthCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 3600_000) } } });
  await db.oAuthToken.deleteMany({
    where: { refreshUntil: { lt: now }, expiresAt: { lt: now } },
  });
}
