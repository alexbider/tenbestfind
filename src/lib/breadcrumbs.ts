// The trail every page prints, and the one it publishes.
//
// Built in one place because they have to be identical: a visible breadcrumb
// that walks Home > Locations > Ohio while the BreadcrumbList schema walks
// Home > United States > Ohio is two different claims about where the page
// sits, and search engines read the second one.
//
// The shapes below are deliberate rather than uniform. A location page is
// reached through the Locations hub, so its trail says so. A ranking and a
// company profile are reached from the place itself, so theirs walk the
// geography directly. That is how a reader actually arrives at each.

import { routes, type Crumb } from "./urls";

type CountryRef = { code: string; name: string };
type RegionRef = { slug: string; name: string };
type CityRef = { slug: string; name: string };
type CategoryRef = { slug: string; name: string };

const home: Crumb = { label: "Home", href: "/" };
const locations: Crumb = { label: "Locations", href: routes.locationsIndex() };
const homeServices: Crumb = { label: "Home Services", href: routes.servicesIndex() };

/** Home > Home Services > Plumbers */
export function serviceCrumbs(category: { name: string }): Crumb[] {
  return [home, homeServices, { label: category.name }];
}

/** Home > Home Services > Plumbers > Emergency Plumbing */
export function subserviceCrumbs(category: CategoryRef, subservice: { name: string }): Crumb[] {
  return [home, homeServices, { label: category.name, href: routes.category(category.slug) }, { label: subservice.name }];
}

/** Home > Locations > United States */
export function countryCrumbs(country: { name: string }): Crumb[] {
  return [home, locations, { label: country.name }];
}

/** Home > Locations > United States > Ohio */
export function regionCrumbs(country: CountryRef, region: { name: string }): Crumb[] {
  return [home, locations, { label: country.name, href: routes.country(country.code) }, { label: region.name }];
}

/** Home > Locations > United States > Ohio > Columbus */
export function cityCrumbs(country: CountryRef, region: RegionRef, city: { name: string }): Crumb[] {
  return [
    home,
    locations,
    { label: country.name, href: routes.country(country.code) },
    { label: region.name, href: routes.region(country.code, region.slug) },
    { label: city.name },
  ];
}

/**
 * Home > United States > Ohio > Columbus > Plumbers
 *
 * No Locations step: a ranking is reached from the place, and the hub is one
 * click away through the city above it either way.
 */
export function rankingCrumbs(
  country: CountryRef,
  region: RegionRef,
  city: CityRef,
  category: { name: string },
): Crumb[] {
  return [
    home,
    { label: country.name, href: routes.country(country.code) },
    { label: region.name, href: routes.region(country.code, region.slug) },
    { label: city.name, href: routes.city(country.code, region.slug, city.slug) },
    { label: category.name },
  ];
}

/** Home > United States > Ohio > Columbus > Plumbers > 1-Tom-Plumber */
export function companyCrumbs(
  country: CountryRef,
  region: RegionRef,
  city: CityRef,
  category: CategoryRef,
  business: { name: string },
): Crumb[] {
  return [
    home,
    { label: country.name, href: routes.country(country.code) },
    { label: region.name, href: routes.region(country.code, region.slug) },
    { label: city.name, href: routes.city(country.code, region.slug, city.slug) },
    {
      label: category.name,
      href: routes.ranking(country.code, region.slug, city.slug, category.slug),
    },
    { label: business.name },
  ];
}

/**
 * The same trail as JSON-LD. Every item carries a position and a name; only the
 * ones that are links carry an item, because the last crumb is the page itself
 * and pointing it at itself adds nothing.
 */
export function breadcrumbSchema(items: Crumb[], absolute: (path: string) => string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absolute(crumb.href) } : {}),
    })),
  };
}
