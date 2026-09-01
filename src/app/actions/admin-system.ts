"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, hashPassword, requireAdmin, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { stringify } from "@/lib/json";

export type ActionState = { status: "idle" | "ok" | "error"; message?: string; secret?: string };

/* -------------------------------------------------------------- settings */

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const entries = [...formData.entries()].filter(([key]) => key.startsWith("setting:"));

  for (const [field, raw] of entries) {
    const key = field.replace("setting:", "");
    const existing = await db.setting.findUnique({ where: { key } });
    if (!existing) continue;

    // Preserve the stored type: numbers stay numbers, booleans stay booleans.
    const current = JSON.parse(existing.value) as unknown;
    let value: unknown = String(raw);
    if (typeof current === "number") value = Number(raw);
    if (typeof current === "boolean") value = raw === "on" || raw === "true";

    await db.setting.update({ where: { key }, data: { value: JSON.stringify(value) } });
  }

  // Unchecked boxes are absent from the payload, so clear the booleans that
  // were rendered but not submitted.
  const submitted = new Set(entries.map(([key]) => key.replace("setting:", "")));
  const rendered = String(formData.get("renderedKeys") ?? "")
    .split(",")
    .filter(Boolean);
  for (const key of rendered) {
    if (submitted.has(key)) continue;
    const existing = await db.setting.findUnique({ where: { key } });
    if (!existing) continue;
    if (typeof JSON.parse(existing.value) === "boolean") {
      await db.setting.update({ where: { key }, data: { value: "false" } });
    }
  }

  await audit({ userId: user.id, action: "update", entityType: "settings", summary: `${entries.length} settings saved` });
  revalidatePath("/admin/settings");
  return { status: "ok", message: "Settings saved." };
}

/* ----------------------------------------------------------------- users */

const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().trim().email("Enter a valid email address"),
  name: z.string().trim().min(2, "Name is required").max(120),
  role: z.enum(["ADMIN", "EDITOR", "BUSINESS_OWNER"]),
  password: z.string().optional(),
  active: z.string().optional(),
});

export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the fields." };
  }
  const data = parsed.data;

  if (!data.id && (!data.password || data.password.length < 10)) {
    return { status: "error", message: "New accounts need a password of at least 10 characters." };
  }
  if (data.password && data.password.length > 0 && data.password.length < 10) {
    return { status: "error", message: "Passwords must be at least 10 characters." };
  }

  const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing && existing.id !== data.id) {
    return { status: "error", message: "Another account already uses that email." };
  }

  if (data.id) {
    // An admin cannot demote or deactivate themselves out of the console.
    if (data.id === admin.id && (data.role !== "ADMIN" || data.active !== "on")) {
      return { status: "error", message: "You cannot remove your own admin access." };
    }
    await db.user.update({
      where: { id: data.id },
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        active: data.active === "on",
        ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
      },
    });
  } else {
    await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        active: data.active === "on",
        passwordHash: await hashPassword(data.password!),
      },
    });
  }

  await audit({
    userId: admin.id,
    action: data.id ? "update" : "create",
    entityType: "user",
    entityId: data.id,
    summary: `${data.name} (${data.role.toLowerCase()})`,
  });
  revalidatePath("/admin/users");
  return { status: "ok", message: data.id ? "Account updated." : "Account created." };
}

/* ------------------------------------------------------- MCP connectors */

const connectorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the connection").max(120),
  url: z.string().trim().url("Enter the server URL"),
  transport: z.enum(["http", "sse", "stdio"]),
  authType: z.enum(["none", "bearer", "oauth", "header"]),
  token: z.string().optional(),
  headerName: z.string().max(80).optional(),
  scopes: z.string().optional(),
  enabled: z.string().optional(),
});

/**
 * Stores the connection record for an external AI tool. The token is hashed;
 * only the last four characters are ever shown again.
 */
