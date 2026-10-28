import "server-only";
import { db } from "./db";
import { parseJson } from "./json";
import { emailLayout, esc, sendMail, ui, type Message } from "./mail";
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
const DEFAULT_TEAM = "admin@tenbestfind.com";

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

const p = ui.p;
const button = (href: string, label: string) => ui.button(href, label);
const rows = (items: [string, string | null | undefined][]) => ui.details(items);

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
    ? `${p("Enter this code on the claim page to confirm you control this address.")}
${ui.code(input.code)}
${ui.muted("It works for 30 minutes. If it runs out you can ask for a new one on the same page.")}
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
${ui.callout("Your payment is protected", "If we cannot confirm that you own the business, the charge is refunded in full.", "success")}`;

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
      html: emailLayout({ heading: input.code ? "Confirm your claim" : "Claim received", body, footer: FOOTER, eyebrow: "Claim your listing", preheader: input.code ? `Your code is ${input.code}. It works for 30 minutes.` : `We have your claim for ${input.businessName}.` }),
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
      html: emailLayout({ heading: "Listing submitted", body, footer: FOOTER, eyebrow: "Add a business", preheader: "Nothing has been charged. An editor will review it and email you either way." }),
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
      html: emailLayout({ heading: "Your listing is live", body, footer: FOOTER, eyebrow: "Published", preheader: `${input.businessName} is now live on TenBestFind.` }),
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
      html: emailLayout({ heading: "Your payment did not go through", body, footer: FOOTER, eyebrow: "Billing", preheader: "Update your card to keep the listing running without interruption." }),
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
      html: emailLayout({ heading, eyebrow: "Team alert", preheader: subject, signoff: false, body: `${rows(items)}${button(link, "Open in admin")}` }),
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

/* ------------------------------------------------------- claim decisions */

export async function sendClaimApproved(input: {
  to: string;
  ownerName: string;
  businessName: string;
  /** A one-time link: set a password for a new owner, or sign in for a returning one. */
  accessUrl: string;
  needsPassword: boolean;
}) {
  const first = input.ownerName.split(" ")[0] || "there";
  const cta = input.needsPassword ? "Create your password" : "Open your dashboard";
  const body = `${p(`Hi ${esc(first)},`)}
${ui.lead(`You now manage <strong>${esc(input.businessName)}</strong> on TenBestFind, and the profile shows as claimed.`)}
${p("Changes to hours, services, coverage, photos and contact details go live as soon as you save them. A change to the description goes to an editor first. Ranking position and the editorial summary stay with our editors.")}
${ui.callout("Three things worth doing this week", "Add at least three photos, confirm your service area, and check the phone number homeowners will call.", "gold")}
${button(input.accessUrl, cta)}
${ui.muted("The button works once. After that, sign in at tenbestfind.com/login/ with this email address.")}`;

  return deliver(
    {
      to: input.to,
      subject: `You now manage ${input.businessName} on TenBestFind`,
      html: emailLayout({ heading: "Your claim is verified", body, footer: FOOTER, eyebrow: "Welcome aboard", preheader: `You now manage ${input.businessName}. Here is how to sign in.` }),
      text: [
        `Hi ${first},`,
        `Your claim is verified. You now manage ${input.businessName} on TenBestFind.`,
        "Changes to hours, services, coverage, photos and contact details go live as soon as you save them. A change to the description goes to an editor first.",
        `${cta}: ${input.accessUrl}`,
        "The link works once. After that, sign in at https://tenbestfind.com/login/ with this email address.",
      ].join("\n\n"),
    },
    "claim approved",
  );
}

export async function sendClaimDeclined(input: {
  to: string;
  ownerName: string;
  businessName: string;
  reason?: string | null;
  refunded: boolean;
}) {
  const first = input.ownerName.split(" ")[0] || "there";
  const reason = input.reason?.trim();
  const body = `${p(`Hi ${esc(first)},`)}
${p(`We weren't able to confirm that you own or manage <strong>${esc(input.businessName)}</strong>, so the claim has been closed.${reason ? ` ${esc(reason)}` : ""}`)}
${input.refunded ? p("Anything you paid for this claim has been refunded to the card you used. It usually shows within 5 to 10 business days.") : ""}
${p("If you do run this business, reply to this email with a registration document or a recent utility bill in the company name and we will look at it again.")}`;

  return deliver(
    {
      to: input.to,
      subject: `We couldn't verify your claim on ${input.businessName}`,
      html: emailLayout({ heading: "Claim not verified", body, footer: FOOTER, eyebrow: "Claim your listing", preheader: "We could not confirm ownership. Here is what happens next." }),
      text: [
        `Hi ${first},`,
        `We weren't able to confirm that you own or manage ${input.businessName}, so the claim has been closed.${reason ? ` ${reason}` : ""}`,
        input.refunded ? "Anything you paid for this claim has been refunded to the card you used. It usually shows within 5 to 10 business days." : "",
        "If you do run this business, reply to this email with a registration document or a recent utility bill in the company name and we will look at it again.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      replyTo: await teamInbox(),
    },
    "claim declined",
  );
}

