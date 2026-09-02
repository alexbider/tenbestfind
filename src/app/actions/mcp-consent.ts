"use server";

import { redirect } from "next/navigation";
import { audit, createSession, getSession, verifyCredentials } from "@/lib/auth";
import { clientRedirects, issueCode, loadClient, narrowScope } from "@/lib/oauth";
import { db } from "@/lib/db";

export type ConsentState = { status: "idle" | "error"; message?: string };

type Params = {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  resource: string;
};

function read(formData: FormData): Params {
  return {
    clientId: String(formData.get("client_id") ?? ""),
    redirectUri: String(formData.get("redirect_uri") ?? ""),
    state: String(formData.get("state") ?? ""),
    scope: String(formData.get("scope") ?? ""),
    codeChallenge: String(formData.get("code_challenge") ?? ""),
    resource: String(formData.get("resource") ?? ""),
  };
}

/** Rebuilds the callback with either the code or the error, plus the state. */
function callback(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Signing in from the consent screen. It returns to the same authorization
 * request rather than to the admin, so the flow is not lost.
 */
export async function consentSignIn(_prev: ConsentState, formData: FormData): Promise<ConsentState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/connect/");

  if (!email || !password) return { status: "error", message: "Enter your email and password." };

  const user = await verifyCredentials(email, password);
  if (!user) return { status: "error", message: "That email and password do not match an active account." };
  if (user.role !== "ADMIN" && user.role !== "EDITOR") {
    return { status: "error", message: "This connection is for staff accounts." };
  }

  await createSession(user);
  await audit({ userId: user.id, action: "login", entityType: "user", entityId: user.id, summary: "via connector consent" });

  // Only ever back to a path on this site, never to a URL from the query.
  redirect(next.startsWith("/") ? next : "/connect/");
}

export async function approveConnection(formData: FormData) {
  const session = await getSession();
  const params = read(formData);

  const client = await loadClient(params.clientId);
  if (!client) redirect("/connect/?error=unknown_client");
  if (!clientRedirects(client).includes(params.redirectUri)) redirect("/connect/?error=bad_redirect");

  if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
    redirect(callback(params.redirectUri, { error: "access_denied", state: params.state }));
  }

  const scope = narrowScope(params.scope, client.scope);
  const code = await issueCode({
    clientId: client.id,
    userId: session.id,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    scope,
    resource: params.resource || null,
  });

  await db.oAuthClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } });
  await audit({
    userId: session.id,
    action: "create",
    entityType: "oauthGrant",
    entityId: client.id,
    summary: `${client.name} approved for ${scope}`,
  });

  redirect(callback(params.redirectUri, { code, state: params.state }));
}

export async function denyConnection(formData: FormData) {
  const params = read(formData);
  const client = await loadClient(params.clientId);
  if (!client || !clientRedirects(client).includes(params.redirectUri)) redirect("/connect/?error=bad_redirect");
  redirect(callback(params.redirectUri, { error: "access_denied", state: params.state }));
}
