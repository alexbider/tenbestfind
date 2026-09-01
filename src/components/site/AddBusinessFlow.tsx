"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitBusiness, type AddState } from "@/app/actions/business";
import { Check, Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { routes } from "@/lib/urls";

export type AddOption = { id: string; label: string };

const STEPS = ["Business", "Location", "Contact", "Services", "Plan", "Review"];

const initial: AddState = { status: "idle" };

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
  const [step, setStep] = useState(0);

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
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Submission received</h2>
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
              <Badge tone="warning">In editorial review</Badge>
            </dd>
          </div>
          <div>
            <dt>Due today</dt>
            <dd>{money(0)}</dd>
          </div>
        </dl>
        <Link href={routes.forBusinesses()} className="btn btn--secondary btn--sm">
          Back to the business centre
        </Link>
      </div>
    );
  }

  return (
    <div className="split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 40, alignItems: "start" }}>
      <form action={action} className="card" style={{ padding: "28px 30px" }}>
        <ol className="steps-rail" aria-label="Submission progress">
          {STEPS.map((label, index) => (
            <li key={label} data-state={index === step ? "current" : index < step ? "done" : "todo"}>
              <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        <div hidden={step !== 0}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>The business</h2>
          <div className="field">
            <label htmlFor="add-name">Business name</label>
            <input id="add-name" name="name" type="text" />
            {state.errors?.name ? <span className="field__error">{state.errors.name}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="add-category">Primary category</label>
            <select id="add-category" name="categorySlug" defaultValue="">
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            {state.errors?.categorySlug ? (
              <span className="field__error">{state.errors.categorySlug}</span>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="add-description">What the business does</label>
            <textarea id="add-description" name="description" rows={5} />
            {state.errors?.description ? (
              <span className="field__error">{state.errors.description}</span>
            ) : null}
            <span className="field__hint">
              Plain description of the work you take on. Editors write the editorial summary
              separately.
            </span>
          </div>
        </div>

        <div hidden={step !== 1}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>Location and coverage</h2>
          <div className="field">
            <label htmlFor="add-city">Primary city</label>
            <select id="add-city" name="cityId" defaultValue="">
              <option value="" disabled>
                Choose a city
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
            {state.errors?.cityId ? <span className="field__error">{state.errors.cityId}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="add-address">Street address</label>
            <input id="add-address" name="addressLine" type="text" />
            <span className="field__hint">
              A verifiable local address is one of the minimum standards. Service-area businesses can
              give a registered address instead.
            </span>
          </div>
        </div>

        <div hidden={step !== 2}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>Contact</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="add-contact">Your name</label>
              <input id="add-contact" name="contactName" type="text" autoComplete="name" />
              {state.errors?.contactName ? (
                <span className="field__error">{state.errors.contactName}</span>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="add-email">Email</label>
              <input id="add-email" name="contactEmail" type="email" autoComplete="email" />
              {state.errors?.contactEmail ? (
                <span className="field__error">{state.errors.contactEmail}</span>
              ) : null}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="add-phone">Phone</label>
              <input id="add-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="add-website">Website</label>
              <input id="add-website" name="website" type="url" placeholder="https://" />
            </div>
          </div>
        </div>

        <div hidden={step !== 3}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Credentials and services</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            Anything you enter here publishes as business provided. It becomes verified only once an
            editor confirms it against the issuing authority.
          </p>
          <div className="callout callout--note">
            <Icon name="info" size={20} color="var(--amber-600)" />
            <div>
              <p className="callout__title">Business provided, not verified</p>
              <p>
                Licence numbers, insurance and certifications are checked after submission. Until
                then they appear on the profile labelled as reported.
              </p>
            </div>
          </div>
        </div>

        <div hidden={step !== 4}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Plan</h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            {money(planPriceCents)} a month per published location. Nothing is charged until the
            listing publishes.
          </p>
          <input type="hidden" name="planKey" value="listing" />
          <div className="radio-row" style={{ cursor: "default" }}>
            <Icon name="check" size={18} color="var(--color-success)" />
            <span>
              <strong>Directory Listing — {money(planPriceCents)}/month per published location</strong>
              <span>
                Full profile management once live, plus the listing performance dashboard. Cancel any
                time.
              </span>
            </span>
          </div>
        </div>

        <div hidden={step !== 5}>
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>Review and submit</h2>
          <div className="callout callout--brand" style={{ marginBottom: 16 }}>
            <Icon name="eye" size={20} color="var(--color-primary)" />
            <div>
              <p className="callout__title">What happens next</p>
              <p>
                An editor reviews the submission against the same minimum standards as everything
                else: a verifiable presence in the market, current insurance, and licensing where the
                jurisdiction requires it. Submitting does not buy a place on a ranking.
              </p>
            </div>
          </div>
          <div className="callout">
            <Icon name="card" size={20} color="var(--gray-400)" />
            <div>
              <p className="callout__title">$0.00 due today</p>
              <p>
                Continuing takes you to Stripe Checkout, which holds your card without charging it.
                The first charge happens on the day the listing publishes, and never if it is
                declined. Card details go straight to Stripe and never touch our servers.
              </p>
            </div>
          </div>
        </div>

        <div className="flow-nav">
          {step > 0 ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
              {pending ? "Redirecting to Stripe…" : "Continue to payment details"}
            </button>
          )}
        </div>
      </form>

      <aside className="card order-summary">
        <h2 className="contact-card__title">Order summary</h2>
        <ul>
          <li>
            <span>Directory Listing</span>
            <span>{money(planPriceCents)}/mo</span>
          </li>
        </ul>
        <p className="order-summary__total">
          <span>Due today</span>
          <strong>{money(0)}</strong>
        </p>
        <p className="order-summary__note">
          First charged on the day the listing publishes. Never charged if the submission is
          declined.
        </p>
      </aside>
    </div>
  );
}
