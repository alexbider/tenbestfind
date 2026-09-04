"use client";

import { useActionState, useMemo, useState } from "react";
import { createBatch } from "@/app/actions/admin-import";
import type { ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type CityOption = { id: string; name: string; region: string; regionId: string };
export type CategoryOption = { id: string; name: string; serviceName: string };
/** How many listings already exist, keyed `categoryId:cityId`. */
export type ExistingCounts = Record<string, number>;

/**
 * Defining a batch. The estimate is shown as it is built because the cost of a
 * run scales with cities times places, and that is the number worth seeing
 * before pressing the button rather than after.
 */
export function BatchForm({
  categories,
  cities,
  existing,
}: {
  categories: CategoryOption[];
  cities: CityOption[];
  existing: ExistingCounts;
}) {
  const [state, action, pending] = useActionState(createBatch, initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [perCity, setPerCity] = useState(20);
  const [filter, setFilter] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(needle) || city.region.toLowerCase().includes(needle),
    );
  }, [cities, filter]);

  const category = categories.find((entry) => entry.id === categoryId);
  const ceiling = selected.length * perCity;

  /** How many of this trade are already listed in that city. */
  const done = (cityId: string) => existing[`${categoryId}:${cityId}`] ?? 0;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  // Select-all works on what the filter is showing, not on every city there is.
  // Typing "tx" and pressing it should take Texas, which is what someone means.
  const shownIds = visible.map((city) => city.id);
  const allShownSelected =
    shownIds.length > 0 && shownIds.every((id) => selected.includes(id));

  const toggleAllShown = () =>
    setSelected((current) =>
      allShownSelected
        ? current.filter((id) => !shownIds.includes(id))
        : [...new Set([...current, ...shownIds])],
    );

  // The ones with nothing listed yet, which is usually where a new batch should
  // go rather than over ground already covered.
  const selectUncovered = () =>
    setSelected([...new Set([...selected, ...shownIds.filter((id) => done(id) === 0)])]);

  const uncoveredCount = shownIds.filter((id) => done(id) === 0).length;
  const alreadyCovered = selected.filter((id) => done(id) > 0);

  return (
    <form action={action}>
      <input type="hidden" name="cityIds" value={selected.join(",")} />

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <fieldset className="fieldset">
        <legend>What to scrape</legend>

        <div className="field">
          <label htmlFor="name">Batch name</label>
          <input id="name" name="name" type="text" placeholder="Texas roofers, first pass" required />
          <span className="field__hint">Only you see this. It labels the run in the list.</span>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="categoryId">Service</label>
            <select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <span className="field__hint">
              {category ? `Searches "${category.serviceName} in <city>, <state>"` : ""}
            </span>
          </div>

          <div className="field">
            <label htmlFor="perCity">Places per city</label>
            <input
              id="perCity"
              name="perCity"
              type="number"
              min={1}
              max={120}
              value={perCity}
              onChange={(event) => setPerCity(Number(event.target.value) || 1)}
            />
            <span className="field__hint">Google rarely returns more than 100 for one query.</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Cities</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
          One search runs per city, so a result can always be traced back to the city that found it.
          {selected.length > 0 ? (
            <>
              {" "}
              <strong style={{ color: "var(--ink)" }}>
                {selected.length} selected, up to {ceiling} places.
              </strong>
            </>
          ) : null}
        </p>

        <div className="field">
          <label htmlFor="cityFilter">Filter</label>
          <input
            id="cityFilter"
            type="text"
            value={filter}
            placeholder="Type a city or state"
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "0 0 12px" }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={toggleAllShown}
            disabled={shownIds.length === 0}
          >
            {allShownSelected ? "Clear" : "Select"} all {filter.trim() ? `${shownIds.length} shown` : "cities"}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={selectUncovered}
            disabled={uncoveredCount === 0}
          >
            Select the {uncoveredCount} with no {category ? category.name.toLowerCase() : "listings"} yet
          </button>
          {selected.length > 0 ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setSelected([])}>
              Clear selection
            </button>
          ) : null}
        </div>

        {alreadyCovered.length > 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
            {alreadyCovered.length} of the selected cities already has listings for this service.
            Anything the scraper finds again is skipped as a duplicate rather than written twice, so
            this only costs the search itself.
          </p>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            maxHeight: 320,
            overflowY: "auto",
            padding: 4,
          }}
        >
          {visible.map((city) => {
            const listed = done(city.id);
            return (
              <label key={city.id} className="radio-row" style={{ margin: 0, padding: "8px 12px" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(city.id)}
                  onChange={() => toggle(city.id)}
                />
                <span>
                  <strong>{city.name}</strong>
                  <span>
                    {city.region}
                    {listed > 0 ? ` · ${listed} listed` : ""}
                  </span>
                </span>
              </label>
            );
          })}
          {visible.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>No city matches that.</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Quality bar</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="minRating">Minimum Google rating</label>
            <input id="minRating" name="minRating" type="number" step="0.1" min="0" max="5" placeholder="4.0" />
            <span className="field__hint">Leave blank to take everything.</span>
          </div>
          <div className="field">
            <label htmlFor="minReviews">Minimum review count</label>
            <input id="minReviews" name="minReviews" type="number" min="0" placeholder="10" />
            <span className="field__hint">Filters out profiles with almost no history.</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Quality gate</legend>
        <p className="field__hint" style={{ marginBottom: 12 }}>
          Everything a listing shows comes off the company\u2019s own site: the description, the
          services, the photos, the credentials and the address to write to. A company that gives us
          none of that is a stub, so the batch drops it rather than importing it. Each check is on
          unless you turn it off here, and every drop is recorded against the company with the
          reason.
        </p>

        <label className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
          <input type="checkbox" name="allowNoWebsite" />
          <span>
            <strong>Import companies with no website of their own</strong>
            <span>
              Off by default. A company with no site, or only a Facebook or Yelp page, is skipped
              before anything is spent on it.
            </span>
          </span>
        </label>

        <label className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
          <input type="checkbox" name="allowDeadSite" />
          <span>
            <strong>Import companies whose website does not answer</strong>
            <span>
              Off by default. A site that is down, blocks crawlers, or carries nothing but a
              navigation bar is skipped.
            </span>
          </span>
        </label>

        <label className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
          <input type="checkbox" name="allowNoEmail" />
          <span>
            <strong>Import companies with no email address</strong>
            <span>
              Off by default. The address is read from Google, then from the site: mailto links,
              plain text, entity-encoded, spelled out, and Cloudflare-protected. If none of that
              finds one, the company is skipped.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="fieldset">
        <legend>What happens after writing</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="autoPublishScore">Auto-publish at or above</label>
            <input
              id="autoPublishScore"
              name="autoPublishScore"
              type="number"
              min={0}
              max={100}
              defaultValue={90}
            />
            <span className="field__hint">
              Listings scoring below this land as drafts for you to skim. 100 means nothing publishes
              itself.
            </span>
          </div>
          <div className="field">
            <label htmlFor="rankingSize">Ranking size</label>
            <input id="rankingSize" name="rankingSize" type="number" min={3} max={20} defaultValue={10} />
          </div>
        </div>

        <label className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
          <input type="checkbox" name="buildRanking" defaultChecked />
          <span>
            <strong>Build the city ranking from the Google Maps order</strong>
            <span>
              Creates or refreshes the top {"{n}"} for this service in each city, in the order Google
              returned. The methodology note on the ranking says so.
            </span>
          </span>
        </label>

        <div className="field">
          <label htmlFor="note">Note</label>
          <textarea id="note" name="note" rows={2} placeholder="Why you ran this, for the next person." />
        </div>
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending || selected.length === 0}>
        {pending ? "Queueing…" : `Queue batch${ceiling ? ` (up to ${ceiling} places)` : ""}`}
      </button>
    </form>
  );
}
