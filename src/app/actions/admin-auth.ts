"use server";

import { redirect } from "next/navigation";
import { audit, createSession, destroySession, getSession, verifyCredentials } from "@/lib/auth";

export type LoginState = { status: "idle" | "error"; message?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    // Deliberately vague: do not reveal whether the address exists.
    return { status: "error", message: "That email and password do not match an active account." };
  }

  await createSession(user);
  await audit({ userId: user.id, action: "login", entityType: "user", entityId: user.id });
  // One sign-in form, two destinations. A company owner has no business in the
  // editorial console and would only see it refuse them.
  redirect(user.role === "BUSINESS_OWNER" ? "/portal" : "/admin");
}

export async function signOut() {
  const session = await getSession();
  if (session) {
    await audit({ userId: session.id, action: "logout", entityType: "user", entityId: session.id });
  }
  await destroySession();
  redirect("/admin/login/");
}
