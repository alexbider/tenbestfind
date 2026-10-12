import "server-only";
import { getSecret, SECRET_KEYS } from "./secrets";
import { siteUrl } from "./stripe";

/**
 * Google sign-in for business owners, using the standard authorization-code flow.
 * The client ID and secret are read from the admin's Integrations screen (or the
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables). It stays off
 * until both are set, so the button is only shown when it works.
 */

export const GOOGLE_STATE_COOKIE = "tbf_google_state";
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback/";

export type GoogleCredentials = { clientId: string; clientSecret: string };

export async function googleCredentials(): Promise<GoogleCredentials | null> {
  const [clientId, clientSecret] = await Promise.all([
    getSecret(SECRET_KEYS.googleClientId),
    getSecret(SECRET_KEYS.googleClientSecret),
  ]);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function googleConfigured(): Promise<boolean> {
  return (await googleCredentials()) !== null;
}

export function googleAuthorizeUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
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
  const credentials = await googleCredentials();
  if (!credentials) return null;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
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
