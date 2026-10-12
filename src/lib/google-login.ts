import "server-only";
import { siteUrl } from "./stripe";

/**
 * Google sign-in for business owners, using the standard authorization-code flow.
 * It stays off until both credentials are set, so the button is only shown when it works.
 */

export const GOOGLE_STATE_COOKIE = "tbf_google_state";
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback/";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: siteUrl(GOOGLE_CALLBACK_PATH),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Trades the code for the signed-in address. Null when anything about the exchange fails. */
export async function exchangeGoogleCode(code: string): Promise<{ email: string; emailVerified: boolean } | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: siteUrl(GOOGLE_CALLBACK_PATH),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;

  const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!infoResponse.ok) return null;
  const info = (await infoResponse.json()) as { email?: string; email_verified?: boolean };
  if (!info.email) return null;
  return { email: info.email.toLowerCase(), emailVerified: info.email_verified === true };
}
