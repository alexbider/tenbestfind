import { getSecret } from "./secrets";
import { db } from "./db";
import { parseJson } from "./json";
import { recordProviderRequest, classifyHttpStatus } from "./provider-usage";

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
    "TenBestFind <hello@tenbestfind.com>"
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

  // The postal address is a setting so it can be filled in without a deploy;
  // anti-spam law in the US and Canada wants it on promotional mail.
  const address = await postalAddress();
  const html = message.html.replace(ADDRESS_SLOT, address ? esc(address) : "");
  const text = `${message.text}\n\n--\nTenBestFind, independent rankings of local service companies\n${SITE}${address ? `\n${address}` : ""}`;

  const started = Date.now();
  const response = await fetch(API, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: await senderAddress(),
      to: [message.to],
      subject: message.subject,
      html,
      text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  void recordProviderRequest({
    provider: "resend",
    endpoint: "/emails",
    operation: "sendMail",
    method: "POST",
    outcome: classifyHttpStatus(response.status).outcome,
    httpStatus: response.status,
    latencyMs: Date.now() - started,
    billableUnits: response.ok ? 1 : null,
    quotaMetric: response.ok ? "emails" : null,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      // Resend answers 403 both for a bad key and for a sending domain that is
      // not verified yet, so its own message is kept to tell the two apart.
      const detail = body.slice(0, 240);
      throw new MailPermanentError(
        `Resend refused the request (${response.status}). ${detail}`,
        /domain/i.test(detail)
          ? "Verify the sending domain in Resend, or change mail.from to an address on a verified domain."
          : "Check the Resend API key under Admin, Integrations.",
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

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenbestfind.com").replace(/\/$/, "");
const ADDRESS_SLOT = "<!--tbf:address-->";

async function postalAddress(): Promise<string> {
  const row = await db.setting.findUnique({ where: { key: "mail.address" } }).catch(() => null);
  const stored = row ? parseJson<string>(row.value, "") : "";
  return (process.env.MAIL_ADDRESS?.trim() || (typeof stored === "string" ? stored.trim() : "")) ?? "";
}

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

/** The brand, as the site draws it. Kept here so every email matches. */
export const BRAND = {
  navy: "#101F3D",
  navyText: "#122F5C",
  blue: "#1E5FBF",
  blueSoft: "#EAF4FF",
  gold: "#E7B863",
  goldSoft: "#FEF6E7",
  goldInk: "#8A5F0B",
  ink: "#1A2233",
  body: "#374151",
  muted: "#6B7280",
  line: "#E2E8F0",
  wash: "#F7F9FC",
  page: "#EEF2F8",
  green: "#178054",
  greenSoft: "#EAF7F0",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif",
  mono: "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace",
} as const;

type Row = [string, string | null | undefined] | { label: string; html: string };

/**
 * The pieces every email is built from. Inline styles and tables only, because
 * that is what survives Outlook, Gmail and Apple Mail without surprises.
 */
export const ui = {
  p: (html: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.body};">${html}</p>`,

  lead: (html: string) =>
    `<p style="margin:0 0 20px;font-size:17px;line-height:1.6;color:${BRAND.ink};">${html}</p>`,

  muted: (html: string) =>
    `<p style="margin:0 0 12px;font-size:13.5px;line-height:1.6;color:${BRAND.muted};">${html}</p>`,

  button: (href: string, label: string, tone: "primary" | "quiet" = "primary") => {
    const bg = tone === "primary" ? BRAND.blue : "#FFFFFF";
    const fg = tone === "primary" ? "#FFFFFF" : BRAND.navyText;
    const border = tone === "primary" ? BRAND.blue : BRAND.line;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 24px;"><tr>
<td align="center" bgcolor="${bg}" style="border-radius:10px;background:${bg};border:1px solid ${border};">
<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${BRAND.font};font-size:15.5px;font-weight:700;line-height:1;color:${fg};text-decoration:none;border-radius:10px;">${esc(label)}&nbsp;&rarr;</a>
</td></tr></table>`;
  },

  details: (items: Row[]) => {
    const rows = items
      .map((item) => (Array.isArray(item) ? (item[1] ? { label: item[0], html: esc(String(item[1])) } : null) : item))
      .filter((row): row is { label: string; html: string } => Boolean(row));
    if (rows.length === 0) return "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;border:1px solid ${BRAND.line};border-radius:12px;background:${BRAND.wash};border-collapse:separate;">
${rows
  .map(
    (row, index) => `<tr>
<td style="padding:12px 16px;${index ? `border-top:1px solid ${BRAND.line};` : ""}width:36%;vertical-align:top;font-size:13px;line-height:1.5;color:${BRAND.muted};">${esc(row.label)}</td>
<td style="padding:12px 16px 12px 0;${index ? `border-top:1px solid ${BRAND.line};` : ""}vertical-align:top;font-size:15px;line-height:1.5;color:${BRAND.ink};font-weight:600;">${row.html}</td>
</tr>`,
  )
  .join("\n")}
</table>`;
  },

  /** A value the reader is not allowed to see yet. */
  hidden: () =>
    `<span style="display:inline-block;padding:2px 10px;border-radius:6px;background:${BRAND.line};color:${BRAND.muted};font-size:12.5px;font-weight:600;letter-spacing:0.06em;">HIDDEN</span>`,

  callout: (title: string, html: string, tone: "info" | "gold" | "success" = "info") => {
    const palette = {
      info: { bg: BRAND.blueSoft, edge: BRAND.blue, ink: BRAND.navyText },
      gold: { bg: BRAND.goldSoft, edge: BRAND.gold, ink: BRAND.goldInk },
      success: { bg: BRAND.greenSoft, edge: BRAND.green, ink: BRAND.green },
    }[tone];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr>
<td style="background:${palette.bg};border-left:4px solid ${palette.edge};border-radius:10px;padding:16px 18px;">
<p style="margin:0 0 6px;font-size:14.5px;font-weight:700;color:${palette.ink};">${esc(title)}</p>
<p style="margin:0;font-size:14.5px;line-height:1.6;color:${BRAND.body};">${html}</p>
</td></tr></table>`;
  },

  code: (code: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 14px;"><tr>
<td style="background:${BRAND.wash};border:1px dashed #CBD5E1;border-radius:12px;padding:16px 26px;font-family:${BRAND.mono};font-size:32px;font-weight:700;letter-spacing:10px;color:${BRAND.navy};">${esc(code)}</td>
</tr></table>`,

  quote: (text: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>
<td style="background:${BRAND.wash};border-left:3px solid #CBD5E1;border-radius:8px;padding:14px 18px;font-size:14.5px;line-height:1.65;color:${BRAND.body};">${esc(text).replace(/\n/g, "<br>")}</td>
</tr></table>`,
};

/**
 * The single layout every TenBestFind email uses: a navy header carrying the
 * mark, a white card, a line that says why the site can be trusted, and a
 * footer with the links people look for before they believe an email.
 */
export function emailLayout(input: {
  heading: string;
  body: string;
  /** Why this person got the email, shown under the card. Already escaped. */
  footer?: string;
  /** The grey line inbox previews show after the subject. */
  preheader?: string;
  /** A short label above the heading, such as "Quote request". */
  eyebrow?: string;
  /** Team alerts leave out the "The TenBestFind team" sign-off. */
  signoff?: boolean;
}): string {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.page};">${esc(input.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>`
    : "";
  const link = (path: string, label: string) =>
    `<a href="${SITE}${path}" target="_blank" style="color:${BRAND.muted};text-decoration:underline;">${label}</a>`;

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(input.heading)}</title>
<style>
  @media (max-width:620px){ .tbf-pad{padding-left:22px!important;padding-right:22px!important} .tbf-h1{font-size:22px!important} }
  a{color:${BRAND.blue}}
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:${BRAND.font};-webkit-font-smoothing:antialiased;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background:${BRAND.page};">
<tr><td align="center" style="padding:32px 12px 40px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

<tr><td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:16px 16px 0 0;padding:22px 32px;" class="tbf-pad">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;padding-right:12px;"><a href="${SITE}/" target="_blank"><img src="${SITE}/mark-dark.png" width="40" height="40" alt="TenBestFind" style="display:block;width:40px;height:40px;border:0;border-radius:11px;"></a></td>
<td style="vertical-align:middle;">
<a href="${SITE}/" target="_blank" style="text-decoration:none;"><span style="display:block;font-size:19px;font-weight:800;letter-spacing:-0.01em;color:#FFFFFF;line-height:1.1;">TenBestFind</span>
<span style="display:block;margin-top:3px;font-size:12px;font-weight:600;letter-spacing:0.04em;color:${BRAND.gold};line-height:1.2;">The best, verified</span></a>
</td></tr></table>
</td></tr>

<tr><td bgcolor="${BRAND.gold}" style="background:${BRAND.gold};height:3px;line-height:3px;font-size:3px;">&nbsp;</td></tr>

<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:34px 32px 10px;border-left:1px solid ${BRAND.line};border-right:1px solid ${BRAND.line};" class="tbf-pad">
${input.eyebrow ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.blue};">${esc(input.eyebrow)}</p>` : ""}
<h1 class="tbf-h1" style="margin:0 0 20px;font-size:25px;line-height:1.3;font-weight:800;letter-spacing:-0.015em;color:${BRAND.navy};">${esc(input.heading)}</h1>
<div style="font-size:16px;line-height:1.65;color:${BRAND.body};">
${input.body}
</div>
</td></tr>

<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:8px 32px 28px;border-left:1px solid ${BRAND.line};border-right:1px solid ${BRAND.line};" class="tbf-pad">
${input.signoff === false ? "" : `<p style="margin:0;font-size:14.5px;line-height:1.6;color:${BRAND.body};">The TenBestFind team</p>`}
</td></tr>

<tr><td bgcolor="${BRAND.wash}" style="background:${BRAND.wash};border:1px solid ${BRAND.line};border-radius:0 0 16px 16px;padding:18px 32px;" class="tbf-pad">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="font-size:12.5px;line-height:1.9;color:${BRAND.muted};">
${["Researched by named editors", "Re-checked on a schedule", "Rankings are never for sale"]
  .map((item) => `<span style="display:inline-block;white-space:nowrap;margin:0 9px;"><span style="color:${BRAND.green};font-weight:700;">&#10003;</span>&nbsp;${item}</span>`)
  .join("")}
</td></tr></table>
</td></tr>

<tr><td align="center" style="padding:24px 24px 0;font-size:12.5px;line-height:1.7;color:${BRAND.muted};">
<p style="margin:0 0 8px;">${link("/how-we-rank/", "How we rank")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link("/advertising-disclosure/", "Advertising disclosure")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link("/privacy/", "Privacy")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link("/contact/", "Contact")}</p>
${input.footer ? `<p style="margin:0 0 8px;">${input.footer}</p>` : ""}
<p style="margin:0;">&copy; ${new Date().getFullYear()} TenBestFind</p>
<p style="margin:4px 0 0;">${ADDRESS_SLOT}</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

/* --------------------------------------------------------- delivery log */

export type SentEmail = {
  id: string;
  to: string[];
  subject: string;
  createdAt: string;
  status: string;
};

/**
 * The most recent emails this API key sent, with Resend's latest event for
 * each (delivered, bounced, complained, delayed, opened...). This is what tells
 * a mail the site sent apart from a mail that actually arrived.
 */
export async function recentEmails(limit = 50): Promise<{ emails: SentEmail[]; error?: string }> {
  const key = await getSecret("resend.apiKey");
  if (!key) return { emails: [], error: "No Resend API key is set." };
  try {
    const response = await fetch(`${API}?limit=${Math.min(Math.max(limit, 1), 100)}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { emails: [], error: `Resend answered ${response.status}. ${body.slice(0, 200)}` };
    }
    const json = (await response.json()) as {
      data?: { id: string; to: string[] | string; subject: string; created_at: string; last_event?: string | null }[];
    };
    return {
      emails: (json.data ?? []).map((row) => ({
        id: row.id,
        to: Array.isArray(row.to) ? row.to : [row.to],
        subject: row.subject,
        createdAt: row.created_at,
        status: row.last_event ?? "queued",
      })),
    };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Could not reach Resend." };
  }
}
