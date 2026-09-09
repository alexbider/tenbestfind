// The knowledge graph, in one place.
//
// Structured data is only worth writing if the pieces refer to each other. A
// page that says it is a WebPage, beside a list that says it is an ItemList,
// beside an Organization nobody points at, describes three unrelated things and
// is read as three unrelated things. What makes it a graph is the @id: one
// stable name per entity, minted the same way everywhere, so a reference on a
// ranking page resolves to the Person defined on an editor's page and to the
// publisher defined in the root layout.
//
// So every id in this file comes from a function rather than a literal, and
// every builder drops a property it has no value for rather than emitting it
// empty. An absent property means nobody has said; an empty one is a claim that
// the answer is nothing.

import { parseJson, parseList } from "./json";
import { absoluteUrl, routes } from "./urls";

/* --------------------------------------------------------------------- ids */

/** The site itself, defined once in the root layout. */
export const websiteId = () => absoluteUrl("/#website");

/** Whoever publishes it, also defined in the root layout. */
export const publisherId = () => absoluteUrl("/#publisher");

/** One editor. Defined on their own page, referenced from everything they signed. */
export const personId = (slug: string) => `${absoluteUrl(routes.expert(slug))}#person`;

/** One company, defined on its profile and referenced from every list it is in. */
export const businessId = (slug: string) => `${absoluteUrl(routes.business(slug))}#business`;

/** The page itself, whatever kind of page it is. */
export const pageId = (path: string) => `${absoluteUrl(path)}#webpage`;

/** The list on a ranking page, kept apart from the page that carries it. */
export const listId = (path: string) => `${absoluteUrl(path)}#list`;

/** The service a hub page is about. */
export const serviceId = (path: string) => `${absoluteUrl(path)}#service`;

/* ------------------------------------------------------------------ people */

export type PersonInput = {
  slug: string;
  name: string;
  role: string;
  bio?: string | null;
  portrait?: string | null;
  email?: string | null;
  yearsExperience?: number | null;
  /** What they cover, as plain subject names. */
  knowsAbout?: string[];
  /** Professional profiles elsewhere: LinkedIn, a trade body, a personal site. */
  sameAs?: string[];
};

/**
 * A named editor, as an entity rather than a byline.
 *
 * This is the piece that makes an editorial claim checkable: a "best of" list
 * signed by a Person with a job title, a stated field and a profile elsewhere
 * is a different kind of claim from one signed by nobody.
 */
export function personEntity(person: PersonInput): Record<string, unknown> {
  const entity: Record<string, unknown> = {
    "@type": "Person",
    "@id": personId(person.slug),
    name: person.name,
    url: absoluteUrl(routes.expert(person.slug)),
    jobTitle: person.role,
    worksFor: { "@id": publisherId() },
  };

  if (person.bio) entity.description = person.bio;
  if (person.portrait) entity.image = absoluteUrl(person.portrait);
  if (person.email) entity.email = person.email;
  if (person.knowsAbout && person.knowsAbout.length > 0) entity.knowsAbout = person.knowsAbout;
  if (person.sameAs && person.sameAs.length > 0) entity.sameAs = person.sameAs;
  return entity;
}

/** A reference to an editor, for author and reviewedBy. */
export const personRef = (slug: string) => ({ "@id": personId(slug) });

/**
 * A Person row as the graph wants it.
 *
 * Both JSON columns are unpacked here rather than at each call site, so a
 * ranking and the editor's own page describe the same person the same way
 * instead of one of them quietly omitting half of it.
 */
export function personFromRow(row: {
  slug: string;
  name: string;
  role: string;
  bio?: string | null;
  portrait?: string | null;
  email?: string | null;
  yearsExperience?: number | null;
  specializations?: string | null;
  links?: string | null;
}): PersonInput {
  const specializations = parseList(row.specializations);
  const links = parseJson<{ label?: string; url?: string }[]>(row.links, []);

  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    bio: row.bio,
    portrait: row.portrait,
    email: row.email,
    yearsExperience: row.yearsExperience,
    knowsAbout: specializations,
    sameAs: (Array.isArray(links) ? links : [])
      .map((link) => (typeof link?.url === "string" ? link.url.trim() : ""))
      .filter(isRealProfile),
  };
}

