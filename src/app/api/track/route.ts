import { NextResponse } from "next/server";
import { z } from "zod";
import { ANALYTICS_EVENTS } from "@/lib/enums";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  type: z.enum(ANALYTICS_EVENTS),
  path: z.string().max(500),
  businessId: z.string().max(40).optional(),
  rankingId: z.string().max(40).optional(),
});

/**
 * First-party event collection. Writes one row per interaction; the nightly
 * rollup aggregates them into BusinessDailyStat for the dashboards.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer");

  await db.analyticsEvent.create({
    data: {
      type: parsed.data.type,
      path: parsed.data.path,
      businessId: parsed.data.businessId ?? null,
      rankingId: parsed.data.rankingId ?? null,
      // Referrer and coarse device class only. No identifiers, no cookies.
      referrer: referrer && !referrer.includes(request.headers.get("host") ?? "") ? referrer : null,
      device: /mobile|android|iphone/i.test(userAgent)
        ? "mobile"
        : /tablet|ipad/i.test(userAgent)
          ? "tablet"
          : "desktop",
    },
  });

  return NextResponse.json({ ok: true });
}
