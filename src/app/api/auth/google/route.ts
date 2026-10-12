import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleAuthorizeUrl, googleCredentials, GOOGLE_STATE_COOKIE } from "@/lib/google-login";
import { siteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Starts Google sign-in. The state value guards the callback against forged requests. */
export async function GET() {
  const credentials = await googleCredentials();
  if (!credentials) {
    return NextResponse.redirect(siteUrl("/login/?error=google"));
  }
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(googleAuthorizeUrl(state, credentials.clientId));
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
