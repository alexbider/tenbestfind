"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Stops a connected application and kills every session it holds. */
export async function disableClient(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const client = await db.oAuthClient.findUnique({ where: { id } });
  if (!client) return;

  await db.oAuthClient.update({ where: { id }, data: { disabledAt: new Date() } });
  await db.oAuthToken.updateMany({ where: { clientId: id, revokedAt: null }, data: { revokedAt: new Date() } });

  await audit({
    userId: user.id,
    action: "revoke",
    entityType: "oauthClient",
    entityId: id,
    summary: `${client.name} disabled and its sessions revoked`,
  });
  revalidatePath("/admin/connections");
}

export async function enableClient(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  await db.oAuthClient.update({ where: { id }, data: { disabledAt: null } });
  await audit({ userId: user.id, action: "update", entityType: "oauthClient", entityId: id, summary: "re-enabled" });
  revalidatePath("/admin/connections");
}

/** Deletes a client outright. Its tokens and codes go with it. */
export async function deleteClient(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const client = await db.oAuthClient.findUnique({ where: { id } });
  if (!client) return;
  await db.oAuthClient.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entityType: "oauthClient", entityId: id, summary: client.name });
  revalidatePath("/admin/connections");
}

/** Revokes one live session without touching the application itself. */
export async function revokeSession(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const token = await db.oAuthToken.findUnique({ where: { id }, include: { client: true, user: true } });
  if (!token || token.revokedAt) return;

  await db.oAuthToken.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({
    userId: user.id,
    action: "revoke",
    entityType: "oauthToken",
    entityId: id,
    summary: `${token.client.name} session for ${token.user.email}`,
  });
  revalidatePath("/admin/connections");
}
