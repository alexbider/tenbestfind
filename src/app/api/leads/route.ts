import { NextResponse } from "next/server";
import { z } from "zod";
import { createLead, hashIp, recentFrom, URGENCIES } from "@/lib/leads";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// One machine sending more than this in an hour is a script, not a street full
// of people who all need a plumber.
const HOURLY_LIMIT = 12;

const schema = z.object({
  businessId: z.string().min(1).max(40),
  name: z.string().trim().min(2, "Tell them your name.").max(120),
  email: z.string().trim().email("That email address does not look right.").max(200),
  phone: z.string().trim().max(40).optional(),
  postalCode: z.string().trim().max(20).optional(),
  jobType: z.string().trim().max(120).optional(),
  message: z.string().trim().min(15, "A sentence or two about the job helps them quote.").max(2000),
  urgency: z.enum(URGENCIES),
  path: z.string().max(300).optional(),
  source: z.enum(["PROFILE", "RANKING", "CITY", "SEARCH"]).optional(),
  // Never filled in by a person. A bot fills every field it finds.
  company: z.string().max(200).optional(),
  // Milliseconds the form was open. A submission faster than a human could type
  // did not come from a human.
  elapsed: z.number().optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Both traps answer the same way a success does. A bot that can tell the
  // difference learns how to get past the trap.
  if (data.company && data.company.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }
  if (typeof data.elapsed === "number" && data.elapsed < 2500) {
    return NextResponse.json({ ok: true });
  }

  const business = await db.business.findUnique({
    where: { id: data.businessId },
    select: { id: true, status: true },
  });
  if (!business || business.status !== "PUBLISHED") {
    return NextResponse.json({ ok: false, error: "That company is not taking enquiries." }, { status: 404 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ipHash = hashIp(forwarded ? forwarded.split(",")[0].trim() : null);
  if ((await recentFrom(ipHash)) >= HOURLY_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "That is a lot of enquiries in one hour. Try again later." },
      { status: 429 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer");

  const result = await createLead({
    businessId: business.id,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    postalCode: data.postalCode || null,
    jobType: data.jobType || null,
    message: data.message,
    urgency: data.urgency,
    source: data.source ?? "PROFILE",
    path: data.path ?? null,
    referrer: referrer && !referrer.includes(request.headers.get("host") ?? "") ? referrer : null,
    device: /mobile|android|iphone/i.test(userAgent)
      ? "mobile"
      : /tablet|ipad/i.test(userAgent)
        ? "tablet"
        : "desktop",
    ipHash,
  });

  // Whether the email reached the company is our problem, not the visitor's.
  // The enquiry is stored either way and the failure is on the admin screen.
  return NextResponse.json({ ok: true, id: result.id });
}
