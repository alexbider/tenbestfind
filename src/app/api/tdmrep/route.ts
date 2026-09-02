import { loadSeoSettings } from "@/lib/seo-settings";

// The TDM Reservation Protocol: a machine-readable statement that text and data
// mining rights are reserved, which is the form the EU copyright directive
// expects an opt-out to take. Served only when it is switched on in the admin,
// so the file is never published saying something the owner did not choose.

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSeoSettings();

  if (!settings.bool("seo.ai.tdmReservation")) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const policy = settings.text("seo.ai.tdmPolicy");
  const entry: Record<string, unknown> = { location: "/", "tdm-reservation": 1 };
  if (policy) entry["tdm-policy"] = policy;

  return new Response(JSON.stringify([entry], null, 2), {
    headers: {
      "content-type": "application/tdmrep+json",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
