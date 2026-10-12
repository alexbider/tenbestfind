import { NextResponse } from "next/server";
import { audit, sessionCookieOptions, SESSION_COOKIE, signSessionToken, type SessionUser } from "@/lib/auth";
import { PORTAL_PATH } from "@/lib/client-accounts";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/enums";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE } from "@/lib/google-login";
import { siteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Finishes Google sign-in. Only an existing, active business owner gets in: the
 * account is created when a claim is verified, so a Google login cannot create one.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request.headers.get("cookie") ?? "", GOOGLE_STATE_COOKIE);

  const fail = (reason: string) => {
    const response = NextResponse.redirect(siteUrl(`/login/?error=${reason}`));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  };

  if (!code || !state || !expected || state !== expected) return fail("google");

  const profile = await exchangeGoogleCode(code).catch(() => null);
  if (!profile || !profile.emailVerified) return fail("google");

  const user = await db.user.findUnique({ where: { email: profile.email } });
  if (!user || !user.active || user.role !== "BUSINESS_OWNER") return fail("no-account");

  const session: SessionUser = { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
  const token = await signSessionToken(session);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "login", entityType: "user", entityId: user.id, summary: "owner sign-in with Google" });

  const response = NextResponse.redirect(siteUrl(PORTAL_PATH));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
