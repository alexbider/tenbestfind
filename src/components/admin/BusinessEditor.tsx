"use client";

import { useActionState, useMemo, useState } from "react";
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
  overview: string;
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
  staff: Record<string, string>[];
  credentials: Record<string, string>[];
  photos: Record<string, string>[];
  videos: Record<string, string>[];
  factGroups: Record<string, string>[];
  youtubeChannel: string;
  serviceRadiusKm: string;
  specialties: string;
  reviewThemes: Record<string, string>[];
  bbbRating: string;
  bbbAccreditedSince: string;
  inspectionFee: string;
  manufacturerWarranty: string;
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
  subservices: { id: string; label: string; group?: string; categoryId: string }[];
}) {
  const [state, action, pending] = useActionState(saveBusiness, initial);

  // Only the work this service actually covers is offered. Picking a plumbing
  // subservice for a roofer was possible before and produced listings on pages
  // the company has no business being on.
  const [categoryId, setCategoryId] = useState(business.categoryId);
  const offered = useMemo(
    () => subservices.filter((sub) => sub.categoryId === categoryId),
    [subservices, categoryId],
  );

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
            <option value="SUSPENDED">Suspended</option>
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
          <select
            id="biz-category"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
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
          <label htmlFor="biz-overview">Quick overview</label>
          <textarea id="biz-overview" name="overview" rows={5} defaultValue={business.overview} />
          <span className="field__hint">
            About 150 words, shown at the top of the profile. The description below it sits behind
            Read more. Leave this empty and the profile falls back to the description&apos;s first
            paragraph.
          </span>
        </div>
        <div className="field">
          <label htmlFor="biz-description">Description</label>
          <textarea id="biz-description" name="description" rows={8} defaultValue={business.description} />
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
          options={offered}
          initial={business.services}
          hint={
            offered.length > 0
              ? "What this company actually does. It decides which subservice pages list them. Only the work under the service above is offered."
              : "The service above has no subservices yet. Add some under Services and locations."
          }
        />
        <div>
          <IdListEditor
            name="areas"
            label="Areas served"
            options={cities.map((city) => ({ id: city.id, label: city.label }))}
            initial={business.areas}
            hint="The first one checked is treated as the primary area."
          />
        </div>
        <div className="field" style={{ marginBottom: 0, maxWidth: 260 }}>
          <label htmlFor="biz-radius">Travels up to (km)</label>
          <input
            id="biz-radius"
            name="serviceRadiusKm"
            type="number"
            min={1}
            max={500}
            defaultValue={business.serviceRadiusKm}
          />
          <p className="field__hint">
            Draws the coverage ring on the map. Leave empty unless someone has actually established
            it; the map then just frames the areas above.
          </p>
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
            { key: "imageUrl", label: "Certification mark", type: "media" },
          ]}
          initial={business.credentials}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>The team</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Named people at the company. The profile shows this section only when there is someone in
          it, so leaving it empty costs nothing. Filling from the website adds anyone the site
          introduces by name.
        </p>
        <RepeatableEditor
          name="staff"
          summaryKey="name"
          addLabel="Add a person"
          emptyLabel="No team recorded, so the profile shows no team section."
          fields={[
            { key: "name", label: "Name", placeholder: "Marcus Hall", width: "half" },
            { key: "role", label: "Role", placeholder: "Owner and master plumber", width: "half" },
            { key: "bio", label: "About them", type: "textarea" },
            { key: "photoUrl", label: "Photo", type: "media" },
            {
              key: "credentials",
              label: "What they hold",
              width: "half",
              hint: "Comma separated. Published as claimed, not as verified.",
            },
            { key: "yearsExperience", label: "Years in the trade", width: "half" },
          ]}
          initial={business.staff}
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
        <legend>Project videos</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Videos from the company&apos;s own channel. Only the YouTube id is stored, and nothing is
          requested from YouTube until a reader presses play.
        </p>
        <div className="field">
          <label htmlFor="biz-channel">YouTube channel</label>
          <input
            id="biz-channel"
            name="youtubeChannel"
            type="url"
            defaultValue={business.youtubeChannel}
            placeholder="https://www.youtube.com/@company"
          />
          <p className="field__hint">Linked above the grid. Leave empty to hide that link.</p>
        </div>
        <RepeatableEditor
          name="videos"
          summaryKey="title"
          addLabel="Add video"
          emptyLabel="No videos on this profile."
          fields={[
            { key: "videoId", label: "YouTube id", width: "half", hint: "The part after v=, e.g. dQw4w9WgXcQ." },
            { key: "duration", label: "Duration", width: "half", placeholder: "4:12" },
            { key: "title", label: "Title" },
            { key: "meta", label: "Caption", hint: "What it shows and when, e.g. \u201cTear-off to final inspection \u00b7 June 2026\u201d." },
          ]}
          initial={business.videos}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>What customers commonly mention</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Our summary of what recurs across this company&apos;s public reviews, never a quotation of
          one. A theme belongs here only when several independent reviews raise it.
        </p>
        <RepeatableEditor
          name="reviewThemes"
          summaryKey="text"
          addLabel="Add theme"
          emptyLabel="No review themes recorded."
          fields={[
            {
              key: "kind",
              label: "Side",
              type: "select",
              width: "half",
              options: [
                { value: "praised", label: "Frequently praised" },
                { value: "concern", label: "Concern mentioned" },
              ],
            },
            { key: "text", label: "Theme" },
          ]}
          initial={business.reviewThemes}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Reputation and pricing</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Each source is shown on its own card rather than blended into one score. Leave a field
          empty and its card or row is left off the profile.
        </p>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-bbb">BBB rating</label>
            <input id="biz-bbb" name="bbbRating" defaultValue={business.bbbRating} placeholder="A+" />
          </div>
          <div className="field">
            <label htmlFor="biz-bbb-since">BBB accredited since</label>
            <input
              id="biz-bbb-since"
              name="bbbAccreditedSince"
              type="number"
              min={1900}
              max={2100}
              defaultValue={business.bbbAccreditedSince}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="biz-inspection">Inspection fee</label>
            <input
              id="biz-inspection"
              name="inspectionFee"
              defaultValue={business.inspectionFee}
              placeholder="Free, including storm inspections"
            />
          </div>
          <div className="field">
            <label htmlFor="biz-mfr">Manufacturer warranty</label>
            <input
              id="biz-mfr"
              name="manufacturerWarranty"
              defaultValue={business.manufacturerWarranty}
              placeholder="Up to 50 years by system"
            />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="biz-specialties">Specialties</label>
          <textarea
            id="biz-specialties"
            name="specialties"
            rows={4}
            defaultValue={business.specialties}
          />
          <p className="field__hint">One per line. Shown as chips under the services list.</p>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>At a glance</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          The facts panel near the top of the profile. Rows are gathered under their group in the
          order they first appear here, so put the rows of a group together. Leave it empty and the
          panel is left off the page rather than shown half filled.
        </p>
        <RepeatableEditor
          name="factGroups"
          summaryKey="label"
          addLabel="Add fact"
          emptyLabel="No facts recorded."
          fields={[
            { key: "group", label: "Group", width: "half", placeholder: "The work" },
            { key: "iconKey", label: "Icon key", width: "half", hint: "Used on the first row of each group." },
            { key: "label", label: "Label", width: "half", placeholder: "Best for" },
            { key: "value", label: "Value", width: "half", placeholder: "Residential roof replacement" },
          ]}
          initial={business.factGroups}
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