export async function sendListingDeclined(input: { to: string; contactName?: string | null; businessName: string; reason?: string | null }) {
  const first = input.contactName?.split(" ")[0] || "there";
  const reason = input.reason?.trim();
  const body = `${p(`Hi ${esc(first)},`)}
${p(`An editor reviewed <strong>${esc(input.businessName)}</strong> and we are not publishing it right now.${reason ? ` ${esc(reason)}` : ""}`)}
${p("Your card was not charged, and the hold on it has been released.")}
${p("You are welcome to submit again once the details can be checked, for example a licence number we can look up or a street address in the area you serve.")}`;

  return deliver(
    {
      to: input.to,
      subject: `About your submission for ${input.businessName}`,
      html: emailLayout({ heading: "Your submission was not published", body, footer: FOOTER, eyebrow: "Add a business", preheader: "Your card was not charged, and the hold has been released." }),
      text: [
        `Hi ${first},`,
        `An editor reviewed ${input.businessName} and we are not publishing it right now.${reason ? ` ${reason}` : ""}`,
        "Your card was not charged, and the hold on it has been released.",
      ].join("\n\n"),
      replyTo: await teamInbox(),
    },
    "listing declined",
  );
}

/* ---------------------------------------------------------------- billing */

export async function sendPlanEnded(input: { to: string; businessName: string; planName: string; profileUrl: string }) {
  const body = `${p(`Your <strong>${esc(input.planName)}</strong> plan for <strong>${esc(input.businessName)}</strong> has ended.`)}
${p("The listing stays published as an editorial profile. It is not removed, and its ranking position does not change. New quote requests are still saved for you, with the contact details held until a plan is active again.")}
${p("You can restart at any time from the dashboard.")}
${button(input.profileUrl, "See your listing")}`;

  return deliver(
    {
      to: input.to,
      subject: `Your ${input.planName} plan for ${input.businessName} has ended`,
      html: emailLayout({ heading: "Your plan has ended", body, footer: FOOTER, eyebrow: "Billing", preheader: "Your listing stays published. You can restart any time." }),
      text: [
        `Your ${input.planName} plan for ${input.businessName} has ended.`,
        "The listing stays published as an editorial profile. It is not removed, and its ranking position does not change.",
        `See your listing: ${input.profileUrl}`,
      ].join("\n\n"),
    },
    "plan ended",
  );
}

/* --------------------------------------------------------------- accounts */

export async function sendPasswordChanged(input: { to: string; name: string }) {
  const first = input.name.split(" ")[0] || "there";
  const when = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/Toronto" });
  const resetUrl = siteUrl("/login/");
  const body = `${p(`Hi ${esc(first)},`)}
${p(`The password for <strong>${esc(input.to)}</strong> was changed on ${esc(when)} (Toronto time).`)}
${p("If that was you, there is nothing to do. If it wasn't, reset it now from the sign-in page and reply to this email so we can lock the account.")}
${button(resetUrl, "Go to sign in")}`;

  return deliver(
    {
      to: input.to,
      subject: "Your TenBestFind password was changed",
      html: emailLayout({ heading: "Password changed", body, footer: FOOTER, eyebrow: "Account security", preheader: "If this was you, there is nothing to do." }),
      text: [
        `Hi ${first},`,
        `The password for ${input.to} was changed on ${when} (Toronto time).`,
        `If that wasn't you, reset it now at ${resetUrl} and reply to this email so we can lock the account.`,
      ].join("\n\n"),
      replyTo: await teamInbox(),
    },
    "password changed",
  );
}

/* -------------------------------------------------------------- homeowners */

