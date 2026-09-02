import { exchangeCode, refresh, sweepExpired, type TokenError } from "@/lib/oauth";

export const dynamic = "force-dynamic";

const bad = (error: TokenError, status = 400) =>
  Response.json(
    { error: error.error, error_description: error.description },
    { status, headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } },
  );

/** Reads client credentials from the body or from HTTP Basic, per RFC 6749. */
function credentials(form: URLSearchParams, request: Request): { id: string; secret: string | null } {
  const header = request.headers.get("authorization");
  const basic = header?.match(/^Basic\s+(.+)$/i)?.[1];
  if (basic) {
    const [id, ...rest] = Buffer.from(basic, "base64").toString("utf8").split(":");
    return { id: decodeURIComponent(id ?? ""), secret: decodeURIComponent(rest.join(":")) };
  }
  return { id: form.get("client_id") ?? "", secret: form.get("client_secret") };
}

export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text());
  const grant = form.get("grant_type");
  const client = credentials(form, request);
  const userAgent = request.headers.get("user-agent");

  void sweepExpired();

  if (grant === "authorization_code") {
    const code = form.get("code");
    const verifier = form.get("code_verifier");
    const redirectUri = form.get("redirect_uri");

    if (!code || !redirectUri) return bad({ error: "invalid_request", description: "code and redirect_uri are required." });
    // PKCE is mandatory here rather than conditional: OAuth 2.1 requires it and
    // every client this server is for already sends it.
    if (!verifier) return bad({ error: "invalid_request", description: "code_verifier is required." });

    const result = await exchangeCode({
      code,
      clientId: client.id,
      clientSecret: client.secret,
      redirectUri,
      codeVerifier: verifier,
      resource: form.get("resource"),
      userAgent,
    });
    if ("error" in result) return bad(result, result.error === "invalid_client" ? 401 : 400);
    return Response.json(result, {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
    });
  }

  if (grant === "refresh_token") {
    const value = form.get("refresh_token");
    if (!value) return bad({ error: "invalid_request", description: "refresh_token is required." });

    const result = await refresh({
      refreshToken: value,
      clientId: client.id,
      clientSecret: client.secret,
      userAgent,
    });
    if ("error" in result) return bad(result, result.error === "invalid_client" ? 401 : 400);
    return Response.json(result, {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
    });
  }

  return bad({ error: "unsupported_grant_type", description: "Use authorization_code or refresh_token." });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
