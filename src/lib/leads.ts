import { createHash } from "node:crypto";
import { db } from "./db";
import { leadAccessFor, firstNameOf } from "./entitlements";
import { emailLayout, esc, sendMail, MailError, ui } from "./mail";
import { fullDate } from "./format";
import { absoluteUrl, routes } from "./urls";
import { alertLeadNotDelivered, sendQuoteConfirmation } from "./notify";

// A lead arrives, is stored, and is emailed to the company. All three happen
// whatever the company pays. What the plan decides is how much of it the
// company can read, which is handled in one place, `leadAccessFor`.

export const URGENCIES = ["EMERGENCY", "THIS_WEEK", "PLANNING"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const URGENCY_LABEL: Record<string, string> = {
  EMERGENCY: "Needs someone today",
  THIS_WEEK: "Within the week",
  PLANNING: "Planning ahead",
};

export const LEAD_STATUSES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUOTED",
  "WON",
  "LOST",
  "SPAM",
] as const;

/**
 * An address is never stored. This is only used to notice one machine sending
 * fifty enquiries in a minute, so a one-way hash carrying the day is enough and
 * it stops being linkable tomorrow.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.SESSION_SECRET ?? "";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

/** How many enquiries one source has sent in the last hour. */
export async function recentFrom(ipHash: string | null): Promise<number> {
  if (!ipHash) return 0;
  return db.lead.count({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}

export type NewLead = {
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  postalCode?: string | null;
  jobType?: string | null;
  message: string;
  urgency: Urgency;
  source?: string;
  path?: string | null;
  referrer?: string | null;
  device?: string | null;
  ipHash?: string | null;
};

/**
 * Stores the enquiry, then tries to email it. A send that fails does not lose
 * the lead: the error is recorded on the row and it shows in the admin, so an
 * unverified sending domain is visible rather than silent.
 */
export async function createLead(input: NewLead): Promise<{ id: string; emailed: boolean }> {
  const access = await leadAccessFor(input.businessId);

  const lead = await db.lead.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      postalCode: input.postalCode ?? null,
      jobType: input.jobType ?? null,
      message: input.message,
      urgency: input.urgency,
      source: input.source ?? "PROFILE",
      path: input.path ?? null,
      referrer: input.referrer ?? null,
      device: input.device ?? null,
      ipHash: input.ipHash ?? null,
      // Recorded as it stood the moment the lead arrived, so the history stays
      // honest after a plan starts or lapses.
      unlocked: access.unlocked,
    },
  });

  // The same day's counter the dashboards read, so a lead shows up on the chart
  // without waiting for the nightly rollup.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await db.businessDailyStat.upsert({
    where: { businessId_date: { businessId: input.businessId, date: today } },
    create: { businessId: input.businessId, date: today, leads: 1 },
    update: { leads: { increment: 1 } },
  });

  let emailed = false;
  let failure: string | null = null;
  try {
    await notifyBusiness(lead.id);
    const after = await db.lead.findUnique({ where: { id: lead.id }, select: { emailedAt: true, emailError: true } });
    emailed = Boolean(after?.emailedAt);
    failure = emailed ? null : after?.emailError ?? null;
  } catch (error) {
    failure = error instanceof MailError ? error.message : error instanceof Error ? error.message : String(error);
    await db.lead.update({ where: { id: lead.id }, data: { emailError: failure.slice(0, 400) } });
  }

  const business = await db.business.findUnique({
    where: { id: input.businessId },
    select: { name: true, slug: true, phone: true, website: true },
  });
  if (business) {
    // The homeowner always hears back, with the company's number, so a request
    // to an unmanaged listing never leaves them waiting on a reply that cannot come.
    await sendQuoteConfirmation({
      to: input.email,
      name: input.name,
      businessName: business.name,
      businessPhone: business.phone,
      businessWebsite: business.website,
      profileUrl: absoluteUrl(routes.business(business.slug)),
      job: input.jobType?.trim() || "A quote",
      urgency: URGENCY_LABEL[input.urgency] ?? input.urgency,
      postalCode: input.postalCode,
      delivered: emailed && access.unlocked,
    });
    if (failure) {
      await alertLeadNotDelivered({ businessName: business.name, leadId: lead.id, error: failure.slice(0, 300) });
    }
  }

  return { id: lead.id, emailed };
}

/**
 * Emails the company. A listing with a plan gets the whole enquiry. One without
 * gets the first name, the job and the urgency, with the contact details held
 * back and a link that explains how to open them. That is the only difference:
 * the lead is not withheld, throttled or delayed.
 */
