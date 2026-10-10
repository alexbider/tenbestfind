import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import { BTN_GHOST, BTN_PRIMARY, SHELL } from "@/components/site/page-parts";
import { HeroBackdrop, Kicker, LinkRow, autoGrid, heroAccentTail } from "@/components/site/trust/parts";
import { accentTail } from "@/components/ui/Accent";
import type { IconName } from "@/components/ui/Icon";
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

const DESTINATIONS: { href: string; label: string; icon: IconName }[] = [
  { href: routes.servicesIndex(), label: "Home Services", icon: "tools" },
  { href: routes.locationsIndex(), label: "Locations", icon: "pin" },
  { href: routes.rankingsIndex(), label: "Rankings", icon: "award" },
  { href: routes.guidesIndex(), label: "Guides", icon: "book" },
];

export default function NotFound() {
  return (
    <SiteChrome skin>
      <div className="tr2 ut2">
        <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <HeroBackdrop />
          <div style={{ ...SHELL, padding: "72px 24px 48px", position: "relative" }}>
            <Kicker hero="1" gap="14px">
              404
            </Kicker>
            <h1
              data-in="2"
              style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800", margin: "0 0 16px", textWrap: "balance" }}
            >
              {heroAccentTail("We could not find that page", 2)}
            </h1>
            <p data-in="3" style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", maxWidth: "58ch", margin: "0 0 28px", textWrap: "pretty" }}>
              The address may have changed, or it may never have existed. Everything the site
              publishes is reachable from the four hubs below.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link data-btn="" href={routes.home()} style={BTN_PRIMARY}>
                Back to the homepage
              </Link>
              <Link href={routes.servicesIndex()} style={BTN_GHOST}>
                Browse services
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="not-found-hubs">
          <div style={{ ...SHELL, padding: "48px 24px 88px" }}>
            <h2 data-reveal="" id="not-found-hubs" style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 18px" }}>
              {accentTail("Start here instead", 1)}
            </h2>
            <ul data-stagger="" data-ag="auto" style={autoGrid(240, "12px")}>
              {DESTINATIONS.map((destination) => (
                <LinkRow key={destination.href} href={destination.href} label={destination.label} icon={destination.icon} />
              ))}
            </ul>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
