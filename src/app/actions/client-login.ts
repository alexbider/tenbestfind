"use server";

import { redirect } from "next/navigation";
import { hashPassword, verifyCredentials } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-tokens";
import { consumeAuthToken, openSession, PORTAL_PATH, sendAccessEmail } from "@/lib/client-accounts";
import { db } from "@/lib/db";

export type AccountState = { status: "idle" | "error" | "sent"; message?: string };

const GENERIC_SENT =
  "If that address has a dashboard, the link is on its way. Check your inbox and spam folder.";

/** Email and password. Owners go to their dashboard, staff to the console. */
export async function signInWithPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: "Enter your email and password." };

  const user = await verifyCredentials(email, password);
  if (!user) {
    // Deliberately vague: do not reveal whether the address exists.
    return { status: "error", message: "That email and password do not match an active account." };
  }
  await openSession(user);
  redirect(user.role === "BUSINESS_OWNER" ? PORTAL_PATH : "/admin");
}

/** Emails a sign-in link. Says the same thing whether or not the address has an account. */
export async function requestSignInLink(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { status: "error", message: "Enter the email address you claimed with." };

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.active && user.role === "BUSINESS_OWNER") {
    try {
      await sendAccessEmail(user, "SIGN_IN");
    } catch (error) {
      console.error("[client-login] sign-in link not sent:", error instanceof Error ? error.message : error);
    }
  }
  return { status: "sent", message: GENERIC_SENT };
}

/** Forgot password: emails a link that lets the owner choose a new one. */
export async function requestPasswordLink(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { status: "error", message: "Enter the email address you claimed with." };

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.active && user.role === "BUSINESS_OWNER") {
    try {
      await sendAccessEmail(user, "SET_PASSWORD");
    } catch (error) {
      console.error("[client-login] password link not sent:", error instanceof Error ? error.message : error);
    }
  }
  return { status: "sent", message: GENERIC_SENT };
}

/** Sets the password from the emailed link, then signs the owner in. */
export async function setPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) return { status: "error", message: "The two passwords do not match." };

  const user = await consumeAuthToken(token, "SET_PASSWORD");
  if (!user) {
    return {
      status: "error",
      message: "This link has expired or was already used. Request a new one from the sign-in page.",
    };
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await openSession(user);
  redirect(PORTAL_PATH);
}

/** Spends an emailed sign-in link and opens the session. */
export async function completeSignIn(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const token = String(formData.get("token") ?? "");
  const user = await consumeAuthToken(token, "SIGN_IN");
  if (!user) {
    return {
      status: "error",
      message: "This sign-in link has expired or was already used. Request a new one from the sign-in page.",
    };
  }
  await openSession(user);
  redirect(PORTAL_PATH);
}
