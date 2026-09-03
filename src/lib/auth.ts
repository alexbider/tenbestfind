import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import type { UserRole } from "./enums";

const COOKIE = "tbf_session";
const MAX_AGE = 60 * 60 * 8; // eight hours

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = { id: string; email: string; name: string; role: UserRole };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Reads and verifies the session cookie. Returns null when signed out. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
});

/** Gate for every admin route. Redirects to the login page when signed out. */
export async function requireStaff(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
    redirect("/admin/login/");
  }
  return session;
}

/**
 * Gate for the company owner portal.
 *
 * Staff are let through so an editor can see exactly what an owner sees while
 * helping them, but only for a company they name; an owner is limited to the
 * companies actually attached to their account.
 */
export async function requireOwner(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/admin/login/");
  return session;
}

/** The companies this session may act for. Empty means the portal has nothing to show. */
export async function ownedBusinesses(user: SessionUser) {
  if (user.role === "ADMIN" || user.role === "EDITOR") {
    return db.business.findMany({
      where: { claimed: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, status: true },
    });
  }
  return db.business.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

/** Throws the owner out of a company that is not theirs. */
export async function requireOwnedBusiness(user: SessionUser, businessId: string) {
  const business = await db.business.findFirst({
    where: {
      id: businessId,
      ...(user.role === "BUSINESS_OWNER" ? { ownerId: user.id } : {}),
    },
  });
  if (!business) redirect("/portal");
  return business;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login/");
  return session;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

/** Records who changed what, so the audit log is not guesswork. */
export async function audit(input: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  diff?: unknown;
}) {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      diff: input.diff ? JSON.stringify(input.diff) : null,
    },
  });
}
