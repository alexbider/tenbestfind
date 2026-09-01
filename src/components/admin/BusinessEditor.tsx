"use client";

import { useActionState } from "react";
import { saveBusiness, type ActionState } from "@/app/actions/admin-content";
import { IdListEditor, RepeatableEditor, StringListEditor } from "./RepeatableEditor";
import { MediaField } from "./MediaField";
import { Check } from "@/components/ui/Icon";
import type { Option } from "./GuideEditor";

const initial: ActionState = { status: "idle" };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type BusinessDraft = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  cityId: string;
  status: string;
  tagline: string;
  description: string;
  bestFor: string;
  editorialTake: string;
  strengths: string[];
  considerations: string[];
  logoUrl: string;
  website: string;
  phone: string;
  email: string;
  addressLine: string;
  postalCode: string;
  yearFounded: string;
  employeeCount: string;
  licenseNumber: string;
  warrantyTerms: string;
  emergency: boolean;
  financing: boolean;
  freeEstimates: boolean;
  verified: boolean;
  claimed: boolean;
  googleRating: string;
  googleReviewCount: string;
  hours: Record<string, string>[];
  services: string[];
  areas: string[];
  credentials: Record<string, string>[];
  photos: Record<string, string>[];
};

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

export function BusinessEditor({
  business,
  categories,
  cities,
  subservices,
}: {
  business: BusinessDraft;
  categories: Option[];
  cities: Option[];
  subservices: { id: string; label: string; group?: string }[];
}) {
  const [state, action, pending] = useActionState(saveBusiness, initial);

  return (
    <form action={action}>
      {business.id ? <input type="hidden" name="id" value={business.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor="biz-name">Business name</label>
          <input id="biz-name" name="name" type="text" defaultValue={business.name} required />
        </div>
        <div className="field">
          <label htmlFor="biz-status">Status</label>
          <select id="biz-status" name="status" defaultValue={business.status}>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending review</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="biz-slug">Slug</label>
          <input id="biz-slug" name="slug" type="text" defaultValue={business.slug} required />
          <span className="field__hint">
            /companies/{business.slug || "slug"}/. Changing it redirects the old address.
          </span>
        </div>
        <div className="field">
          <label htmlFor="biz-category">Primary service</label>
          <select id="biz-category" name="categoryId" defaultValue={business.categoryId} required>
            <option value="">Pick a service</option>
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
          <label htmlFor="biz-city">Home city</label>
          <select id="biz-city" name="cityId" defaultValue={business.cityId}>
            <option value="">Not placed</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="biz-tagline">Tagline</label>
          <input id="biz-tagline" name="tagline" type="text" defaultValue={business.tagline} />
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>Editorial fields</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          These belong to the editorial team. A business owner cannot change them from their own
          dashboard, whatever they pay.
        </p>
        <div className="field">
          <label htmlFor="biz-bestfor">Best for</label>
          <input id="biz-bestfor" name="bestFor" type="text" defaultValue={business.bestFor} />
        </div>
        <div className="field">
          <label htmlFor="biz-take">Our take</label>
          <textarea id="biz-take" name="editorialTake" rows={5} defaultValue={business.editorialTake} />
          <span className="field__hint">
            Judgement, not fact. It publishes under a heading that says so.
          </span>
        </div>
        <StringListEditor
          name="strengths"
          label="Strengths"
          initial={business.strengths}
          hint="One per line. What this company does better than its neighbours."
        />
        <div style={{ marginBottom: 0 }}>
          <StringListEditor
            name="considerations"
            label="What to check"
            initial={business.considerations}
            hint="One per line. Published as-is, including on a company that pays us."
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Business provided</legend>
        <div className="field">
          <label htmlFor="biz-description">Description</label>
          <textarea id="biz-description" name="description" rows={4} defaultValue={business.description} />
          <span className="field__hint">Their words, published as their words.</span>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-phone">Phone</label>
            <input id="biz-phone" name="phone" type="tel" defaultValue={business.phone} />
          </div>
          <div className="field">
            <label htmlFor="biz-email">Email</label>
            <input id="biz-email" name="email" type="email" defaultValue={business.email} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-website">Website</label>
            <input id="biz-website" name="website" type="url" defaultValue={business.website} />
          </div>
          <MediaField name="logoUrl" label="Logo" initial={business.logoUrl} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-address">Address</label>
            <input id="biz-address" name="addressLine" type="text" defaultValue={business.addressLine} />
          </div>
          <div className="field">
            <label htmlFor="biz-postal">Postal code</label>
            <input id="biz-postal" name="postalCode" type="text" defaultValue={business.postalCode} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-founded">Year founded</label>
            <input
              id="biz-founded"
              name="yearFounded"
              type="number"
              min="1800"
              max="2100"
              defaultValue={business.yearFounded}
            />
          </div>
          <div className="field">
            <label htmlFor="biz-employees">Team size</label>
            <input
              id="biz-employees"
              name="employeeCount"
              type="text"
              defaultValue={business.employeeCount}
              placeholder="12 to 20"
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-licence">Licence number</label>
            <input
              id="biz-licence"
              name="licenseNumber"
              type="text"
              defaultValue={business.licenseNumber}
            />
          </div>
          <div className="field">
            <label htmlFor="biz-warranty">Warranty terms</label>
            <input
              id="biz-warranty"
              name="warrantyTerms"
              type="text"
              defaultValue={business.warrantyTerms}
            />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Switch name="emergency" label="Emergency service listed" checked={business.emergency} />
          <Switch name="financing" label="Financing available" checked={business.financing} />
          <Switch name="freeEstimates" label="Free estimates" checked={business.freeEstimates} />
          <Switch
            name="verified"
            label="Details verified by an editor"
            hint="Only tick this once someone has actually checked."
            checked={business.verified}
          />
          <Switch
            name="claimed"
            label="Claimed by its owner"
            checked={business.claimed}
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Opening hours</legend>
        <RepeatableEditor
          name="hours"
          summaryKey="day"
          addLabel="Add a day"
          emptyLabel="No hours published for this company."
          fields={[
            {
              key: "day",
              label: "Day",
              type: "select",
              width: "half",
              options: DAYS.map((day) => ({ value: day, label: day })),
            },
            {
              key: "closed",
              label: "Closed",
              type: "select",
              width: "half",
              options: [
                { value: "no", label: "Open" },
                { value: "yes", label: "Closed all day" },
              ],
            },
            { key: "opens", label: "Opens", width: "half", placeholder: "07:00" },
            { key: "closes", label: "Closes", width: "half", placeholder: "18:00" },
          ]}
          initial={business.hours}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Work offered</legend>
        <IdListEditor
          name="services"
          label="Subservices"
          options={subservices}
          initial={business.services}
          hint="What this company actually does. It decides which subservice pages list them."
        />
        <div style={{ marginBottom: 0 }}>
          <IdListEditor
            name="areas"
            label="Areas served"
            options={cities.map((city) => ({ id: city.id, label: city.label }))}
            initial={business.areas}
            hint="The first one checked is treated as the primary area."
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Credentials</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Marking one verified stamps today as the date it was checked, and the profile says who
          checked it against what.
        </p>
        <RepeatableEditor
          name="credentials"
          summaryKey="label"
          addLabel="Add credential"
          emptyLabel="No credentials recorded."
          fields={[
            { key: "label", label: "Credential", placeholder: "State plumbing licence" },
            { key: "identifier", label: "Number", width: "half" },
            { key: "authority", label: "Authority", width: "half" },
            {
              key: "status",
              label: "Status",
              type: "select",
              width: "half",
              options: [
                { value: "REPORTED", label: "Reported by the business" },
                { value: "VERIFIED", label: "Verified against the register" },
                { value: "EXPIRED", label: "Expired" },
              ],
            },
            { key: "sourceUrl", label: "Source URL", width: "half" },
          ]}
          initial={business.credentials}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Photos</legend>
        <RepeatableEditor
          name="photos"
          summaryKey="alt"
          addLabel="Add photo"
          emptyLabel="No photos on this profile."
          fields={[
            { key: "url", label: "Image", type: "media" },
            { key: "alt", label: "Alt text", hint: "Describe the picture for someone who cannot see it." },
          ]}
          initial={business.photos}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Google review data</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Google&apos;s numbers, republished with attribution. Changing the rating stamps today as the
          date it was read.
        </p>
        <div className="field-row" style={{ marginBottom: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="biz-rating">Rating</label>
            <input
              id="biz-rating"
              name="googleRating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              defaultValue={business.googleRating}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="biz-reviews">Review count</label>
            <input
              id="biz-reviews"
              name="googleReviewCount"
              type="number"
              min="0"
              defaultValue={business.googleReviewCount}
            />
          </div>
        </div>
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save business"}
      </button>
    </form>
  );
}
