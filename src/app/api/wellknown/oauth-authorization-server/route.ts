import { authorizationServerMetadata } from "@/lib/oauth";

// RFC 8414, reached at /.well-known/oauth-authorization-server through a rewrite.

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(authorizationServerMetadata(), {
    headers: { "cache-control": "public, max-age=0, s-maxage=3600", "access-control-allow-origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