export async function notifyBusiness(leadId: string): Promise<void> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      business: {
        select: { id: true, name: true, slug: true, email: true, city: { select: { name: true } } },
      },
    },
  });
  if (!lead) return;

  const to = lead.business.email;
  if (!to) {
    await db.lead.update({
      where: { id: leadId },
      data: { emailError: "No email address on file for this company." },
    });
    return;
  }

  const access = await leadAccessFor(lead.businessId);
  const where = lead.business.city?.name ? ` in ${lead.business.city.name}` : "";
  const job = lead.jobType?.trim() || "a job";
  const subject = access.unlocked
    ? `New enquiry from ${lead.name}: ${job}`
    : `New enquiry${where}: ${job}`;

  const details: ({ label: string; html: string })[] = [
    { label: "Name", html: esc(access.unlocked ? lead.name : `${firstNameOf(lead.name)} (full name hidden)`) },
    { label: "What they need", html: esc(job) },
    { label: "How soon", html: esc(URGENCY_LABEL[lead.urgency] ?? lead.urgency) },
  ];
  if (access.unlocked) {
    details.push({ label: "Email", html: `<a href="mailto:${esc(lead.email)}" style="color:#1E5FBF;">${esc(lead.email)}</a>` });
    if (lead.phone) details.push({ label: "Phone", html: `<a href="tel:${esc(lead.phone)}" style="color:#1E5FBF;">${esc(lead.phone)}</a>` });
    if (lead.postalCode) details.push({ label: "Postal code", html: esc(lead.postalCode) });
  } else {
    details.push({ label: "Email", html: ui.hidden() });
    details.push({ label: "Phone", html: lead.phone ? ui.hidden() : "Not given" });
    details.push({ label: "Message", html: ui.hidden() });
  }

  const claimUrl = absoluteUrl(routes.claim());
  const body = `
${ui.lead(`Someone asked <strong>${esc(lead.business.name)}</strong> for a quote through your profile on TenBestFind${where ? ` ${esc(where.trim())}` : ""}, on ${esc(fullDate(lead.createdAt))}.`)}
${ui.details(details)}
${access.unlocked ? `${ui.quote(lead.message)}${ui.p("Hit Reply to answer them directly. People who hear back quickly are far more likely to book.")}${ui.button(absoluteUrl("/portal/leads/"), "Open it in your dashboard")}` : `${ui.callout("The contact details are waiting for you", "This enquiry is saved against your listing in full. Claim the listing and it opens, along with every earlier enquiry we are holding for you.", "gold")}${ui.button(claimUrl, `Claim ${lead.business.name}`)}`}`;

  const text = [
    `Someone asked for a quote through your profile on TenBestFind on ${fullDate(lead.createdAt)}.`,
    "",
    `Name: ${access.unlocked ? lead.name : `${firstNameOf(lead.name)} (full name hidden)`}`,
    `What they need: ${job}`,
    `How soon: ${URGENCY_LABEL[lead.urgency] ?? lead.urgency}`,
    access.unlocked ? `Email: ${lead.email}` : "Email: hidden",
    access.unlocked && lead.phone ? `Phone: ${lead.phone}` : lead.phone ? "Phone: hidden" : "",
    "",
    access.unlocked ? lead.message : "The message is hidden until the listing is claimed.",
    "",
    access.unlocked
      ? absoluteUrl("/portal/leads/")
      : `Claim your listing to open the contact details: ${claimUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMail({
    to,
    subject,
    html: emailLayout({
      heading: access.unlocked ? `New quote request from ${lead.name}` : `New quote request${where}`,
      eyebrow: "New lead",
      preheader: `${job}, ${(URGENCY_LABEL[lead.urgency] ?? lead.urgency).toLowerCase()}.`,
      body,
      footer: `Sent by TenBestFind because ${esc(lead.business.name)} is listed at <a href="${esc(absoluteUrl(routes.business(lead.business.slug)))}" style="color:#6B7280;">${esc(absoluteUrl(routes.business(lead.business.slug)))}</a>.`,
    }),
    text,
    // Replying reaches the customer directly, but only when the company is
    // entitled to the address in the first place.
    replyTo: access.unlocked ? lead.email : undefined,
  });

  await db.lead.update({
    where: { id: leadId },
    data: { emailedAt: new Date(), emailError: null },
  });
}
