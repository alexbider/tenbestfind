"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitClaim, type ClaimState } from "@/app/actions/business";
import { CentreFlow, FlowDone, type FlowStep, type FlowValues } from "@/components/site/centre/CentreFlow";
import { money } from "@/lib/format";
import { routes } from "@/lib/urls";

export type ClaimBusiness = {
  id: string;
  name: string;
  slug: string;
  category: string;
  place: string;
  claimed: boolean;
  topTen?: boolean;
};

export type ClaimPlan = {
  key: string;
  name: string;
  priceCents: number;
  unitLabel: string;
  description: string | null;
};

const METHODS = [
  {
    id: "EMAIL",
    title: "Business domain email",
    tag: "Fastest",
    text: "We send a code to an address on your business domain. Fastest when your site has email.",
  },
  {
    id: "PHONE",
    title: "Phone callback",
    text: "We call the number published on your listing and read you a code.",
  },
  {
    id: "WEBSITE_TOKEN",
    title: "Website token",
    text: "Add a short meta tag to your homepage. Good when email routes elsewhere.",
  },
  {
    id: "DOCUMENT",
    title: "Registration document",
    text: "Upload business registration or a utility bill in the business name. Reviewed by an editor.",
  },
];

const ROLES = [
  { id: "", title: "Choose your role" },
  { id: "Owner", title: "Owner" },
  { id: "Manager", title: "Manager" },
  { id: "Marketing lead", title: "Marketing lead" },
  { id: "Agency acting for the owner", title: "Agency acting for the owner" },
];

const FREE_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initial: ClaimState = { status: "idle" };

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function nextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

/**
 * The claim flow on the October 2026 business centre design. The steps, the
 * verification methods, the optional Top 10 add-on and the server action are
 * the ones the page has always had; only the presentation is new.
 */
