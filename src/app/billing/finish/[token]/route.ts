import { NextResponse } from "next/server";
import { readFinishSignupToken, resumeSignupCheckout } from "@/lib/finish-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The link in the finish-signup email. Each visit opens a fresh Stripe
 * Checkout page for the saved signup, because Checkout pages expire after a
 * day and an email can sit unread for longer.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscriptionId = readFinishSignupToken(decodeURIComponent(token));
  if (!subscriptionId) return notice("This link is not valid", "Reply to the email it came in and we will send a new one.", 404);

  try {
    const result = await resumeSignupCheckout(subscriptionId);
    if ("url" in result) return NextResponse.redirect(result.url, 303);
    return result.done
      ? notice("You are all set", "This signup has already been completed. There is nothing more to do.", 200)
      : notice("We could not open the payment page", `${result.error} Reply to the email this link came in and we will sort it out.`, 409);
  } catch (error) {
    console.error("[finish-signup] checkout failed:", error instanceof Error ? error.message : error);
    return notice("We could not open the payment page", "Nothing was charged. Please try the link again in a minute, or reply to the email it came in.", 502);
  }
}

function notice(heading: string, body: string, status: number) {
  const esc = (value: string) => value.replace(/[&<>"]/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(heading)} | TenBestFind</title></head>
<body style="margin:0;background:#F4F6F9;font-family:Inter,system-ui,sans-serif;color:#1B2433">
<main style="max-width:520px;margin:12vh auto;padding:32px 24px;background:#fff;border-radius:14px;border:1px solid #E3E8EF">
<h1 style="margin:0 0 12px;font-size:22px">${esc(heading)}</h1>
<p style="margin:0 0 20px;line-height:1.6">${esc(body)}</p>
<a href="/" style="color:#2D74D7;font-weight:600">Back to TenBestFind</a>
</main></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
