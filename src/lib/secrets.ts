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
  dataForSeoLogin: "dataforseo.login",
  dataForSeoPassword: "dataforseo.password",
  googleServiceAccount: "google.serviceAccount",
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];

export const SECRET_LABEL: Record<SecretKey, string> = {
  "apify.token": "Apify API token",
  "anthropic.apiKey": "Anthropic API key",
  "resend.apiKey": "Resend API key",
  "dataforseo.login": "DataForSEO login",
  "dataforseo.password": "DataForSEO password",
  "google.serviceAccount": "Google service account JSON",
};

// Each key can also arrive as an environment variable, which wins over whatever
// is stored, so a container can be handed its credentials without anyone typing
// them into a browser.
const ENV_NAME: Record<SecretKey, string> = {
  "apify.token": "APIFY_TOKEN",
  "anthropic.apiKey": "ANTHROPIC_API_KEY",
  "resend.apiKey": "RESEND_API_KEY",
  "dataforseo.login": "DATAFORSEO_LOGIN",
  "dataforseo.password": "DATAFORSEO_PASSWORD",
  "google.serviceAccount": "GOOGLE_SERVICE_ACCOUNT_JSON",
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

/* ------------------------------------------------------------ what is live */

/**
 * A service account as Google writes it.
 *
 * Parsed here rather than in google-indexing.ts so the admin can say whose
 * account is on file without importing the indexing client, and so both agree
 * on what counts as a usable key.
 */
export type ServiceAccount = { client_email: string; private_key: string };

export function readServiceAccount(raw: string | null): ServiceAccount | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    // A key pasted through a form usually arrives with its newlines escaped.
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

/**
 * Connected, or one of the three ways not to be.
 *
 * "unreadable" is the one worth having a name for: the row is there but
 * SESSION_SECRET has changed since it was written, so the value decrypts to
 * nothing. Reporting that as connected is how a credential silently stops
 * working and nobody notices for a month.
 */
export type SecretState = "connected" | "missing" | "unreadable" | "invalid";

export type SecretReport = {
  key: SecretKey;
  label: string;
  /** Kept for the callers that only ask whether something is there. */
  set: boolean;
  last4: string | null;
  fromEnv: boolean;
  state: SecretState;
  /** The words that go next to the light. */
  status: string;
  /** Anything worth naming underneath it, such as whose account this is. */
  detail: string | null;
};

/** The last real call to the Indexing API, when one has been made. */
async function lastIndexingCheck(): Promise<{ ok: boolean; status: string; detail: string } | null> {
  try {
    const row = await db.setting.findUnique({ where: { key: "google.indexingCheck" } });
    if (!row) return null;
    const parsed = JSON.parse(row.value) as { ok?: unknown; status?: unknown; detail?: unknown };
    if (typeof parsed.ok !== "boolean" || typeof parsed.status !== "string") return null;
    return { ok: parsed.ok, status: parsed.status, detail: String(parsed.detail ?? "") };
  } catch {
    return null;
  }
}

/** True only when the credential is genuinely usable. */
export const isConnected = (report: { state: SecretState }): boolean => report.state === "connected";

/**
 * What the admin is allowed to show: whether each credential works, and the
 * last four characters. The value itself is never returned.
 */
export async function secretStatus(): Promise<SecretReport[]> {
  const rows = await db.integrationSecret.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return Promise.all(
    (Object.values(SECRET_KEYS) as SecretKey[]).map(async (key) => {
      const fromEnv = Boolean(fromEnvironment(key));
      const row = byKey.get(key);
      const stored = Boolean(row);
      const label = SECRET_LABEL[key];
      const last4 = row?.last4 ?? null;
      const base = { key, label, set: fromEnv || stored, last4, fromEnv };

      if (!fromEnv && !stored) {
        return { ...base, state: "missing" as const, status: "Not connected", detail: null };
      }

      // Decrypting is the only honest test of a stored value, and it is cheap.
      const value = await getSecret(key);
      if (!value) {
        return {
          ...base,
          state: "unreadable" as const,
          status: "Stored but unreadable",
          detail: "SESSION_SECRET has changed since this was saved. Paste it again.",
        };
      }

      if (key === SECRET_KEYS.googleServiceAccount) {
        const account = readServiceAccount(value);
        if (!account) {
          return {
            ...base,
            state: "invalid" as const,
            status: "Not usable",
            detail: "That is not a service account key. Paste the whole JSON file, including client_email and private_key.",
          };
        }
        // A readable key is not a working one: access is granted in Search
        // Console, somewhere this platform cannot see. So the light reports
        // the last real call if one has been made, and says plainly that it
        // has not been when it has not.
        const check = await lastIndexingCheck();
        if (check && !check.ok) {
          return { ...base, state: "invalid" as const, status: check.status, detail: check.detail };
        }
        return {
          ...base,
          state: "connected" as const,
          status: check ? check.status : fromEnv ? "Key on the server, not yet verified" : "Key on file, not yet verified",
          detail: check
            ? check.detail
            : `${account.client_email} must be an Owner of the property in Google Search Console. Press Test on the Indexing screen to find out whether it is.`,
        };
      }

      // The DataForSEO login is an account name rather than a secret, and the
      // last four characters of an email address say nothing. Showing it whole
      // is how you confirm the right account is connected, same as the Google
      // one below it.
      if (key === SECRET_KEYS.dataForSeoLogin) {
        return {
          ...base,
          state: "connected" as const,
          status: fromEnv ? "Connected on the server" : "Connected",
          detail: value,
        };
      }

      return {
        ...base,
        state: "connected" as const,
        status: fromEnv ? "Connected on the server" : last4 ? `Connected, ending ${last4}` : "Connected",
        detail: null,
      };
    }),
  );
}