export function ClaimFlow({ businesses, plans }: { businesses: ClaimBusiness[]; plans: ClaimPlan[] }) {
  const [state, action, pending] = useActionState(submitClaim, initial);

  const claimPlan = plans.find((plan) => plan.key === "claim") ?? plans[0];
  const top10 = plans.find((plan) => plan.key === "top10");
  const byId = new Map(businesses.map((business) => [business.id, business]));

  const steps: FlowStep[] = [
    {
      label: "Find your business",
      title: "Find your business",
      sub: "Claim the listing we already have rather than creating a duplicate.",
      fields: [
        {
          id: "biz",
          kind: "finder",
          label: "Search our listings",
          ph: "Business name or city",
          full: true,
          required: "Pick your business from the list",
          errorKeys: ["businessId", "businessName"],
          validate: (value) =>
            byId.get(value as string)?.claimed
              ? "This listing is already claimed. If you believe that is wrong, contact business support and we will check the verification on file."
              : null,
          items: businesses.map((business) => ({
            id: business.id,
            name: business.name,
            meta: `${business.category} · ${business.place}`,
            tag: business.topTen ? "Top 10" : undefined,
            claimed: business.claimed,
          })),
          notListed: (
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Not listed?{" "}
              <Link href={routes.addBusiness()} style={{ fontWeight: "600" }}>
                Add your business instead
              </Link>
            </p>
          ),
        },
      ],
    },
    {
      label: "Your details",
      title: "Your details",
      sub: "Tell us who is claiming, so we can match you to the business record.",
      fields: [
        {
          id: "name",
          kind: "input",
          type: "text",
          label: "Your full name",
          ph: "Jane Smith",
          autoComplete: "name",
          required: "Tell us your name",
          validate: (value) => (String(value ?? "").trim().length < 2 ? "Tell us your name" : null),
          errorKeys: ["ownerName"],
        },
        { id: "role", kind: "select", label: "Your role", options: ROLES, required: "Choose your role", errorKeys: ["role"] },
        {
          id: "email",
          kind: "input",
          type: "email",
          label: "Business email",
          ph: "you@yourcompany.com",
          autoComplete: "email",
          help: "Use an address on your business domain where possible.",
          required: "Enter a valid email address",
          validate: (value) => (EMAIL.test(String(value ?? "").trim()) ? null : "Enter a valid email address"),
          errorKeys: ["ownerEmail"],
        },
        { id: "phone", kind: "input", type: "tel", label: "Phone", ph: "(555) 000-0000", autoComplete: "tel", errorKeys: ["ownerPhone"] },
      ],
    },
    {
      label: "Verification",
      title: "How should we verify you?",
      sub: "Pick whichever is easiest. All four end with an editor confirming the match.",
      fields: [
        {
          id: "verify",
          kind: "choice",
          label: "Verification method",
          full: true,
          def: "EMAIL",
          options: METHODS,
          errorKeys: ["verificationMethod"],
          validate: (value, values) => {
            const domain = String(values.email ?? "").split("@")[1]?.toLowerCase() ?? "";
            return value === "EMAIL" && FREE_DOMAINS.includes(domain)
              ? "Email verification needs an address on the business domain. Use an address on your business domain, or choose phone or document verification."
              : null;
          },
        },
      ],
    },
    {
      label: "Plan",
      title: "Choose your plan",
      sub: "A subscription buys profile management. It never buys a ranking position.",
      fields: [
        {
          id: "plan",
          kind: "choice",
          label: "Plan",
          full: true,
          def: claimPlan?.key ?? "claim",
          errorKeys: ["planKey"],
          options: claimPlan
            ? [
                {
                  id: claimPlan.key,
                  title: `${claimPlan.name} · ${money(claimPlan.priceCents)}/mo`,
                  tag: capital(claimPlan.unitLabel),
                  text: claimPlan.description ?? undefined,
                },
              ]
            : [],
        },
        ...(top10
          ? [
              {
                id: "top10",
                kind: "check" as const,
                label: "Top 10 add-on",
                full: true,
                title: `Add ${top10.name} · ${money(top10.priceCents)}/mo`,
                tag: "Optional",
                text: "A labelled featured placement outside the ranked ten. It says Sponsored wherever it appears.",
              },
            ]
          : []),
      ],
    },
    {
      label: "Review",
      title: "Review and continue",
      sub: "Check the details below. You can edit anything before checkout.",
      fields: [{ id: "review", kind: "review", label: "Review", full: true }],
    },
  ];

  const toForm = (values: FlowValues) => {
    const business = byId.get(values.biz as string);
    return {
      businessId: business?.id ?? "",
      businessName: business?.name ?? String(values.bizQ ?? ""),
      ownerName: String(values.name ?? ""),
      role: String(values.role ?? ""),
      ownerEmail: String(values.email ?? ""),
      ownerPhone: String(values.phone ?? ""),
      verificationMethod: String(values.verify ?? "EMAIL"),
      planKey: String(values.plan ?? claimPlan?.key ?? "claim"),
      addTop10: values.top10 ? "on" : "",
    };
  };

  const summary = (values: FlowValues) => {
    const withTop10 = Boolean(values.top10 && top10);
    const items = [{ name: claimPlan?.name ?? "Claim & Manage", price: `${money(claimPlan?.priceCents ?? 0)}/mo` }];
    if (withTop10 && top10) items.push({ name: top10.name, price: `${money(top10.priceCents)}/mo` });
    const due = (claimPlan?.priceCents ?? 0) + (withTop10 && top10 ? top10.priceCents : 0);
    const renews = nextMonth().toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return {
      items,
      due: money(due),
      dueNote: `Renews ${renews}. Cancel any time, effective at the end of the period. Refunded in full if we cannot verify ownership.`,
    };
  };

  return (
    <CentreFlow
      steps={steps}
      flowLabel="Claim flow"
      finalLabel="Continue to secure checkout"
      pendingLabel="Redirecting to Stripe…"
      stripeText="Continuing takes you to Stripe Checkout. Card details go straight to Stripe and never touch our servers. The charge is refunded in full if we cannot verify your ownership."
      summary={summary}
      toForm={toForm}
      action={action}
      pending={pending}
      serverMessage={state.status === "error" ? state.message : undefined}
      serverErrors={state.status === "error" ? state.errors : undefined}
      done={
        state.status === "ok" ? (
          <FlowDone
            title="Subscription active, claim submitted"
            message={state.message ?? ""}
            rows={[
              { label: "Reference", value: state.reference ?? "" },
              { label: "Status", value: "Verification pending" },
              { label: "Next charge", value: nextMonth().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
            ]}
            links={[
              { href: routes.forBusinesses(), label: "Back to the business centre", primary: true },
              { href: routes.contact(), label: "Contact business support" },
            ]}
          />
        ) : undefined
      }
    />
  );
}
