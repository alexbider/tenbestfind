import { NextResponse } from "next/server";
import { applyStripeEvent } from "@/lib/billing";
import { db } from "@/lib/db";
import { getStripe, webhookConfigured, type Stripe } from "@/lib/stripe";

export const runtime = "nodejs";
// The signature is computed over the exact bytes, so the body must not be
// parsed or transformed before verification.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver.
 *
 * Every event is verified against the signing secret, recorded for idempotency,
 * then applied. A redelivery of an event we already processed returns 200
 * without touching anything, which is what Stripe's at-least-once delivery
 * requires.
 */
export async function POST(request: Request) {
  if (!webhookConfigured()) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    // A bad signature is either a misconfiguration or someone probing. Refuse
    // it without recording anything.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 },
    );
  }

  const existing = await db.webhookEvent.findUnique({ where: { externalId: event.id } });
  if (existing?.status === "PROCESSED" || existing?.status === "IGNORED") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const record = existing
    ? await db.webhookEvent.update({
        where: { id: existing.id },
        data: { status: "RECEIVED", error: null },
      })
    : await db.webhookEvent.create({
        data: {
          externalId: event.id,
          type: event.type,
          status: "RECEIVED",
          payload: JSON.stringify(event.data.object).slice(0, 8000),
        },
      });

  try {
    const outcome = await applyStripeEvent(event);
    await db.webhookEvent.update({
      where: { id: record.id },
      data: {
        status: outcome === null ? "IGNORED" : "PROCESSED",
        error: outcome ?? null,
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.webhookEvent.update({
      where: { id: record.id },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
    // A 500 tells Stripe to retry, which is what we want for a transient fault.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
