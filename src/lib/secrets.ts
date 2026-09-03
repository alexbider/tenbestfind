import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { db } from "./db";

// Outbound API keys have to be usable, so they cannot be hashed the way the
// MCP connector tokens are. They are encrypted instead, with a key derived from
// SESSION_SECRET, so a copy of the database on its own does not hand them over.
// Rotating SESSION_SECRET invalidates every stored key, which is the intended
// behaviour: they are re-entered in the admin.

export const SECRET_KEYS = {
  apify: "apify.token",
  anthropic: "anthropic.apiKey",
  resend: "resend.apiKey",
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];

export const SECRET_LABEL: Record<SecretKey, string> = {
  "apify.token": "Apify API token",
  "anthropic.apiKey": "Anthropic API key",
  "resend.apiKey": "Resend API key",
};

// Each key can also arrive as an environment variable, which wins over whatever
// is stored, so a container can be handed its credentials without anyone typing
// them into a browser.
const ENV_NAME: Record<SecretKey, string> = {
  "apify.token": "APIFY_TOKEN",
  "anthropic.apiKey": "ANTHROPIC_API_KEY",
  "resend.apiKey": "RESEND_API_KEY",
};

const fromEnvironment = (key: SecretKey): string | undefined =>
  process.env[ENV_NAME[key]]?.trim() || undefined;

function encryptionKey(): Buffer {
  const source = process.env.SESSION_SECRET;
  if (!source) throw new Error("SESSION_SECRET is not set, so credentials cannot be encrypted.");
  return Buffer.from(hkdfSync("sha256", Buffer.from(source), Buffer.alloc(0), Buffer.from("tbf-secrets"), 32));
}

export async function putSecret(key: SecretKey, value: string): Promise<void> {
  const plain = value.trim();
  if (!plain) {
    await db.integrationSecret.deleteMany({ where: { key } });
    return;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const packed = [iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");

  await db.integrationSecret.upsert({
    where: { key },
    create: { key, cipher: packed, last4: plain.slice(-4), label: SECRET_LABEL[key] },
    update: { cipher: packed, last4: plain.slice(-4), label: SECRET_LABEL[key] },
  });
}

/**
 * An environment variable wins over the stored value, so a key can be injected
 * at the container level without anyone typing it into a browser.
 */
export async function getSecret(key: SecretKey): Promise<string | null> {
  const fromEnv = fromEnvironment(key);
  if (fromEnv) return fromEnv;

  const row = await db.integrationSecret.findUnique({ where: { key } });
  if (!row) return null;

  try {
    const [iv, tag, body] = row.cipher.split(":");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong SESSION_SECRET, or a truncated row. Treat it as missing rather than
    // throwing: the admin then shows it as unset and it can be re-entered.
    return null;
  }
}

/** What the admin is allowed to show: presence and the last four characters. */
export async function secretStatus(): Promise<
  { key: SecretKey; label: string; set: boolean; last4: string | null; fromEnv: boolean }[]
> {
  const rows = await db.integrationSecret.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return (Object.values(SECRET_KEYS) as SecretKey[]).map((key) => {
    const fromEnv = Boolean(fromEnvironment(key));
    const row = byKey.get(key);
    return {
      key,
      label: SECRET_LABEL[key],
      set: fromEnv || Boolean(row),
      last4: row?.last4 ?? null,
      fromEnv,
    };
  });
}
