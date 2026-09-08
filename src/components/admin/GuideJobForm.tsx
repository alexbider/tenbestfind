"use client";

import { useActionState, useState } from "react";
import { createGuideJob, type ActionState } from "@/app/actions/admin-writer";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS } from "@/lib/enums";

const initial: ActionState = { status: "idle" };

export type Option = { id: string; label: string };
export type LocationOption = Option & { countryId: string; regionId?: string };

/**
 * Commissioning one guide.
 *
 * The location fields cascade rather than being three independent selects: a
 * guide tagged to a city in a region of a country is one claim, and picking a
 * city from a flat list of two thousand is not a thing anyone can do.
 */
export function GuideJobForm({
  templates,
  categories,
  countries,
  regions,
  cities,
  researchReady,
}: {
  templates: (Option & { isDefault: boolean; guideType: string | null })[];
  categories: Option[];
  countries: Option[];
  regions: LocationOption[];
  cities: LocationOption[];
  researchReady: boolean;
}) {
  const [state, action, pending] = useActionState(createGuideJob, initial);
  const [countryId, setCountryId] = useState("");
  const [regionId, setRegionId] = useState("");

  const visibleRegions = regions.filter((region) => region.countryId === countryId);
  const visibleCities = cities.filter((city) => city.regionId === regionId);

  return (
    <form action={action}>
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {!researchReady ? (
        <p className="form-error" style={{ background: "var(--amber-50, #fff8e6)" }}>
          DataForSEO is not connected, so this will be written without search research. Add the
          login and password under Integrations first if you want the brief.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="job-topic">What should this guide answer?</label>
        <input
          id="job-topic"
          name="topic"
          type="text"
          required
          minLength={8}
          placeholder="How much does a furnace replacement cost, and what changes the number"
        />
        <span className="field__hint">
          A question, not a title. The writer decides the title from this and from the research.
        </span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="job-keyword">Phrase to rank for</label>
          <input id="job-keyword" name="keyword" type="text" placeholder="furnace replacement cost" />
          <span className="field__hint">Left blank, the topic is researched as typed.</span>
        </div>
        <div className="field">
          <label htmlFor="job-type">Which hub it belongs on</label>
          <select id="job-type" name="guideType" defaultValue="COST">
            {GUIDE_TYPES.map((type) => (
              <option key={type} value={type}>
                {GUIDE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="job-template">Prompt template</label>
          <select
            id="job-template"
            name="templateId"
            defaultValue={templates.find((template) => template.isDefault)?.id ?? ""}
          >
            <option value="">Use the default</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
                {template.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="job-category">Trade</label>
          <select id="job-category" name="categoryId" defaultValue="">
            <option value="">General, no trade</option>
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
          <label htmlFor="job-country">Country</label>
          <select
            id="job-country"
            name="countryId"
            value={countryId}
            onChange={(event) => {
              setCountryId(event.target.value);
              setRegionId("");
            }}
          >
            <option value="">National, no country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="job-region">State or province</label>
          <select
            id="job-region"
            name="regionId"
            value={regionId}
            onChange={(event) => setRegionId(event.target.value)}
            disabled={visibleRegions.length === 0}
          >
            <option value="">Whole country</option>
            {visibleRegions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="job-city">City</label>
          <select id="job-city" name="cityId" defaultValue="" disabled={visibleCities.length === 0}>
            <option value="">Whole state</option>
            {visibleCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="job-brief">Anything specific to this one</label>
        <textarea
          id="job-brief"
          name="brief"
          rows={4}
          placeholder="Cover the difference between a like-for-like swap and a system upgrade, and say plainly that ductwork is usually the reason two quotes differ."
        />
        <span className="field__hint">
          Added on top of the template. Leave it blank when the template already says enough.
        </span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="job-scheduled">Start writing at</label>
          <input id="job-scheduled" name="scheduledFor" type="datetime-local" />
          <span className="field__hint">Leave empty and the worker starts within seconds.</span>
        </div>
        <div className="field">
          <label htmlFor="job-publish">Publish at</label>
          <input id="job-publish" name="publishAt" type="datetime-local" />
          <span className="field__hint">
            Only takes effect once you have accepted the draft and set an author. A guide with no byline is never
            published on a timer.
          </span>
        </div>
      </div>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Queueing…" : "Commission this guide"}
      </button>
    </form>
  );
}
