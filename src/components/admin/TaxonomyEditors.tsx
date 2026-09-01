"use client";

import { useActionState } from "react";
import { saveCategory, saveCity, saveCountry, saveRegion } from "@/app/actions/admin-taxonomy";
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

/** The checkbox rows used across these forms, so they look and behave alike. */
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

/* ------------------------------------------------------------- categories */

export type CategoryDraft = {
  id?: string;
  name: string;
  singular: string;
  serviceName: string;
  slug: string;
  iconKey: string;
  tagline: string;
  description: string;
  groupName: string;
  navGroup: string;
  navOrder: string;
  sortOrder: string;
  featured: boolean;
  wide: boolean;
  trending: boolean;
  published: boolean;
  subservices: Record<string, string>[];
};

export function CategoryEditor({ category }: { category: CategoryDraft }) {
  const [state, action, pending] = useActionState(saveCategory, initial);

  return (
    <form action={action}>
      {category.id ? <input type="hidden" name="id" value={category.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="cat-name">Plural name</label>
          <input id="cat-name" name="name" type="text" defaultValue={category.name} required />
          <span className="field__hint">How the trade is listed: Plumbers.</span>
        </div>
        <div className="field">
          <label htmlFor="cat-singular">Singular</label>
          <input
            id="cat-singular"
            name="singular"
            type="text"
            defaultValue={category.singular}
            required
          />
          <span className="field__hint">Used mid-sentence: a plumber.</span>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="cat-service">Service name</label>
          <input
            id="cat-service"
            name="serviceName"
            type="text"
            defaultValue={category.serviceName}
            required
          />
          <span className="field__hint">The work itself: plumbing.</span>
        </div>
        <div className="field">
          <label htmlFor="cat-slug">Slug</label>
          <input id="cat-slug" name="slug" type="text" defaultValue={category.slug} required />
          <span className="field__hint">
            /{category.slug || "slug"}/. Changing it redirects the old address.
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="cat-tagline">Tagline</label>
        <input
          id="cat-tagline"
          name="tagline"
          type="text"
          defaultValue={category.tagline}
          placeholder="Repairs · Drains · Water heaters"
        />
      </div>

      <div className="field">
        <label htmlFor="cat-description">Description</label>
        <textarea id="cat-description" name="description" rows={4} defaultValue={category.description} />
      </div>

      <fieldset className="fieldset">
        <legend>Placement</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="cat-group">Editorial band</label>
            <input
              id="cat-group"
              name="groupName"
              type="text"
              defaultValue={category.groupName}
              placeholder="Essential home systems"
            />
            <span className="field__hint">Groups the tile on the services index.</span>
          </div>
          <div className="field">
            <label htmlFor="cat-nav">Menu column</label>
            <input
              id="cat-nav"
              name="navGroup"
              type="text"
              defaultValue={category.navGroup}
              placeholder="Home systems"
            />
            <span className="field__hint">Blank keeps it out of the header menu.</span>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="cat-navorder">Menu order</label>
            <input id="cat-navorder" name="navOrder" type="number" defaultValue={category.navOrder} />
          </div>
          <div className="field">
            <label htmlFor="cat-sort">Sort order</label>
            <input id="cat-sort" name="sortOrder" type="number" defaultValue={category.sortOrder} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Switch
            name="featured"
            label="Featured on the homepage grid"
            checked={category.featured}
          />
          <Switch name="wide" label="Double-width tile" checked={category.wide} />
          <Switch name="trending" label="Marked trending" checked={category.trending} />
          <Switch
            name="published"
            label="Published"
            hint="Unpublishing hides the hub and drops it from the menu."
            checked={category.published}
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Subservices</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Each one publishes at /{category.slug || "service"}/subservice/. Keep the slug stable: it is
          what links businesses to the work they do.
        </p>
        <RepeatableEditor
          name="subservices"
          summaryKey="name"
          addLabel="Add subservice"
          emptyLabel="No subservices yet."
          fields={[
            { key: "name", label: "Name", width: "half" },
            { key: "slug", label: "Slug", width: "half" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "iconKey", label: "Icon key", width: "half" },
            {
              key: "trending",
              label: "Trending",
              type: "select",
              width: "half",
              options: [
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ],
            },
          ]}
          initial={category.subservices}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save service"}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------- countries */

export type CountryDraft = {
  id?: string;
  code: string;
  name: string;
  slug: string;
  demonym: string;
  currency: string;
  blurb: string;
  heroImage: string;
  regionLabel: string;
  sortOrder: string;
  published: boolean;
  faqs: Record<string, string>[];
};

export function CountryEditor({ country }: { country: CountryDraft }) {
  const [state, action, pending] = useActionState(saveCountry, initial);

  return (
    <form action={action}>
      {country.id ? <input type="hidden" name="id" value={country.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="country-name">Name</label>
          <input id="country-name" name="name" type="text" defaultValue={country.name} required />
        </div>
        <div className="field">
          <label htmlFor="country-code">Code</label>
          <input id="country-code" name="code" type="text" defaultValue={country.code} required />
          <span className="field__hint">
            The first segment of every location URL: /{country.code || "us"}/.
          </span>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="country-slug">Slug</label>
          <input id="country-slug" name="slug" type="text" defaultValue={country.slug} required />
        </div>
        <div className="field">
          <label htmlFor="country-demonym">Demonym</label>
          <input
            id="country-demonym"
            name="demonym"
            type="text"
            defaultValue={country.demonym}
            placeholder="American"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="country-currency">Currency</label>
          <input
            id="country-currency"
            name="currency"
            type="text"
            maxLength={3}
            defaultValue={country.currency}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="country-regionlabel">Region wording</label>
          <select id="country-regionlabel" name="regionLabel" defaultValue={country.regionLabel}>
            <option value="states">States</option>
            <option value="provinces">Provinces</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="country-blurb">Blurb</label>
        <textarea id="country-blurb" name="blurb" rows={4} defaultValue={country.blurb} />
      </div>

      <div className="field-row">
        <MediaField name="heroImage" label="Hero image" initial={country.heroImage} />
        <div className="field">
          <label htmlFor="country-sort">Sort order</label>
          <input id="country-sort" name="sortOrder" type="number" defaultValue={country.sortOrder} />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Switch name="published" label="Published" checked={country.published} />
      </div>

      <fieldset className="fieldset">
        <legend>Questions on the country hub</legend>
        <RepeatableEditor
          name="faqs"
          summaryKey="question"
          addLabel="Add question"
          emptyLabel="No questions on this hub."
          fields={[
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer", type: "textarea" },
          ]}
          initial={country.faqs}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save country"}
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------- regions */

export type RegionDraft = {
  id?: string;
  countryId: string;
  code: string;
  name: string;
  slug: string;
  blurb: string;
  heroImage: string;
  groupName: string;
  sortOrder: string;
  published: boolean;
  licensing: Record<string, string>[];
};

export function RegionEditor({
  region,
  countries,
}: {
  region: RegionDraft;
  countries: Option[];
}) {
  const [state, action, pending] = useActionState(saveRegion, initial);

  return (
    <form action={action}>
      {region.id ? <input type="hidden" name="id" value={region.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="region-name">Name</label>
          <input id="region-name" name="name" type="text" defaultValue={region.name} required />
        </div>
        <div className="field">
          <label htmlFor="region-country">Country</label>
          <select id="region-country" name="countryId" defaultValue={region.countryId} required>
            <option value="">Pick a country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="region-code">Code</label>
          <input id="region-code" name="code" type="text" defaultValue={region.code} required />
          <span className="field__hint">Two letters, lowercase: fl, tx, on.</span>
        </div>
        <div className="field">
          <label htmlFor="region-slug">Slug</label>
          <input id="region-slug" name="slug" type="text" defaultValue={region.slug} required />
          <span className="field__hint">Changing it redirects the old address.</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="region-blurb">Blurb</label>
        <textarea id="region-blurb" name="blurb" rows={4} defaultValue={region.blurb} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="region-group">Menu grouping</label>
          <input
            id="region-group"
            name="groupName"
            type="text"
            defaultValue={region.groupName}
            placeholder="South"
          />
        </div>
        <div className="field">
          <label htmlFor="region-sort">Sort order</label>
          <input id="region-sort" name="sortOrder" type="number" defaultValue={region.sortOrder} />
        </div>
      </div>

      <MediaField name="heroImage" label="Hero image" initial={region.heroImage} />

      <div style={{ marginBottom: 18 }}>
        <Switch name="published" label="Published" checked={region.published} />
      </div>

      <fieldset className="fieldset">
        <legend>Trade licensing</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          What this state or province actually requires, trade by trade. It publishes on the region
          hub with the authority named, so a reader can check it themselves.
        </p>
        <RepeatableEditor
          name="licensing"
          summaryKey="trade"
          addLabel="Add trade"
          emptyLabel="No licensing notes recorded."
          fields={[
            { key: "trade", label: "Trade", width: "half" },
            {
              key: "licensed",
              label: "Licence required",
              type: "select",
              width: "half",
              options: [
                { value: "yes", label: "Yes" },
                { value: "no", label: "No state licence" },
              ],
            },
            { key: "authority", label: "Authority" },
            { key: "note", label: "Note", type: "textarea" },
          ]}
          initial={region.licensing}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save region"}
      </button>
    </form>
  );
}

/* ----------------------------------------------------------------- cities */

export type CityDraft = {
  id?: string;
  regionId: string;
  name: string;
  slug: string;
  county: string;
  latitude: string;
  longitude: string;
  population: string;
  blurb: string;
  heroImage: string;
  neighborhoods: string[];
  conditions: Record<string, string>[];
  topMetro: boolean;
  sortOrder: string;
  published: boolean;
};

export function CityEditor({ city, regions }: { city: CityDraft; regions: Option[] }) {
  const [state, action, pending] = useActionState(saveCity, initial);

  return (
    <form action={action}>
      {city.id ? <input type="hidden" name="id" value={city.id} /> : null}
      <Feedback state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="city-name">Name</label>
          <input id="city-name" name="name" type="text" defaultValue={city.name} required />
        </div>
        <div className="field">
          <label htmlFor="city-region">Region</label>
          <select id="city-region" name="regionId" defaultValue={city.regionId} required>
            <option value="">Pick a region</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city-slug">Slug</label>
          <input id="city-slug" name="slug" type="text" defaultValue={city.slug} required />
          <span className="field__hint">Changing it redirects the old address and every list under it.</span>
        </div>
        <div className="field">
          <label htmlFor="city-county">County</label>
          <input id="city-county" name="county" type="text" defaultValue={city.county} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city-lat">Latitude</label>
          <input id="city-lat" name="latitude" type="number" step="any" defaultValue={city.latitude} />
        </div>
        <div className="field">
          <label htmlFor="city-lng">Longitude</label>
          <input id="city-lng" name="longitude" type="number" step="any" defaultValue={city.longitude} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city-pop">Population</label>
          <input id="city-pop" name="population" type="number" defaultValue={city.population} />
        </div>
        <div className="field">
          <label htmlFor="city-sort">Sort order</label>
          <input id="city-sort" name="sortOrder" type="number" defaultValue={city.sortOrder} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="city-blurb">Blurb</label>
        <textarea id="city-blurb" name="blurb" rows={4} defaultValue={city.blurb} />
      </div>

      <MediaField name="heroImage" label="Hero image" initial={city.heroImage} />

      <StringListEditor
        name="neighborhoods"
        label="Neighborhoods"
        initial={city.neighborhoods}
        hint="One per line. Used on the city hub and in local search wording."
      />

      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <Switch
          name="topMetro"
          label="Top metro"
          hint="Lists it under Top metros in the header menu."
          checked={city.topMetro}
        />
        <Switch name="published" label="Published" checked={city.published} />
      </div>

      <fieldset className="fieldset">
        <legend>Local market conditions</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          What makes this market different: climate, housing stock, permit rules. Three or four is
          plenty.
        </p>
        <RepeatableEditor
          name="conditions"
          summaryKey="title"
          addLabel="Add condition"
          emptyLabel="No local conditions recorded."
          fields={[
            { key: "title", label: "Title", width: "half" },
            { key: "iconKey", label: "Icon key", width: "half" },
            { key: "body", label: "What it means for a homeowner", type: "textarea" },
          ]}
          initial={city.conditions}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save city"}
      </button>
    </form>
  );
}
