"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitClaim, type ClaimState } from "@/app/actions/business";
import { Check, Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { routes } from "@/lib/urls";

export type ClaimBusiness = {
  id: string;
  name: string;
  slug: string;
  category: string;
  place: string;
  claimed: boolean;
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
    value: "EMAIL",
    label: "Business domain email",
    body: "We send a code to an address on your business domain. Fastest when your site has email.",
  },
  {
    value: "PHONE",
    label: "Phone callback",
    body: "We call the number published on your listing and read you a code.",
  },
  {
    value: "WEBSITE_TOKEN",
    label: "Website token",
    body: "Add a short meta tag to your homepage. Good when email routes elsewhere.",
  },
  {
    value: "DOCUMENT",
    label: "Registration document",
    body: "Upload business registration or a utility bill in the business name. Reviewed by an editor.",
  },
];

const STEPS = ["Find your business", "Your details", "Verification", "Plan", "Review"];

const initial: ClaimState = { status: "idle" };

/**
 * The claim flow, stepped so each decision is made once. State lives here; the
 * final submit posts everything to the server action in one go.
 */
export function ClaimFlow({
  businesses,
  plans,
}: {
  businesses: ClaimBusiness[];
  plans: ClaimPlan[];
}) {
  const [state, action, pending] = useActionState(submitClaim, initial);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClaimBusiness | null>(null);
  const [method, setMethod] = useState("EMAIL");
  const [planKey, setPlanKey] = useState(plans[0]?.key ?? "claim");
  const [addTop10, setAddTop10] = useState(false);

  const plan = plans.find((item) => item.key === planKey) ?? plans[0];
  const top10 = plans.find((item) => item.key === "top10");
  const dueToday = (plan?.priceCents ?? 0) + (addTop10 && top10 ? top10.priceCents : 0);

  const matches = query.trim()
    ? businesses.filter((business) =>
        `${business.name} ${business.place}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];

  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 1);

  if (state.status === "ok") {
    return (
      <div className="card" style={{ padding: "40px 42px", maxWidth: 720 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--green-50)",
            color: "var(--green-600)",
            marginBottom: 20,
          }}
        >
          <Check size={28} color="currentColor" />
        </span>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Subscription active, claim submitted</h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 20 }}>
          {state.message}
        </p>
        <dl className="transparency__grid" style={{ marginBottom: 24 }}>
          <div>
            <dt>Reference</dt>
            <dd>{state.reference}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Badge tone="warning">Verification pending</Badge>
            </dd>
          </div>
          <div>
            <dt>Next charge</dt>
            <dd>{renewal.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd>
          </div>
        </dl>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={routes.forBusinesses()} className="btn btn--secondary btn--sm">
            Back to the business centre
          </Link>
          <Link href={routes.contact()} className="btn btn--ghost btn--sm">
            Contact business support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 40, alignItems: "start" }}>
      <form action={action} className="card" style={{ padding: "28px 30px" }}>
        <ol className="steps-rail" aria-label="Claim progress">
          {STEPS.map((label, index) => (
            <li key={label} data-state={index === step ? "current" : index < step ? "done" : "todo"}>
              <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        {/* -------------------------------------------------- 1. find */}
        <div hidden={step !== 0}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Find your business</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            Claim the listing we already have rather than creating a duplicate.
          </p>
          <div className="field">
            <label htmlFor="claim-search">Business name</label>
            <input
              id="claim-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing your business name"
              autoComplete="off"
            />
          </div>
          {matches.length > 0 ? (
            <ul style={{ display: "grid", gap: 10 }}>
              {matches.slice(0, 5).map((business) => (
                <li key={business.id}>
                  <button
                    type="button"
                    className="topic-card"
                    data-on={selected?.id === business.id}
                    onClick={() => setSelected(business)}
                  >
                    <span className="topic-card__icon" aria-hidden="true">
                      <Icon name="store" size={20} strokeWidth={1.8} />
                    </span>
                    <span>
                      <strong>{business.name}</strong>
                      <span>
                        {business.category} · {business.place}
                        {business.claimed ? " · already claimed" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {query.trim() && matches.length === 0 ? (
            <div className="callout callout--brand">
              <Icon name="info" size={20} color="var(--color-primary)" />
              <div>
                <p className="callout__title">We do not have that listing yet</p>
                <p>
                  Add it instead. Nothing is charged until an editor publishes it.{" "}
                  <Link href={routes.addBusiness()}>Add a business</Link>.
                </p>
              </div>
            </div>
          ) : null}
          {selected?.claimed ? (
            <div className="callout callout--note" style={{ marginTop: 16 }}>
              <Icon name="alert" size={20} color="var(--amber-600)" />
              <div>
                <p className="callout__title">This listing is already claimed</p>
                <p>
                  If you believe that is wrong, contact business support and we will check the
                  verification on file.
                </p>
              </div>
            </div>
          ) : null}
          <input type="hidden" name="businessId" value={selected?.id ?? ""} />
          <input type="hidden" name="businessName" value={selected?.name ?? query} />
        </div>

        {/* ------------------------------------------------ 2. details */}
        <div hidden={step !== 1}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>Your details</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="claim-name">Your name</label>
              <input id="claim-name" name="ownerName" type="text" autoComplete="name" />
              {state.errors?.ownerName ? <span className="field__error">{state.errors.ownerName}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="claim-role">Your role</label>
              <input id="claim-role" name="role" type="text" placeholder="Owner, manager, marketing" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="claim-email">Business email</label>
              <input id="claim-email" name="ownerEmail" type="email" autoComplete="email" />
              {state.errors?.ownerEmail ? <span className="field__error">{state.errors.ownerEmail}</span> : null}
              <span className="field__hint">Use an address on your business domain where possible.</span>
            </div>
            <div className="field">
              <label htmlFor="claim-phone">Phone</label>
              <input id="claim-phone" name="ownerPhone" type="tel" autoComplete="tel" />
            </div>
          </div>
        </div>

        {/* ------------------------------------------- 3. verification */}
        <div hidden={step !== 2}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>How should we verify you?</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            Pick whichever is easiest. All four end with an editor confirming the match.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {METHODS.map((option) => (
              <label key={option.value} className="radio-row">
                <input
                  type="radio"
                  name="verificationMethod"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span>{option.body}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------- 4. plan */}
        <div hidden={step !== 3}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Choose a plan</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            A subscription buys profile management. It never buys a ranking position.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {plans
              .filter((item) => item.key === "claim")
              .map((item) => (
                <label key={item.key} className="radio-row">
                  <input
                    type="radio"
                    name="planKey"
                    value={item.key}
                    checked={planKey === item.key}
                    onChange={() => setPlanKey(item.key)}
                  />
                  <span>
                    <strong>
                      {item.name} — {money(item.priceCents)}/month {item.unitLabel}
                    </strong>
                    <span>{item.description}</span>
                  </span>
                </label>
              ))}
            {top10 ? (
              <label className="radio-row">
                <input type="checkbox" checked={addTop10} onChange={() => setAddTop10(!addTop10)} />
                <span>
                  <strong>
                    Add {top10.name} — {money(top10.priceCents)}/month {top10.unitLabel}
                  </strong>
                  <span>
                    A labelled featured placement outside the ranked ten. It says Sponsored wherever
                    it appears.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        </div>

        {/* ------------------------------------------------ 5. review */}
        <div hidden={step !== 4}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>Review and submit</h2>
          <dl className="transparency__grid" style={{ marginBottom: 20 }}>
            <div>
              <dt>Business</dt>
              <dd>{selected?.name ?? (query || "Not selected")}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{METHODS.find((item) => item.value === method)?.label}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {plan?.name}
                {addTop10 && top10 ? ` + ${top10.name}` : ""}
              </dd>
            </div>
            <div>
              <dt>Due today</dt>
              <dd>{money(dueToday)}</dd>
            </div>
          </dl>
          <div className="callout callout--brand" style={{ marginBottom: 16 }}>
            <Icon name="lock" size={20} color="var(--color-primary)" />
            <div>
              <p className="callout__title">What this does not change</p>
              <p>
                Ranking position, Top 10 status, the editorial summary and the Best for designation
                stay with the editorial team. A subscription cannot move any of them.
              </p>
            </div>
          </div>

          <div className="callout">
            <Icon name="card" size={20} color="var(--gray-400)" />
            <div>
              <p className="callout__title">Payment is handled by Stripe</p>
              <p>
                Continuing takes you to Stripe Checkout. Card details go straight to Stripe and never
                touch our servers. The charge is refunded in full if we cannot verify your ownership.
              </p>
            </div>
          </div>
        </div>

        <input type="hidden" name="addTop10" value={addTop10 ? "on" : ""} />

        <div className="flow-nav">
          {step > 0 ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !selected}
            >
              Continue
            </button>
          ) : (
            <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
              {pending ? "Redirecting to Stripe…" : `Continue to payment · ${money(dueToday)}`}
            </button>
          )}
        </div>
      </form>

      <aside className="card order-summary">
        <h2 className="contact-card__title">Order summary</h2>
        <ul>
          <li>
            <span>{plan?.name}</span>
            <span>{money(plan?.priceCents ?? 0)}</span>
          </li>
          {addTop10 && top10 ? (
            <li>
              <span>{top10.name}</span>
              <span>{money(top10.priceCents)}</span>
            </li>
          ) : null}
        </ul>
        <p className="order-summary__total">
          <span>Due today</span>
          <strong>{money(dueToday)}</strong>
        </p>
        <p className="order-summary__note">
          Renews {renewal.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Cancel any
          time, effective at the end of the period.
        </p>
      </aside>
    </div>
  );
}
