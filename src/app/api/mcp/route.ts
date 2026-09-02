import { challengeHeader, verifyBearer, type Bearer } from "@/lib/oauth";
import { describe, runTool, ToolError, visibleTools } from "@/lib/mcp";

// The MCP endpoint, spoken over streamable HTTP.
//
// Stateless on purpose: every request carries its own bearer token and nothing
// is kept between calls, so there is no session to lose across a deploy and no
// Mcp-Session-Id to manage. Responses are plain JSON rather than an event
// stream, which the transport allows and which is all these tools need.

export const dynamic = "force-dynamic";

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const LATEST = "2025-06-18";

const SERVER = {
  name: "tenbestfind",
  title: "TenBestFind",
  version: "1.0.0",
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "access-control-expose-headers": "www-authenticate, mcp-protocol-version",
};

type Id = string | number | null;
type Rpc = { jsonrpc: "2.0"; id?: Id; method?: string; params?: Record<string, unknown> };

const result = (id: Id, value: unknown) => ({ jsonrpc: "2.0" as const, id, result: value });
const failure = (id: Id, code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0" as const,
  id,
  error: { code, message, ...(data !== undefined ? { data } : {}) },
});

function unauthorized(description: string) {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: description } },
    {
      status: 401,
      headers: { ...CORS, "www-authenticate": challengeHeader("invalid_token", description) },
    },
  );
}

async function dispatch(message: Rpc, ctx: Bearer): Promise<unknown | null> {
  const id = message.id ?? null;
  const params = message.params ?? {};

  switch (message.method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? LATEST);
      return result(id, {
        // Echo the client's version when we speak it, otherwise name ours and
        // let the client decide whether to continue.
        protocolVersion: SUPPORTED.includes(asked) ? asked : LATEST,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          "TenBestFind publishes researched shortlists of local service companies. Read tools cover businesses, rankings, services, locations, SEO records and import batches. Write tools edit profiles, publish listings, write SEO records, add redirects and queue scrape-and-write batches. Call site_overview first to see the shape of the data. Everything you change is written to the audit log under the account that authorised this connection.",
      });
    }

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, {
        tools: visibleTools(ctx.scope, ctx.user.role).map(describe),
      });

    case "tools/call": {
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const value = await runTool(name, args, ctx);
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
          structuredContent: value,
          isError: false,
        });
      } catch (error) {
        // A tool that refuses is reported inside the result rather than as a
        // protocol error, so the model can read the reason and try again.
        const message =
          error instanceof ToolError
            ? error.message
            : `${name} failed: ${error instanceof Error ? error.message : "unknown error"}`;
        return result(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }

    // Declared capabilities do not include these, but clients probe anyway.
    case "resources/list":
      return result(id, { resources: [] });
    case "prompts/list":
      return result(id, { prompts: [] });

    default:
      // A notification has no id and takes no response.
      if (message.id === undefined) return null;
      return failure(id, -32601, `Unknown method: ${message.method}`);
  }
}

export async function POST(request: Request) {
  const ctx = await verifyBearer(request.headers.get("authorization"));
  if (!ctx) {
    return unauthorized(
      request.headers.get("authorization")
        ? "That access token is not valid for this server."
        : "Authorization is required.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(failure(null, -32700, "The body is not valid JSON."), { status: 400, headers: CORS });
  }

  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as Rpc[];
  if (messages.length === 0) {
    return Response.json(failure(null, -32600, "Empty request."), { status: 400, headers: CORS });
  }

  const responses = [];
  for (const message of messages) {
    if (!message || message.jsonrpc !== "2.0") {
      responses.push(failure(message?.id ?? null, -32600, "Each message must be JSON-RPC 2.0."));
      continue;
    }
    const answer = await dispatch(message, ctx);
    if (answer !== null) responses.push(answer);
  }

  // Everything in was a notification, so there is nothing to send back.
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });

  return Response.json(batch ? responses : responses[0], {
    headers: { ...CORS, "mcp-protocol-version": LATEST, "cache-control": "no-store" },
  });
}

/**
 * The transport allows a GET for a server-initiated event stream. This server
 * never initiates anything, so it says so rather than holding a connection open
 * that will never carry a message.
 */
export async function GET(request: Request) {
  const ctx = await verifyBearer(request.headers.get("authorization"));
  if (!ctx) return unauthorized("Authorization is required.");
  return new Response(null, { status: 405, headers: { ...CORS, allow: "POST, DELETE, OPTIONS" } });
}

/** Session teardown. Stateless, so there is nothing to tear down. */
export async function DELETE() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
