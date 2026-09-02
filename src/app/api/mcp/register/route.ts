import { registerClient, type RegistrationRequest } from "@/lib/oauth";

// RFC 7591 dynamic client registration. Open by design: this is how a client
// enrols itself before anyone has authorised anything. A registration on its
// own grants nothing, because a client is useless until a person signs in and
// approves it on the consent screen.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: RegistrationRequest;
  try {
    body = (await request.json()) as RegistrationRequest;
  } catch {
    return Response.json({ error: "invalid_client_metadata", error_description: "Body must be JSON." }, { status: 400 });
  }

  const result = await registerClient(body);
  if ("error" in result) {
    return Response.json({ error: result.error, error_description: result.description }, { status: 400 });
  }

  return Response.json(result.registration, {
    status: 201,
    headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
