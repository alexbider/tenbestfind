"use client";

import { useActionState, useState } from "react";
import { savePerson, savePlacement, savePlan } from "@/app/actions/admin-directory";
import type { ActionState } from "@/app/actions/admin-content";
import { RepeatableEditor, StringListEditor } from "./RepeatableEditor";
import { MediaField } from "./MediaField";
import { Check } from "@/components/ui/Icon";
import type { Option } from "./GuideEditor";

const initial: ActionState = { status: "idle" };

function Feedback({ state }: { state: ActionState }) {
  if (state.status === "ok") {
    return (
      <p className="form-success">
        <Check size={18} />
        {state.message}
      </p>
    );
  }
  if (state.status === "error") return <p className="form-error">{state.message}</p>;
  return null;
}

function Switch({
  name,
  label,
  hint,
  checked,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
}) {
  return (
    <label className="radio-row" style={{ padding: "10px 14px" }}>
      <input type="checkbox" name={name} defaultChecked={checked} />
      <span>
        <strong>{label}</strong>
        {hint ? <span>{hint}</span> : null}
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- people */

export type PersonDraft = {
  id?: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  limits: string;
  portrait: string;
  email: string;
  yearsExperience: string;
  specializations: string[];
  markets: string[];
  links: Record<string, string>[];
  credentials: Record<string, string>[];
  experience: Record<string, string>[];
  isAuthor: boolean;
  isReviewer: boolean;
  isExpert: boolean;
  published: boolean;
};

export function PersonEditor({ person }: { person: PersonDraft }) {
  const [state, action, pending] = useActionState(savePerson, initial);

  return (
    <form action={action}>
      {person.id ? <input type="hidden" name="id" value={person.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="person-name">Name</label>
          <input id="person-name" name="name" type="text" defaultValue={person.name} required />
        </div>
        <div className="field">
          <label htmlFor="person-slug">Slug</label>
          <input id="person-slug" name="slug" type="text" defaultValue={person.slug} required />
          <span className="field__hint">/experts/{person.slug || "slug"}/</span>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="person-role">Role</label>
          <input
            id="person-role"
            name="role"
            type="text"
            defaultValue={person.role}
            placeholder="Senior editor, home services"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="person-years">Years of experience</label>
          <input
            id="person-years"
            name="yearsExperience"
            type="number"
            min="0"
            max="70"
            defaultValue={person.yearsExperience}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="person-bio">Biography</label>
        <textarea id="person-bio" name="bio" rows={5} defaultValue={person.bio} />
      </div>

      <div className="field">
        <label htmlFor="person-limits">What this person does not cover</label>
        <textarea id="person-limits" name="limits" rows={3} defaultValue={person.limits} />
        <span className="field__hint">
          Published as written. Saying where someone&apos;s expertise stops is what makes the rest
          worth trusting.
        </span>
      </div>

      <div className="field-row">
        <MediaField name="portrait" label="Portrait" initial={person.portrait} />
        <div className="field">
          <label htmlFor="person-email">Contact email</label>
          <input id="person-email" name="email" type="email" defaultValue={person.email} />
        </div>
      </div>

      <StringListEditor
        name="specializations"
        label="Specializations"
        initial={person.specializations}
      />
      <StringListEditor
        name="markets"
        label="Markets covered"
        initial={person.markets}
        hint="One per line. Cities or regions this person knows first hand."
      />

      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <Switch name="isAuthor" label="Writes articles" checked={person.isAuthor} />
        <Switch name="isReviewer" label="Reviews articles" checked={person.isReviewer} />
        <Switch
          name="isExpert"
          label="Listed on the expert panel"
          hint="Gets a public profile at /experts/."
          checked={person.isExpert}
        />
        <Switch name="published" label="Published" checked={person.published} />
      </div>

      <fieldset className="fieldset">
        <legend>Credentials</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Marking one verified stamps today as the date it was checked, and the profile says so.
        </p>
        <RepeatableEditor
          name="credentials"
          summaryKey="label"
          addLabel="Add credential"
          emptyLabel="No credentials recorded."
          fields={[
            { key: "label", label: "Credential" },
            { key: "issuer", label: "Issuer", width: "half" },
            {
              key: "status",
              label: "Status",
              type: "select",
              width: "half",
              options: [
                { value: "SELF_REPORTED", label: "Self reported" },
                { value: "VERIFIED", label: "Verified" },
                { value: "EXPIRED", label: "Expired" },
              ],
            },
            { key: "issuedAt", label: "Issued", width: "half", placeholder: "2019-04-01" },
            { key: "sourceUrl", label: "Source URL", width: "half" },
          ]}
          initial={person.credentials}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Experience</legend>
        <RepeatableEditor
          name="experience"
          summaryKey="role"
          addLabel="Add role"
          emptyLabel="No experience recorded."
          fields={[
            { key: "role", label: "Role", width: "half" },
            { key: "org", label: "Organisation", width: "half" },
            { key: "startedAt", label: "Started", width: "half", placeholder: "2016-01-01" },
            { key: "endedAt", label: "Ended", width: "half", placeholder: "Blank if current" },
            { key: "summary", label: "Summary", type: "textarea" },
          ]}
          initial={person.experience}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Links</legend>
        <RepeatableEditor
          name="links"
          summaryKey="label"
          addLabel="Add link"
          emptyLabel="No links."
          fields={[
            { key: "label", label: "Label", width: "half" },
            { key: "url", label: "URL", width: "half" },
          ]}
          initial={person.links}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save person"}
      </button>
    </form>
  );
}

/* ----------------------------------------------------------------- plans */

export type PlanDraft = {
  id?: string;
  key: string;
  name: string;
  description: string;
  priceCents: string;
  currency: string;
  interval: string;
  unitLabel: string;
  features: string[];
  sortOrder: string;
  editorial: boolean;
  active: boolean;
  stripePriceId: string | null;
};

export function PlanEditor({ plan }: { plan: PlanDraft }) {
  const [state, action, pending] = useActionState(savePlan, initial);
  const [interval, setInterval] = useState(plan.interval);

  return (
    <form action={action}>
      {plan.id ? <input type="hidden" name="id" value={plan.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="plan-name">Name</label>
          <input id="plan-name" name="name" type="text" defaultValue={plan.name} required />
        </div>
        <div className="field">
          <label htmlFor="plan-key">Key</label>
          <input id="plan-key" name="key" type="text" defaultValue={plan.key} required />
          <span className="field__hint">
            What the signup flows ask for: claim, listing, top10, advertising.
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="plan-description">Description</label>
        <textarea id="plan-description" name="description" rows={3} defaultValue={plan.description} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="plan-price">Price, in cents</label>
          <input
            id="plan-price"
            name="priceCents"
            type="number"
            min="0"
            step="1"
            defaultValue={plan.priceCents}
            disabled={interval === "quote"}
          />
          <span className="field__hint">
            19900 is $199.00. Changing it creates a new Stripe price; people already subscribed keep
            the one they signed up on.
          </span>
        </div>
        <div className="field">
          <label htmlFor="plan-interval">Billing</label>
          <select
            id="plan-interval"
            name="interval"
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="quote">Quoted, no fixed price</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="plan-currency">Currency</label>
          <input
            id="plan-currency"
            name="currency"
            type="text"
            maxLength={3}
            defaultValue={plan.currency}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="plan-unit">Unit label</label>
          <input
            id="plan-unit"
            name="unitLabel"
            type="text"
            defaultValue={plan.unitLabel}
            placeholder="per location"
          />
        </div>
      </div>

      <StringListEditor
        name="features"
        label="What the plan includes"
        initial={plan.features}
        hint="One per line. This is the list on the pricing tables."
      />

      <div className="field">
        <label htmlFor="plan-sort">Sort order</label>
        <input id="plan-sort" name="sortOrder" type="number" defaultValue={plan.sortOrder} />
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <Switch
          name="editorial"
          label="Touches placement"
          hint="Flags the plan as advertising so the disclosure copy applies to it."
          checked={plan.editorial}
        />
        <Switch name="active" label="On sale" checked={plan.active} />
      </div>

      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
        {plan.stripePriceId
          ? `Currently mapped to Stripe price ${plan.stripePriceId}.`
          : "Not yet mapped to a Stripe price. Saving pushes one when Stripe is configured."}
      </p>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save plan"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------ placements */

export type PlacementDraft = {
  id?: string;
  businessId: string;
  cityId: string;
  categoryId: string;
  kind: string;
  label: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export function PlacementEditor({
  placement,
  businesses,
  cities,
  categories,
}: {
  placement: PlacementDraft;
  businesses: Option[];
  cities: Option[];
  categories: Option[];
}) {
  const [state, action, pending] = useActionState(savePlacement, initial);

  return (
    <form action={action}>
      {placement.id ? <input type="hidden" name="id" value={placement.id} /> : null}
      <Feedback state={state} />

      <div className="field">
        <label htmlFor="place-business">Business</label>
        <select id="place-business" name="businessId" defaultValue={placement.businessId} required>
          <option value="">Pick a business</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="place-city">City</label>
          <select id="place-city" name="cityId" defaultValue={placement.cityId}>
            <option value="">Every city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="place-category">Service</label>
          <select id="place-category" name="categoryId" defaultValue={placement.categoryId}>
            <option value="">Every service</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="place-kind">Kind</label>
          <select id="place-kind" name="kind" defaultValue={placement.kind}>
            <option value="FEATURED_PARTNER">Featured partner, beside a list</option>
            <option value="TOP10_LISTING">Top 10 listing subscription</option>
            <option value="CATEGORY_BANNER">Category banner</option>
          </select>
          <span className="field__hint">
            None of these change editorial order. A featured partner sits beside the list, labelled.
          </span>
        </div>
        <div className="field">
          <label htmlFor="place-label">Label</label>
          <input id="place-label" name="label" type="text" defaultValue={placement.label} required />
          <span className="field__hint">The word shown on the block. Keep it honest.</span>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="place-start">Starts</label>
          <input id="place-start" name="startsAt" type="date" defaultValue={placement.startsAt} />
        </div>
        <div className="field">
          <label htmlFor="place-end">Ends</label>
          <input id="place-end" name="endsAt" type="date" defaultValue={placement.endsAt} />
          <span className="field__hint">Blank runs until it is paused.</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="place-status">Status</label>
        <select id="place-status" name="status" defaultValue={placement.status}>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="ENDED">Ended</option>
        </select>
      </div>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save placement"}
      </button>
    </form>
  );
}
