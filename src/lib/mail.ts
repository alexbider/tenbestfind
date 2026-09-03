import { getSecret } from "./secrets";
import { db } from "./db";
import { parseJson } from "./json";

// Outbound email goes through Resend's HTTP API. There is no SDK here on
// purpose: one POST with a JSON body is the whole integration, and a dependency
// that wraps it would be more code to keep current than the request it replaces.

const API = "https://api.resend.com/emails";

export class MailError extends Error {}

/** A failure a retry will not fix: a bad key, an unverified sending domain. */
export class MailPermanentError extends MailError {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
  }
}

export type Message = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * The address mail is sent from. It has to be on a domain verified with Resend,
 * so it is a setting rather than a constant: the same code runs on a staging
 * domain and a live one.
 */
export async function senderAddress(): Promise<string> {
  const row = await db.setting.findUnique({ where: { key: "mail.from" } });
  const stored = row ? parseJson<string>(row.value, "") : "";
  return (
    process.env.MAIL_FROM?.trim() ||
    (typeof stored === "string" && stored.trim()) ||
    "TenBestFind <leads@tenbestfind.com>"
  );
}

export async function mailConfigured(): Promise<boolean> {
  return Boolean(await getSecret("resend.apiKey"));
}

/**
 * Sends one message. Throws rather than swallowing, so the caller decides
 * whether a failed send should fail the whole operation; the lead form, for
 * one, keeps the lead and records the error against it.
 */
export async function sendMail(message: Message): Promise<{ id: string }> {
  const key = await getSecret("resend.apiKey");
  if (!key) {
    throw new MailPermanentError(
      "No Resend API key is set.",
      "Add one under Admin, Integrations, then try again.",
    );
  }

  const response = await fetch(API, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: await senderAddress(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new MailPermanentError(
        "Resend rejected the API key.",
        "Check the Resend API key under Admin, Integrations.",
      );
    }
    if (response.status === 422) {
      throw new MailPermanentError(
        "Resend refused the message.",
        `Usually the sending domain is not verified, or the from address is not on it. ${body.slice(0, 200)}`,
      );
    }
    throw new MailError(`Resend returned ${response.status}. ${body.slice(0, 300)}`);
  }

  const json = (await response.json()) as { id?: string };
  return { id: json.id ?? "" };
}

/* ------------------------------------------------------------------ layout */

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Everything interpolated into an email body goes through this first. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (character) => escapeMap[character]);
}

/**
 * A plain, single-column HTML wrapper. Inline styles and a table, because that
 * is still what survives Outlook and Gmail's stripping.
 */
export function emailLayout(input: { heading: string; body: string; footer?: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16202e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden;">
<tr><td style="padding:26px 30px 6px;">
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.35;font-weight:700;color:#16202e;">${esc(input.heading)}</h1>
</td></tr>
<tr><td style="padding:0 30px 26px;font-size:15px;line-height:1.65;color:#3d4a5c;">
${input.body}
</td></tr>
</table>
${input.footer ? `<p style="max-width:560px;margin:16px auto 0;font-size:12.5px;line-height:1.6;color:#7b8798;text-align:center;">${input.footer}</p>` : ""}
</td></tr>
</table>
</body></html>`;
}