export async function sendQuoteConfirmation(input: {
  to: string;
  name: string;
  businessName: string;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  profileUrl: string;
  job: string;
  urgency: string;
  postalCode?: string | null;
  /** True when the company can already see the homeowner's contact details. */
  delivered: boolean;
}) {
  const first = input.name.split(" ")[0] || "there";
  const next = input.delivered
    ? `${esc(input.businessName)} has your details and usually replies directly. If you haven't heard back by tomorrow, give them a call.`
    : `We've let ${esc(input.businessName)} know someone is asking. Their listing isn't managed on TenBestFind yet, so the quickest way to book is to call them yourself.`;
  const body = `${p(`Hi ${esc(first)},`)}
${p(`We sent your request to <strong>${esc(input.businessName)}</strong>.`)}
${ui.details([
  ["What you asked for", input.job],
  ["How soon", input.urgency],
  ["Area", input.postalCode],
  ...(input.businessPhone
    ? [{ label: "Their phone", html: `<a href="tel:${esc(input.businessPhone.replace(/[^+\d]/g, ""))}" style="color:#1E5FBF;">${esc(input.businessPhone)}</a>` }]
    : []),
  ...(input.businessWebsite
    ? [{ label: "Their website", html: `<a href="${esc(input.businessWebsite)}" style="color:#1E5FBF;">${esc(input.businessWebsite.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` }]
    : []),
])}
${p(next)}
${button(input.profileUrl, "See their profile")}
`;

  return deliver(
    {
      to: input.to,
      subject: `Your request to ${input.businessName}`,
      html: emailLayout({ heading: "Your request is on its way", body, eyebrow: "Quote request", preheader: `We sent your request to ${input.businessName}. Their phone number is inside.`, footer: "You are getting this because you asked for a quote on TenBestFind. We do not sell or share your details." }),
      text: [
        `Hi ${first},`,
        `We sent your request to ${input.businessName}.`,
        textRows([
          ["What you asked for", input.job],
          ["How soon", input.urgency],
          ["Area", input.postalCode],
          ["Their phone", input.businessPhone],
          ["Their website", input.businessWebsite],
        ]),
        input.delivered
          ? `${input.businessName} has your details and usually replies directly. If you haven't heard back by tomorrow, give them a call.`
          : `We've let ${input.businessName} know someone is asking. The quickest way to book is to call them yourself.`,
        `Their profile: ${input.profileUrl}`,
      ].join("\n\n"),
      replyTo: await teamInbox(),
    },
    "quote confirmation",
  );
}

export async function sendContactReceived(input: { to: string; name: string; topic: string; message: string }) {
  const first = input.name.split(" ")[0] || "there";
  const body = `${p(`Hi ${esc(first)},`)}
${p(`Thanks for writing. Your message reached the team that handles <strong>${esc(input.topic.toLowerCase())}</strong>, and someone will reply to this address within two business days.`)}
${p("Here is a copy of what you sent:")}
${ui.quote(input.message)}`;

  return deliver(
    {
      to: input.to,
      subject: "We got your message",
      html: emailLayout({ heading: "Message received", body, eyebrow: "Contact", preheader: "Thanks for writing. We reply within two business days.", footer: "You are getting this because you sent us a message on TenBestFind." }),
      text: [
        `Hi ${first},`,
        `Thanks for writing. Your message reached the team that handles ${input.topic.toLowerCase()}, and someone will reply within two business days.`,
        "Here is a copy of what you sent:",
        input.message,
      ].join("\n\n"),
      replyTo: await teamInbox(),
    },
    "contact received",
  );
}

/* ---------------------------------------------------------- more team alerts */

export function alertContactMessage(input: { kind: string; topic: string; name: string; email: string; message: string; page?: string | null }) {
  return alertTeam(
    `[${input.kind}] ${input.topic}: ${input.email}`,
    `New ${input.kind.toLowerCase()} message`,
    [
      ["Topic", input.topic],
      ["From", input.name],
      ["Email", input.email],
      ["Page", input.page],
      ["Message", input.message],
    ],
    "/admin/submissions",
    input.email,
  );
}

export function alertNewSubscription(input: { businessName: string; planName: string; amount: string; businessId: string }) {
  return alertTeam(
    `[Sale] ${input.planName}, ${input.amount}: ${input.businessName}`,
    "New paid plan",
    [
      ["Business", input.businessName],
      ["Plan", input.planName],
      ["Amount", input.amount],
    ],
    `/admin/businesses/${input.businessId}`,
  );
}

export function alertPaymentFailed(input: { businessName: string; planName: string; amount: string; businessId: string }) {
  return alertTeam(
    `[Billing] Payment failed: ${input.businessName}`,
    "A payment failed",
    [
      ["Business", input.businessName],
      ["Plan", input.planName],
      ["Amount", input.amount],
    ],
    `/admin/businesses/${input.businessId}`,
  );
}

export function alertLeadNotDelivered(input: { businessName: string; leadId: string; error: string }) {
  return alertTeam(
    `[Lead] Not delivered: ${input.businessName}`,
    "A quote request could not be emailed",
    [
      ["Business", input.businessName],
      ["Reason", input.error],
    ],
    `/admin/leads#${input.leadId}`,
  );
}
