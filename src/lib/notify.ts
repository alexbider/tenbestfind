import "server-only";
import { db } from "./db";
import { parseJson } from "./json";
import { emailLayout, esc, sendMail, type Message } from "./mail";
import { siteUrl } from "./stripe";

/**
 * The emails TenBestFind sends about the business side of the site: claims,
 * listing submissions, publishing, failed payments, and the alerts the team
 * gets for each. Stripe sends its own receipts, so none of these repeat one.
 *
 * Every send here is best effort. A form submission or a webhook never fails
 * because an email could not go out; the failure is logged and the work stands.
 */

export const TEAM_SETTING = "mail.team";
const DEFAULT_TEAM = "hello@tenbestfind.com";

/** Where team alerts go. A setting, so it can change without a deploy. */
export async function teamInbox(): Promise<string> {
  const env = process.env.MAIL_TEAM?.trim();
  if (env) return env;
  const row = await db.setting.findUnique({ where: { key: TEAM_SETTING } });
  const stored = row ? parseJson<string>(row.value, "") : "";
  return typeof stored === "string" && stored.trim() ? stored.trim() : DEFAULT_TEAM;
}

async function deliver(message: Message, what: string): Promise<boolean> {
  try {
    await sendMail(message);
    return true;
  } catch (error) {
    console.error(`[notify] ${what} not sent:`, error instanceof Error ? error.message : error);
    return false;
  }
}

const p = (text: string) => `<p style="margin:0 0 14px;">${text}</p>`;

const button = (href: string, label: string) =>
  `<p style="margin:22px 0 6px;"><a href="${esc(href)}" style="display:inline-block;background:#2D74D7;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;">${esc(label)}</a></p>`;

const rows = (items: [string, string | null | undefined][]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 16px;border-collapse:collapse;">${items
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #eef1f5;width:38%;color:#7b8798;font-size:13.5px;vertical-align:top;">${esc(label)}</td><td style="padding:7px 0;border-bottom:1px solid #eef1f5;font-size:14.5px;color:#16202e;">${esc(String(value))}</td></tr>`,
    )
    .join("")}</table>`;

const textRows = (items: [string, string | null | undefined][]) =>
  items
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

const FOOTER =
  "TenBestFind publishes researched shortlists of local service companies. A subscription buys profile management and never a ranking position.";

/* ------------------------------------------------------------ to businesses */

export async function sendClaimReceived(input: {
  to: string;
  ownerName: string;
  businessName: string;
  reference: string;
  method: string;
  code?: string;
  verifyUrl?: string;
}) {
  const first = input.ownerName.split(" ")[0] || input.ownerName;
  const codeBlock = input.code
    ? `${p("Here is your verification code. Enter it on the claim page to confirm you control this address.")}
<p style="margin:6px 0 8px;font-size:30px;letter-spacing:8px;font-weight:700;color:#16202e;font-family:ui-monospace,Menlo,Consolas,monospace;">${esc(input.code)}</p>
${p('<span style="font-size:13.5px;color:#7b8798;">It works for 30 minutes. If it runs out you can ask for a new one on the same page.</span>')}
${input.verifyUrl ? button(input.verifyUrl, "Enter the code") : ""}`
    : p(
        "An editor will be in touch about verification using the method you picked. That usually happens within two business days.",
      );

  const body = `${p(`Hi ${esc(first)},`)}
${p(`We have your claim for <strong>${esc(input.businessName)}</strong>.`)}
${codeBlock}
${rows([
  ["Reference", input.reference],
  ["Verification", input.method],
])}
${p("If the payment goes through but we cannot confirm ownership, the charge is refunded in full.")}`;

  const text = [
    `Hi ${first},`,
    `We have your claim for ${input.businessName}.`,
    input.code
      ? `Your verification code is ${input.code}. It works for 30 minutes.${input.verifyUrl ? ` Enter it here: ${input.verifyUrl}` : ""}`
      : "An editor will be in touch about verification, usually within two business days.",
    textRows([
      ["Reference", input.reference],
      ["Verification", input.method],
    ]),
    "If the payment goes through but we cannot confirm ownership, the charge is refunded in full.",
  ].join("\n\n");

  return deliver(
    {
      to: input.to,
      subject: input.code
        ? `${input.code} is your TenBestFind verification code`
        : `We have your claim for ${input.businessName}`,
      html: emailLayout({ heading: input.code ? "Confirm your claim" : "Claim received", body, footer: FOOTER }),
      text,
    },
    "claim received",
  );
}

export async function sendListingSubmitted(input: {
  to: string;
  contactName: string;
  businessName: string;
  reference: string;
}) {
  const first = input.contactName.split(" ")[0] || input.contactName;
  const body = `${p(`Hi ${esc(first)},`)}
