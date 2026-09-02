import { protectedResourceMetadata } from "@/lib/oauth";

// RFC 9728. Reached at /.well-known/oauth-protected-resource through a rewrite,
// because the app router skips any directory beginning with a dot.

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: { "cache-control": "public, max-age=0, s-maxage=3600", "access-control-allow-origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
    },
  });
}
