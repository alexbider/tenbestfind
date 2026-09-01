import Link from "next/link";
import { PinIcon, SearchIcon } from "@/components/ui/Icon";

export type SuggestGroup = {
  title: string;
  items: { name: string; href: string }[];
};

/**
 * Dual-field search. Suggestions render as real links and reveal on focus, so
 * the whole list is crawlable with no JavaScript.
 */
export function SearchForm({
  servicePlaceholder = "Plumber, roofer, HVAC, chimney…",
  locationPlaceholder = "Your city or postal code",
  submitLabel = "Find the best",
  idPrefix = "search",
  suggestions,
  lockedLocation,
  lockedService,
  showIcons = true,
}: {
  servicePlaceholder?: string;
  locationPlaceholder?: string;
  submitLabel?: string;
  idPrefix?: string;
  suggestions?: SuggestGroup[];
  lockedLocation?: { label: string; value: string };
  lockedService?: { label: string; value: string };
  showIcons?: boolean;
}) {
  return (
    <div className="searchbox">
      <form action="/search/" method="get" role="search" aria-label="Find local businesses" className="search-form">
        <div className="search-form__field" style={{ flex: 1.15 }}>
          {showIcons ? <SearchIcon /> : null}
          <label htmlFor={`${idPrefix}-service`} className="sr-only">
            What service do you need?
          </label>
          {lockedService ? (
            <input
              id={`${idPrefix}-service`}
              name="service"
              type="text"
              defaultValue={lockedService.value}
              readOnly
              aria-label={lockedService.label}
            />
          ) : (
            <input
              id={`${idPrefix}-service`}
              name="service"
              type="text"
              autoComplete="off"
              placeholder={servicePlaceholder}
            />
          )}
        </div>
        <div className="search-form__divider" aria-hidden="true" />
        <div className="search-form__field" style={{ flex: 1 }}>
          {showIcons ? <PinIcon /> : null}
          <label htmlFor={`${idPrefix}-location`} className="sr-only">
            Your city or postal code
          </label>
          {lockedLocation ? (
            <input
              id={`${idPrefix}-location`}
              name="location"
              type="text"
              defaultValue={lockedLocation.value}
              readOnly
              aria-label={lockedLocation.label}
            />
          ) : (
            <input
              id={`${idPrefix}-location`}
              name="location"
              type="text"
              autoComplete="off"
              placeholder={locationPlaceholder}
            />
          )}
        </div>
        <button type="submit">{submitLabel}</button>
      </form>

      {suggestions && suggestions.length > 0 ? (
        <div className="suggest" role="listbox" aria-label="Suggestions">
          {suggestions.map((group) => (
            <div className="suggest__group" key={group.title}>
              <p>{group.title}</p>
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
      ) : null}
    </div>
  );
}