${p(`Thanks for submitting <strong>${esc(input.businessName)}</strong>. An editor will review it against the same minimum standards as every other listing: a verifiable presence in the market, current insurance, and licensing where it is required.`)}
${rows([
  ["Reference", input.reference],
  ["Status", "In editorial review"],
  ["Due today", "$0.00"],
])}
${p("Your card is held, not charged. The first charge happens on the day the listing publishes, and never if it is declined. We will email you either way.")}`;

  return deliver(
    {
      to: input.to,
      subject: `We have your listing for ${input.businessName}`,
      html: emailLayout({ heading: "Listing submitted", body, footer: FOOTER }),
      text: [
        `Hi ${first},`,
        `Thanks for submitting ${input.businessName}. An editor will review it against the same minimum standards as every other listing.`,
        textRows([
          ["Reference", input.reference],
          ["Status", "In editorial review"],
          ["Due today", "$0.00"],
        ]),
        "Your card is held, not charged. The first charge happens on the day the listing publishes, and never if it is declined.",
      ].join("\n\n"),
    },
    "listing submitted",
  );
}

export async function sendListingPublished(input: {
  to: string;
  contactName?: string | null;
  businessName: string;
  url: string;
}) {
  const first = input.contactName?.split(" ")[0] || "there";
  const body = `${p(`Hi ${esc(first)},`)}
${p(`<strong>${esc(input.businessName)}</strong> is now live on TenBestFind.`)}
${p("This is also the day your subscription starts, so Stripe will send the first receipt separately.")}
${button(input.url, "See your listing")}`;

  return deliver(
    {
      to: input.to,
      subject: `${input.businessName} is live on TenBestFind`,
      html: emailLayout({ heading: "Your listing is live", body, footer: FOOTER }),
      text: [
        `Hi ${first},`,
        `${input.businessName} is now live on TenBestFind: ${input.url}`,
        "This is also the day your subscription starts, so Stripe will send the first receipt separately.",
      ].join("\n\n"),
    },
    "listing published",
  );
}

export async function sendPaymentFailed(input: {
  to: string;
  businessName: string;
  planName: string;
  amount: string;
  payUrl?: string | null;
}) {
  const body = `${p(`We could not take the payment for <strong>${esc(input.businessName)}</strong>.`)}
${rows([
  ["Plan", input.planName],
  ["Amount", input.amount],
])}
${p("Stripe will try the card again over the next few days. Updating the card now avoids any interruption to the listing.")}
${input.payUrl ? button(input.payUrl, "Update payment") : ""}`;

  return deliver(
    {
      to: input.to,
      subject: `Payment failed for ${input.businessName}`,
      html: emailLayout({ heading: "Your payment did not go through", body, footer: FOOTER }),
      text: [
        `We could not take the payment for ${input.businessName}.`,
        textRows([
          ["Plan", input.planName],
          ["Amount", input.amount],
        ]),
        "Stripe will try the card again over the next few days. Updating the card now avoids any interruption to the listing.",
        input.payUrl ? `Update payment: ${input.payUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    "payment failed",
  );
}

/* ----------------------------------------------------------------- to team */

async function alertTeam(subject: string, heading: string, items: [string, string | null | undefined][], adminPath: string, replyTo?: string) {
  const link = siteUrl(adminPath);
  return deliver(
    {
      to: await teamInbox(),
      subject,
      html: emailLayout({ heading, body: `${rows(items)}${button(link, "Open in admin")}` }),
      text: `${textRows(items)}\n\n${link}`,
      replyTo,
    },
    `team alert: ${heading}`,
  );
}

export function alertNewClaim(input: {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  role?: string | null;
  method: string;
  plans: string;
  claimId: string;
}) {
  return alertTeam(
    `New claim: ${input.businessName}`,
    "New ownership claim",
    [
      ["Business", input.businessName],
      ["Requester", input.ownerName],
      ["Email", input.ownerEmail],
      ["Role", input.role],
      ["Verification", input.method],
      ["Plans", input.plans],
    ],
    `/admin/claims#${input.claimId}`,
    input.ownerEmail,
  );
}

export function alertClaimEmailVerified(input: { businessName: string; ownerEmail: string; claimId: string; domainMatches: boolean | null }) {
  return alertTeam(
    `Claim email verified: ${input.businessName}`,
    "Claim email verified",
    [
      ["Business", input.businessName],
      ["Verified address", input.ownerEmail],
      [
        "Matches the website domain",
        input.domainMatches === null ? "No website on file" : input.domainMatches ? "Yes" : "No, check by hand",
      ],
    ],
    `/admin/claims#${input.claimId}`,
  );
}

export function alertNewListing(input: {
  businessName: string;
  businessId: string;
  contactName: string;
  contactEmail: string;
  category: string;
  website?: string | null;
}) {
  return alertTeam(
    `New listing submitted: ${input.businessName}`,
    "New listing submission",
    [
      ["Business", input.businessName],
      ["Category", input.category],
      ["Contact", input.contactName],
      ["Email", input.contactEmail],
      ["Website", input.website],
    ],
    `/admin/businesses/${input.businessId}`,
    input.contactEmail,
  );
}

export function alertAdvertisingQuote(input: { company: string; email: string; markets: string; message?: string | null }) {
  return alertTeam(
    `Advertising quote request: ${input.company}`,
    "New advertising quote request",
    [
      ["Company", input.company],
      ["Email", input.email],
      ["Markets", input.markets],
      ["Message", input.message],
    ],
    "/admin/submissions",
    input.email,
  );
}
