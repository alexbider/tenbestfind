"use client";

import { useActionState } from "react";
import { submitBusiness, type AddState } from "@/app/actions/business";
import { CentreFlow, FlowDone, type FlowStep, type FlowValues } from "@/components/site/centre/CentreFlow";
import { money } from "@/lib/format";
import { routes } from "@/lib/urls";

export type AddOption = { id: string; label: string };

/** The kinds of work a listing can say it takes on. Editors check them against the website. */
const SERVICES = [
  "Repairs",
  "Installation",
  "Replacement",
  "Inspections",
  "Maintenance plans",
  "Emergency / 24-7",
  "Free estimates",
  "Financing",
  "Commercial work",
  "Insurance claims",
  "Warranty work",
  "New construction",
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initial: AddState = { status: "idle" };

/**
 * The add-a-business flow on the October 2026 business centre design. It posts
 * the same fields to the same server action as before, plus the service area,
 * the services and the licence number the new design asks for.
 */
export function AddBusinessFlow({
  categories,
  cities,
  planPriceCents,
}: {
  categories: AddOption[];
  cities: AddOption[];
  planPriceCents: number;
}) {
  const [state, action, pending] = useActionState(submitBusiness, initial);
  const price = money(planPriceCents);

  const steps: FlowStep[] = [
    {
      label: "Business",
      title: "The business",
      sub: "The basics an editor needs to place you in the right research pool.",
      fields: [
        {
          id: "name",
          kind: "input",
          type: "text",
          label: "Business name",
          ph: "Your company name",
          required: "Tell us the business name",
          validate: (value) => (String(value ?? "").trim().length < 2 ? "Tell us the business name" : null),
          errorKeys: ["name"],
        },
        {
          id: "cat",
          kind: "select",
          label: "Primary category",
          options: [{ id: "", title: "Choose a category" }, ...categories.map((category) => ({ id: category.id, title: category.label }))],
          required: "Pick a category",
          errorKeys: ["categorySlug"],
        },
        {
          id: "desc",
          kind: "textarea",
          label: "What the business does",
          ph: "Residential re-roofing, storm repair and gutter work across the metro…",
          full: true,
          help: "Plain description of the work you take on. Editors write the editorial summary separately.",
          required: "Give us a couple of sentences",
          validate: (value) => (String(value ?? "").trim().length < 20 ? "Give us a couple of sentences" : null),
          errorKeys: ["description"],
        },
      ],
    },
    {
      label: "Location",
      title: "Where you operate",
      sub: "A verifiable local address is one of our minimum standards.",
      fields: [
        {
          id: "street",
          kind: "input",
          type: "text",
          label: "Street address",
          ph: "123 Main Street",
          full: true,
          autoComplete: "street-address",
          help: "Service-area businesses can give a registered address instead.",
          errorKeys: ["addressLine"],
        },
        {
          id: "city",
          kind: "select",
          label: "City",
          options: [{ id: "", title: "Choose a city" }, ...cities.map((city) => ({ id: city.id, title: city.label }))],
          required: "Pick a city",
          errorKeys: ["cityId"],
        },
        { id: "area", kind: "input", type: "text", label: "Service area", ph: "Columbus and suburbs within 30 miles", errorKeys: ["serviceArea"] },
      ],
    },
    {
      label: "Contact",
      title: "Contact details",
      sub: "How customers and our editors can reach you.",
      fields: [
        {
          id: "contact",
          kind: "input",
          type: "text",
          label: "Your name",
          ph: "Jane Smith",
          autoComplete: "name",
          required: "Tell us your name",
          validate: (value) => (String(value ?? "").trim().length < 2 ? "Tell us your name" : null),
          errorKeys: ["contactName"],
        },
        {
          id: "email",
          kind: "input",
          type: "email",
          label: "Email",
          ph: "you@yourcompany.com",
          autoComplete: "email",
          required: "Enter a valid email address",
          validate: (value) => (EMAIL.test(String(value ?? "").trim()) ? null : "Enter a valid email address"),
          errorKeys: ["contactEmail"],
        },
        { id: "phone", kind: "input", type: "tel", label: "Phone", ph: "(555) 000-0000", autoComplete: "tel", errorKeys: ["phone"] },
        { id: "web", kind: "input", type: "url", label: "Website", ph: "https://yourcompany.com", autoComplete: "url", errorKeys: ["website"] },
      ],
    },
    {
      label: "Services",
      title: "Credentials and services",
      sub: "Pick everything you genuinely take on. Editors check this against your website.",
      fields: [
        { id: "svc", kind: "chips", label: "Services", full: true, options: SERVICES, errorKeys: ["services"] },
        {
          id: "lic",
          kind: "input",
          type: "text",
          label: "Licence or registration number",
          ph: "If your jurisdiction requires one",
          full: true,
          errorKeys: ["licenseNumber"],
        },
        {
          id: "provided",
          kind: "note",
          label: "Business provided",
          full: true,
          title: "Business provided, not verified.",
          text: "Licence numbers, insurance and certifications are checked after submission. Until then they appear on the profile labelled as reported.",
        },
      ],
    },
    {
      label: "Plan",
      title: "Choose your plan",
      sub: `${price} a month per published location. Nothing is charged until the listing publishes.`,
      fields: [
        {
          id: "plan",
          kind: "choice",
          label: "Plan",
          full: true,
          def: "listing",
          errorKeys: ["planKey"],
          options: [
            {
              id: "listing",
              title: `Directory Listing · ${price}/mo`,
              tag: "$0 today",
              text: "Full profile management once live, plus the listing performance dashboard. Cancel any time.",
            },
          ],
        },
      ],
    },
    {
      label: "Review",
      title: "Review and continue",
      sub: "Check the details below. You can edit anything before checkout.",
      fields: [
        { id: "review", kind: "review", label: "Review", full: true },
        {
          id: "next",
          kind: "note",
          label: "What happens next",
          full: true,
          title: "What happens next.",
          text: "An editor reviews the submission against the same minimum standards as everything else: a verifiable presence in the market, current insurance, and licensing where the jurisdiction requires it. Submitting does not buy a place on a ranking.",
        },
      ],
    },
  ];

  const toForm = (values: FlowValues) => ({
    name: String(values.name ?? ""),
    categorySlug: String(values.cat ?? ""),
    description: String(values.desc ?? ""),
    addressLine: String(values.street ?? ""),
    cityId: String(values.city ?? ""),
    serviceArea: String(values.area ?? ""),
    contactName: String(values.contact ?? ""),
    contactEmail: String(values.email ?? ""),
    phone: String(values.phone ?? ""),
    website: String(values.web ?? ""),
    services: Array.isArray(values.svc) ? values.svc.join(", ") : "",
    licenseNumber: String(values.lic ?? ""),
    planKey: "listing",
  });

  const summary = () => ({
    items: [{ name: "Directory Listing", price: `${price}/mo` }],
    due: money(0),
    dueNote: "First charged on the day the listing publishes. Never charged if the submission is declined.",
  });

  return (
    <CentreFlow
      steps={steps}
      flowLabel="Submission flow"
      finalLabel="Continue to secure checkout"
      pendingLabel="Redirecting to Stripe…"
      stripeText="Continuing takes you to Stripe Checkout, which holds your card without charging it. The first charge happens on the day the listing publishes, and never if it is declined. Card details go straight to Stripe and never touch our servers."
      summary={summary}
      toForm={toForm}
      action={action}
      pending={pending}
      serverMessage={state.status === "error" ? state.message : undefined}
      serverErrors={state.status === "error" ? state.errors : undefined}
      done={
        state.status === "ok" ? (
          <FlowDone
            title="Submission received"
            message={state.message ?? ""}
            rows={[
              { label: "Reference", value: state.reference ?? "" },
              { label: "Status", value: "In editorial review" },
              { label: "Due today", value: money(0) },
            ]}
            links={[{ href: routes.forBusinesses(), label: "Back to the business centre", primary: true }]}
          />
        ) : undefined
      }
    />
  );
}
