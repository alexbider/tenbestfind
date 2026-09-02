import { revokeByToken } from "@/lib/oauth";

// RFC 7009. Always answers 200, including for a token that was never valid, so
// the endpoint cannot be used to test whether a token exists.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text());
  const value = form.get("token");
  if (value) await revokeByToken(value);
  return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
}
