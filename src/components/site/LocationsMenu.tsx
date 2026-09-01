"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight } from "@/components/ui/Icon";
import type { CountryNav } from "@/lib/navigation";

function GlobeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17" />
      <path d="M3.5 15h17" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

/**
 * Two-level Locations menu: a country rail on the left drives the area panel.
 * Every country's regions and metros are rendered, with the inactive ones
 * hidden rather than removed, so the whole location tree stays in the markup.
 */
export function LocationsMenu({ countries }: { countries: CountryNav[] }) {
  const [active, setActive] = useState(0);
  const current = countries[active] ?? countries[0];
  if (!current) return null;

  return (
    <div className="mega__panel mega__panel--locations">
      <div className="crail">
        <p className="mega__label" style={{ margin: "0 0 2px 2px" }}>
          Choose a country
        </p>
        {countries.map((country, index) => (
          <button
            key={country.code}
            type="button"
            className="crail__item"
            data-on={index === active}
            aria-pressed={index === active}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <span className="crail__flag" aria-hidden="true">
              <GlobeIcon />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="crail__name">{country.name}</span>
              <span className="crail__meta">{country.meta}</span>
            </span>
            <span className="crail__chev" aria-hidden="true">
              <ChevronRight size={16} />
            </span>
          </button>
        ))}
        <Link
          className="arrow-link"
          href="/locations/"
          style={{ margin: "6px 0 0 14px", fontSize: 14 }}
        >
          All locations
          <ArrowRight size={15} />
        </Link>
      </div>

      <div>
        {countries.map((country, index) => (
          <div key={country.code} hidden={index !== active}>
            <div className="area-panel__head">
              <p>
                {country.name}
                <span> — browse by {country.unit}</span>
              </p>
              <Link className="arrow-link" href={country.href} style={{ fontSize: 13.5 }}>
                {country.hubLabel}
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="area-panel__grid">
              {country.groups.map((group) => (
                <div key={group.title}>
                  <p className="mega__label">{group.title}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href}>{item.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="metros">
        <p className="mega__label" style={{ marginBottom: 6 }}>
          Top metros
        </p>
        {countries.map((country, index) => (
          <ul key={country.code} hidden={index !== active}>
            {country.cities.map((city) => (
              <li key={city.href}>
                <Link href={city.href}>{city.name}</Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