/**
 * The profile links a person's own page may show.
 *
 * Same rule as `sameAs`, applied to the visible list, because a link a reader
 * can click has to survive the click.
 */
export const realProfileLinks = <T extends { url?: string }>(links: T[]): T[] =>
  links.filter((link) => typeof link?.url === "string" && isRealProfile(link.url));

/**
 * Hosts that mean "somebody will fill this in later".
 *
 * RFC 2606 reserves these for documentation, so nothing real is ever behind
 * one, and two of them shipped to production as `sameAs` on the editor pages.
 * `sameAs` says the page at the other end is this person; pointing it at a
 * reserved domain says it under oath and is false. An absent property is
 * merely quiet, so absent is the default and this is what enforces it.
 */
const PLACEHOLDER = /^(https?:\/\/)?([^/]*\.)?(example\.(com|org|net)|localhost|test|invalid)(\/|:|$)/i;

export const isRealProfile = (url: string): boolean =>
  /^https?:\/\//i.test(url) && !PLACEHOLDER.test(url) && !/\b(lorem|ipsum|todo|placeholder)\b/i.test(url);

/* ------------------------------------------------------------------- pages */

export type PageInput = {
  path: string;
  name: string;
  description?: string | null;
  /** WebPage unless the page is a list of things, in which case CollectionPage. */
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "ProfilePage" | "ContactPage";
  datePublished?: Date | null;
  dateModified?: Date | null;
  image?: string | null;
  /** The thing the page is about, when there is one: a Service, a business, a list. */
  mainEntity?: Record<string, unknown> | { "@id": string };
  author?: { "@id": string } | null;
  reviewedBy?: { "@id": string } | null;
  /** Anything else that belongs on this page's own node. */
  extra?: Record<string, unknown>;
};

/**
 * The page entity every template should carry.
 *
 * isPartOf and publisher are the whole point: without them a page is an orphan
 * that happens to sit at a URL on this domain, and the Organization in the root
 * layout is a fact nothing depends on.
 */
export function pageEntity(input: PageInput): Record<string, unknown> {
  const url = absoluteUrl(input.path);

  const entity: Record<string, unknown> = {
    "@type": input.type ?? "WebPage",
    "@id": pageId(input.path),
    url,
    name: input.name,
    isPartOf: { "@id": websiteId() },
    publisher: { "@id": publisherId() },
  };

  if (input.description) entity.description = input.description;
  if (input.image) entity.primaryImageOfPage = absoluteUrl(input.image);
  if (input.datePublished) entity.datePublished = input.datePublished.toISOString();
  if (input.dateModified) entity.dateModified = input.dateModified.toISOString();
  if (input.mainEntity) entity.mainEntity = input.mainEntity;
  if (input.author) entity.author = input.author;
  if (input.reviewedBy) entity.reviewedBy = input.reviewedBy;
  return { ...entity, ...(input.extra ?? {}) };
}

/* ---------------------------------------------------------------- listings */

