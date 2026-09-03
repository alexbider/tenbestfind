import { createHash } from "node:crypto";
import { db } from "./db";
import { leadAccessFor, firstNameOf } from "./entitlements";
import { emailLayout, esc, sendMail, MailError } from "./mail";
import { fullDate } from "./format";
import { absoluteUrl, routes } from "./urls";

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
  try {
    await notifyBusiness(lead.id);
    emailed = true;
  } catch (error) {
    const message =
      error instanceof MailError ? error.message : error instanceof Error ? error.message : String(error);
    await db.lead.update({ where: { id: lead.id }, data: { emailError: message.slice(0, 400) } });
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

  const rows: string[] = [
    row("Name", access.unlocked ? lead.name : `${firstNameOf(lead.name)} (full name hidden)`),
    row("What they need", job),
    row("How soon", URGENCY_LABEL[lead.urgency] ?? lead.urgency),
  ];

  if (access.unlocked) {
    rows.push(row("Email", `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`, true));
    if (lead.phone) rows.push(row("Phone", `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`, true));
    if (lead.postalCode) rows.push(row("Postal code", lead.postalCode));
    rows.push(row("Message", esc(lead.message).replace(/\n/g, "<br>"), true));
  } else {
    rows.push(row("Email", "Hidden", false, true));
    rows.push(row("Phone", lead.phone ? "Hidden" : "Not given", false, Boolean(lead.phone)));
    rows.push(row("Message", "Hidden", false, true));
  }

  const claimUrl = absoluteUrl(routes.claim());
  const body = `
<p style="margin:0 0 18px;">Someone asked for a quote through your profile on TenBestFind${where ? ` ${esc(where.trim())}` : ""}, on ${esc(fullDate(lead.createdAt))}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
${rows.join("\n")}
</table>
${
  access.unlocked
    ? `<p style="margin:0;"><a href="${esc(absoluteUrl("/portal/leads/"))}" style="display:inline-block;background:#1a63d8;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;">Open it in your dashboard</a></p>`
    : `<div style="background:#f4f6f9;border:1px solid #e3e8ef;border-radius:10px;padding:16px 18px;">
<p style="margin:0 0 12px;font-weight:600;color:#16202e;">The contact details are waiting for you.</p>
<p style="margin:0 0 14px;">This enquiry is saved against your listing in full. Claim the listing and it opens, along with every earlier enquiry we are holding for you.</p>
<p style="margin:0;"><a href="${esc(claimUrl)}" style="display:inline-block;background:#1a63d8;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;">Claim ${esc(lead.business.name)}</a></p>
</div>`
}`;

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
      heading: subject,
      body,
      footer: `Sent by TenBestFind because ${esc(lead.business.name)} is listed at ${esc(absoluteUrl(routes.business(lead.business.slug)))}.`,
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

function row(label: string, value: string, isHtml = false, hidden = false): string {
  const cell = hidden
    ? `<span style="display:inline-block;background:#e7ebf1;color:#8b95a5;border-radius:5px;padding:2px 10px;letter-spacing:0.08em;">hidden</span>`
    : isHtml
      ? value
      : esc(value);
  return `<tr>
<td style="padding:7px 12px 7px 0;vertical-align:top;font-size:13.5px;color:#7b8798;white-space:nowrap;">${esc(label)}</td>
<td style="padding:7px 0;vertical-align:top;font-size:15px;color:#16202e;">${cell}</td>
</tr>`;
}
