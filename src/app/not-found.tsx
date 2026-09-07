import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  Eyebrow,
  GRID_BACKDROP,
  LEAD,
  RowLink,
  SHELL,
  TenOutline,
} from "@/components/site/page-parts";
import { routes } from "@/lib/urls";

/**
 * The page a wrong URL lands on.
 *
 * Next ships a default, and the default is a bare line of text on white with
 * no header, no footer and no way onward. The status code is correct either
 * way, so this is not an indexing problem; it is a waste. Every dead link, and
 * every old URL a crawler still remembers, arrives somewhere with nothing to
 * do next.
 *
 * So this offers the four hubs the site is actually organised around. Nothing
 * here queries the database: a 404 should be the cheapest page on the site,
 * because the requests that hit it are the ones nobody asked for.
 */
// No robots directive here on purpose: Next already emits noindex on the
// not-found boundary, and adding a second tag saying the same thing only gives
// an audit something to complain about.
export const metadata: Metadata = {
  title: "Page not found",
};

const DESTINATIONS = [
  { href: routes.servicesIndex(), label: "Home Services" },
  { href: routes.locationsIndex(), label: "Locations" },
  { href: routes.rankingsIndex(), label: "Rankings" },
  { href: routes.guidesIndex(), label: "Guides" },
];

export default function NotFound() {
  return (
    <SiteChrome>
      <section style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "72px 24px 40px", position: "relative" }}>
          <Eyebrow>404</Eyebrow>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: "1.1", margin: "0 0 16px" }}>
            We could not find that page
          </h1>
          <p style={{ ...LEAD, maxWidth: "58ch", margin: "0 0 28px" }}>
            The address may have changed, or it may never have existed. Everything the site
            publishes is reachable from the four hubs below.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link href={routes.home()} style={BTN_PRIMARY}>
              Back to the homepage
            </Link>
            <Link href={routes.servicesIndex()} style={BTN_GHOST}>
              Browse services
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="not-found-hubs">
        <div style={{ ...SHELL, padding: "8px 24px 88px" }}>
          <h2
            id="not-found-hubs"
            style={{ fontSize: "17px", fontWeight: "700", margin: "0 0 14px" }}
          >
            Start here instead
          </h2>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "8px",
              listStyle: "none",
              margin: "0",
              padding: "0",
            }}
          >
            {DESTINATIONS.map((destination) => (
              <RowLink key={destination.href} href={destination.href} outline>
                {destination.label}
              </RowLink>
            ))}
          </ul>
        </div>
      </section>
    </SiteChrome>
  );
}