export async function saveConnector(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = connectorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the fields." };
  }
  const data = parsed.data;

  const token = data.token?.trim();
  const tokenFields = token
    ? {
        tokenHash: createHash("sha256").update(token).digest("hex"),
        tokenLast4: token.slice(-4),
      }
    : {};

  const payload = {
    name: data.name,
    url: data.url,
    transport: data.transport,
    authType: data.authType,
    headerName: data.headerName || null,
    scopes: stringify(
      (data.scopes ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
    enabled: data.enabled === "on",
    ...tokenFields,
  };

  if (data.id) {
    await db.mcpConnector.update({ where: { id: data.id }, data: payload });
  } else {
    await db.mcpConnector.create({ data: payload });
  }

  await audit({
    userId: admin.id,
    action: data.id ? "update" : "create",
    entityType: "connector",
    entityId: data.id,
    summary: `${data.name} (${data.enabled === "on" ? "enabled" : "disabled"})`,
  });
  revalidatePath("/admin/integrations");
  return { status: "ok", message: "Connection saved." };
}

export async function deleteConnector(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const connector = await db.mcpConnector.findUnique({ where: { id } });
  if (!connector) return;
  await db.mcpConnector.delete({ where: { id } });
  await audit({ userId: admin.id, action: "delete", entityType: "connector", entityId: id, summary: connector.name });
  revalidatePath("/admin/integrations");
}

/**
 * Probes the endpoint with an MCP initialize call and records the outcome.
 * A failure is stored rather than thrown so the UI can show what went wrong.
 */
export async function testConnector(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const connector = await db.mcpConnector.findUnique({ where: { id } });
  if (!connector) return;

  try {
    const response = await fetch(connector.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "TenBestFind admin", version: "1.0.0" },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    await db.mcpConnector.update({
      where: { id },
      data: {
        lastConnectedAt: new Date(),
        lastStatus: response.ok ? "ok" : "error",
        lastError: response.ok ? null : `HTTP ${response.status}`,
      },
    });
  } catch (error) {
    await db.mcpConnector.update({
      where: { id },
      data: {
        lastConnectedAt: new Date(),
        lastStatus: "error",
        lastError: error instanceof Error ? error.message.slice(0, 200) : "Connection failed",
      },
    });
  }

  revalidatePath("/admin/integrations");
}

/* --------------------------------------------------------------- API keys */

export async function createApiKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { status: "error", message: "Name the key so you know what to revoke later." };

  const scopes = String(formData.get("scopes") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const secret = `tbf_${randomBytes(24).toString("hex")}`;
  await db.apiKey.create({
    data: {
      name,
      keyHash: createHash("sha256").update(secret).digest("hex"),
      keyLast4: secret.slice(-4),
      scopes: stringify(scopes),
    },
  });

  await audit({ userId: admin.id, action: "create", entityType: "apiKey", summary: name });
  revalidatePath("/admin/integrations");
  return {
    status: "ok",
    message: "Key created. Copy it now; it is stored hashed and cannot be shown again.",
    secret,
  };
}

export async function revokeApiKey(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({ userId: admin.id, action: "revoke", entityType: "apiKey", entityId: id });
  revalidatePath("/admin/integrations");
}

/* -------------------------------------------------------------- redirects */

export async function saveRedirect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff();
  const source = String(formData.get("source") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const code = Number(formData.get("code") ?? 301);

  if (!source.startsWith("/") || !target.startsWith("/")) {
    return { status: "error", message: "Both paths must start with a slash." };
  }
  if (source === target) return { status: "error", message: "A redirect cannot point at itself." };

  await db.redirect.upsert({
    where: { source },
    create: { source, target, code },
    update: { target, code, enabled: true },
  });

  revalidatePath("/admin/seo");
  return { status: "ok", message: "Redirect saved." };
}

export async function deleteRedirect(formData: FormData) {
  await requireStaff();
  await db.redirect.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/seo");
}