export type ListedBusiness = {
  slug: string;
  name: string;
  website?: string | null;
  phone?: string | null;
  image?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  cityName?: string | null;
  regionCode?: string | null;
  countryCode?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

/**
 * One company inside a ranking.
 *
 * The rating is the reason a reader trusts the position, and leaving it out of
 * the markup means the only machine-readable thing about a ranked company is
 * that it has a name. A validator will call aggregateRating inside a
 * LocalBusiness self-serving; that rule is about a business marking up its own
 * site. This is a third party publishing a rating about somebody else, which is
 * the case the property exists for, so it stays.
 */
export function listedBusinessEntity(business: ListedBusiness): Record<string, unknown> {
  const profile = absoluteUrl(routes.business(business.slug));

  const entity: Record<string, unknown> = {
    "@type": "LocalBusiness",
    "@id": businessId(business.slug),
    name: business.name,
    url: profile,
  };

  if (business.website) entity.sameAs = [business.website];
  if (business.phone) entity.telephone = business.phone;
  if (business.image) entity.image = absoluteUrl(business.image);

  if (business.cityName) {
    const address: Record<string, string> = { "@type": "PostalAddress", addressLocality: business.cityName };
    if (business.addressLine) address.streetAddress = business.addressLine;
    if (business.regionCode) address.addressRegion = business.regionCode.toUpperCase();
    if (business.postalCode) address.postalCode = business.postalCode;
    if (business.countryCode) address.addressCountry = business.countryCode.toUpperCase();
    entity.address = address;
  }

  if (business.rating) {
    const rating: Record<string, unknown> = { "@type": "AggregateRating", ratingValue: business.rating };
    if (business.reviewCount) {
      // Both, on purpose. reviewCount is how many people wrote something;
      // ratingCount is how many left a score. Google reads them differently and
      // the source counts them together, so saying both is the honest reading.
      rating.reviewCount = business.reviewCount;
      rating.ratingCount = business.reviewCount;
    }
    entity.aggregateRating = rating;
  }

  return entity;
}

export type ListInput = {
  path: string;
  name: string;
  description?: string | null;
  datePublished?: Date | null;
  dateModified?: Date | null;
  businesses: ListedBusiness[];
};

/** The ranking itself: an ordered list of real entities, not of names and links. */
export function rankingListEntity(input: ListInput): Record<string, unknown> {
  const entity: Record<string, unknown> = {
    "@type": "ItemList",
    "@id": listId(input.path),
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.businesses.length,
    isPartOf: { "@id": websiteId() },
    publisher: { "@id": publisherId() },
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: input.businesses.map((business, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: listedBusinessEntity(business),
    })),
  };

  if (input.description) entity.description = input.description;
  if (input.datePublished) entity.datePublished = input.datePublished.toISOString();
  if (input.dateModified) entity.dateModified = input.dateModified.toISOString();
  return entity;
}

/* ---------------------------------------------------------------- services */

export type ServiceInput = {
  path: string;
  name: string;
  description?: string | null;
  /** The trade, as somebody would name it: "Roofing", "AC repair". */
  serviceType: string;
  /** Where it is covered, as place names. */
  areaServed?: string[];
  /** The pages under this one, when it has any. */
  offers?: { name: string; path: string }[];
};

/**
 * What a service hub is actually about.
 *
 * A CollectionPage says "this page lists things". It does not say which trade,
 * or where it is covered, which is the only part a machine answering "who does
 * roofing in Ohio" needs.
 */
export function serviceEntity(input: ServiceInput): Record<string, unknown> {
  const entity: Record<string, unknown> = {
    "@type": "Service",
    "@id": serviceId(input.path),
    name: input.name,
    serviceType: input.serviceType,
    provider: { "@id": publisherId() },
    url: absoluteUrl(input.path),
  };

  if (input.description) entity.description = input.description;
  if (input.areaServed && input.areaServed.length > 0) {
    entity.areaServed = input.areaServed.map((place) => ({ "@type": "AdministrativeArea", name: place }));
  }
  if (input.offers && input.offers.length > 0) {
    entity.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: input.name,
      itemListElement: input.offers.map((offer) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: offer.name, url: absoluteUrl(offer.path) },
      })),
    };
  }
  return entity;
}

/* ------------------------------------------------------------------- graph */

/**
 * Wraps entities in one document.
 *
 * One @context and one @graph rather than a script tag each: the same entities,
 * but stated as belonging together, which is what lets a parser resolve an
 * @id in one against a definition in another.
 */
export function graph(...entities: (Record<string, unknown> | null | undefined)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": entities.filter((entity): entity is Record<string, unknown> => Boolean(entity)),
  };
}
