"use client";

import { useActionState, useMemo, useState } from "react";
import { createBatch } from "@/app/actions/admin-import";
import type { ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type CityOption = { id: string; name: string; region: string; regionId: string };
export type CategoryOption = { id: string; name: string; serviceName: string };

/**
 * Defining a batch. The estimate is shown as it is built because the cost of a
 * run scales with cities times places, and that is the number worth seeing
 * before pressing the button rather than after.
 */
export function BatchForm({
  categories,
  cities,
}: {
  categories: CategoryOption[];
  cities: CityOption[];
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

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

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
          {visible.map((city) => (
            <label key={city.id} className="radio-row" style={{ margin: 0, padding: "8px 12px" }}>
              <input
                type="checkbox"
                checked={selected.includes(city.id)}
                onChange={() => toggle(city.id)}
              />
              <span>
                <strong>{city.name}</strong>
                <span>{city.region}</span>
              </span>
            </label>
          ))}
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
