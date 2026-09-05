import Link from "next/link";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";
import { getSiteNav, type NavKey } from "@/lib/navigation";
import { routes } from "@/lib/urls";
import { LocationsMenu } from "./LocationsMenu";

/* ---------------------------------------------------------------- pieces */

function Chevron({ size = 12, width = 2.6 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Arrow({ size = 15, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Magnifier({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--gray-400)"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.34-4.34" />
    </svg>
  );
}

/** The "10" mark. The gold tick and the dot are what make it read as a badge. */
function Mark() {
  return (
    <span
      data-mark=""
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-flex",
        width: "42px",
        height: "42px",
        borderRadius: "13px",
        boxShadow: "0 6px 16px -8px rgba(16,31,61,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}
    >
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" style={{ display: "block" }}>
        <defs>
          <linearGradient id="tbf-mark-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1E3564" />
            <stop offset="1" stopColor="#0E1B36" />
          </linearGradient>
          <linearGradient id="tbf-mark-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F2CF85" />
            <stop offset="1" stopColor="#D9A94A" />
          </linearGradient>
        </defs>
        <rect width="42" height="42" rx="13" fill="url(#tbf-mark-bg)" />
        <path d="M8.5 11.5 20.5 5.5 v0" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <path
          d="M10.5 15.2 l4.6-3.4 v18.4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx="26.2" cy="21" rx="6.3" ry="9.2" fill="none" stroke="#FFFFFF" strokeWidth="3.4" />
        <path
          d="M23.3 21.4 l2.1 2.1 4.1-4.6"
          fill="none"
          stroke="url(#tbf-mark-gold)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          data-mark-dot=""
          cx="34.5"
          cy="8.5"
          r="2.2"
          fill="url(#tbf-mark-gold)"
          style={{ transformOrigin: "34.5px 8.5px" }}
        />
      </svg>
    </span>
  );
}

const NAVLINK = {
  display: "inline-flex",
  alignItems: "center",
  height: "42px",
  padding: "0 15px",
  borderRadius: "999px",
  fontSize: "15px",
  fontWeight: "600",
  color: "var(--ink)",
};

const NAVLINK_WITH_CHEVRON = { ...NAVLINK, gap: "7px" };

const PANEL = {
  position: "absolute" as const,
  top: "calc(var(--hdr-h) - 6px)",
  zIndex: "50",
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "24px",
  boxShadow: "0 30px 80px -20px rgba(16,31,61,0.28), 0 2px 6px rgba(16,31,61,0.06)",
  overflow: "hidden",
};

const GROUP_LABEL = {
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
};

const MITEM = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  padding: "7px 10px",
  borderRadius: "11px",
  fontSize: "14.5px",
  fontWeight: "500",
  color: "var(--text-primary)",
};

const MICO = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  flexShrink: "0",
  borderRadius: "9px",
  border: "1px solid var(--border-subtle)",
  background: "var(--surface-card)",
  color: "var(--ink)",
};

const ARROW_LINK = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  flexShrink: "0",
  fontSize: "14px",
  fontWeight: "600",
  color: "var(--color-primary)",
};

const MOBILE_ROW = {
  display: "block",
  minHeight: "48px",
  padding: "13px 4px",
  fontSize: "16px",
  fontWeight: "600",
  color: "var(--ink)",
  borderBottom: "1px solid var(--border-subtle)",
};

const MOBILE_SUMMARY = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "48px",
  padding: "12px 4px",
  fontSize: "16px",
  fontWeight: "600",
  color: "var(--ink)",
};

function Glyph({ d, size = 16, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const path = (name: IconName | undefined) => ICON_PATHS[name ?? "house"] ?? ICON_PATHS.house;

/** The five destinations the phone tab bar offers. */
const TABS: { id: NavKey; name: string; href: string; icon: IconName }[] = [
  { id: "none", name: "Home", href: "/", icon: "house" },
  { id: "services", name: "Services", href: routes.servicesIndex(), icon: "grid" },
  { id: "locations", name: "Locations", href: routes.locationsIndex(), icon: "pin" },
  { id: "rankings", name: "Rankings", href: routes.rankingsIndex(), icon: "trophy" },
  { id: "guides", name: "Guides", href: routes.guidesIndex(), icon: "book" },
];

/* ---------------------------------------------------------------- header */

export async function SiteHeader({ active = "none" }: { active?: NavKey }) {
  const nav = await getSiteNav();
  const on = (key: NavKey) => (active === key ? "1" : "0");

  return (
    <header data-hdr="" style={{ fontFamily: "var(--font-sans)" }}>
      {/* ------------------------------------------------------ utility bar */}
      <div data-util="" style={{ background: "var(--ink)", color: "rgba(232,237,245,0.72)" }}>
        <div
          style={{
            maxWidth: "var(--shell)",
            margin: "0 auto",
            padding: "0 var(--gutter)",
            height: "var(--util-h)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            fontSize: "12.5px",
          }}
        >
          <p data-util-copy="" style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: "0" }}>
            <span
              aria-hidden="true"
              style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }}
            />
            Researched rankings in{" "}
            <strong style={{ color: "#fff", fontWeight: "600" }}>
              {nav.cityCount} {nav.cityCount === 1 ? "city" : "cities"}
            </strong>{" "}
            across the United States and Canada. Re-checked every 90 days.
          </p>
          <ul style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <li>
              <Link data-ulink="" href={routes.howWeRank()} style={{ color: "rgba(232,237,245,0.72)", fontWeight: "500" }}>
                How We Rank
              </Link>
            </li>
            <li>
              <Link data-ulink="" href={routes.editorialTeam()} style={{ color: "rgba(232,237,245,0.72)", fontWeight: "500" }}>
                Editorial Team
              </Link>
            </li>
            <li>
              <Link data-ulink="" href={routes.corrections()} style={{ color: "rgba(232,237,245,0.72)", fontWeight: "500" }}>
                Report a Correction
              </Link>
            </li>
            <li>
              <Link
                data-ulink=""
                href={routes.forBusinesses()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--gold-ink)", fontWeight: "600" }}
              >
                For Businesses
                <Arrow size={12} width={2.4} />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* --------------------------------------------------------- main bar */}
      <div data-hdr-bar="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            position: "relative",
            maxWidth: "var(--shell)",
            margin: "0 auto",
            padding: "0 var(--gutter)",
            height: "var(--hdr-h)",
            display: "flex",
            alignItems: "center",
            gap: "22px",
          }}
        >
          <Link href="/" aria-label="TenBestFind home" style={{ display: "flex", alignItems: "center", gap: "11px", flexShrink: 0 }}>
            <Mark />
            <span data-wordmark="" style={{ display: "block", lineHeight: "1" }}>
              <span style={{ display: "block", fontSize: "20px", fontWeight: "800", letterSpacing: "-0.045em", color: "var(--ink)" }}>
                TenBest<span style={{ color: "var(--color-primary)" }}>Find</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                <span aria-hidden="true" style={{ display: "inline-block", width: "10px", height: "1.5px", background: "var(--gold-ink)" }} />
                Local Rankings
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" data-desktop-nav="" style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "18px" }}>
            {/* ------------------------------------------------ services */}
            <div data-mega="" style={{ position: "static" }}>
              <Link data-navlink="" data-active={on("services")} href={routes.servicesIndex()} aria-haspopup="true" style={NAVLINK_WITH_CHEVRON}>
                Home Services
                <Chevron />
              </Link>
              <div data-panel="" style={{ ...PANEL, left: "var(--gutter)", right: "var(--gutter)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 292px" }}>
                  <div style={{ padding: "30px 32px 28px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "16px",
                        marginBottom: "22px",
                        paddingBottom: "16px",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <p style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--ink)" }}>
                        Browse by trade
                        <span style={{ fontWeight: "500", color: "var(--text-secondary)" }}>
                          {" "}
                          · {nav.serviceCount} services, every one researched city by city
                        </span>
                      </p>
                      <Link data-arrow="" href={routes.servicesIndex()} style={ARROW_LINK}>
                        All services
                        <Arrow />
                      </Link>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "24px" }}>
                      {nav.serviceGroups.map((group) => (
                        <div key={group.title}>
                          <p style={{ ...GROUP_LABEL, margin: "0 0 10px 10px" }}>{group.title}</p>
                          <ul style={{ display: "grid", gap: "2px" }}>
                            {group.items.map((item) => (
                              <li key={item.href}>
                                <Link data-mitem="" href={item.href} style={MITEM}>
                                  <span data-mico="" aria-hidden="true" style={MICO}>
                                    <Glyph d={path(item.icon)} />
                                  </span>
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "var(--ink)", color: "#fff", padding: "30px 28px", display: "flex", flexDirection: "column" }}>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        ...GROUP_LABEL,
                        color: "var(--gold-ink)",
                        marginBottom: "16px",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M16 7h6v6" />
                        <path d="m22 7-8.5 8.5-5-5L2 17" />
                      </svg>
                      Searched most this week
                    </p>
                    <ol style={{ display: "grid", gap: "4px", marginBottom: "22px" }}>
                      {nav.mostSearched.map((item, index) => (
                        <li key={item.href}>
                          <Link
                            data-mlink=""
                            href={item.href}
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "12px",
                              padding: "7px 0",
                              borderBottom:
                                index === nav.mostSearched.length - 1 ? undefined : "1px solid rgba(255,255,255,0.1)",
                              fontSize: "15px",
                              fontWeight: "600",
                              color: "#fff",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "var(--gold-ink)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ol>
                    <p style={{ marginTop: "auto", fontSize: "13px", lineHeight: "1.6", color: "rgba(232,237,245,0.7)" }}>
                      Every trade page lists what a valid licence covers in that state or province before it lists a
                      single company.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------- locations */}
            <div data-mega="" style={{ position: "static" }}>
              <Link data-navlink="" data-active={on("locations")} href={routes.locationsIndex()} aria-haspopup="true" style={NAVLINK_WITH_CHEVRON}>
                Locations
                <Chevron />
              </Link>
              <LocationsMenu countries={nav.countries} />
            </div>

            <Link data-navlink="" data-active={on("rankings")} href={routes.rankingsIndex()} style={NAVLINK}>
              Rankings
            </Link>

            {/* -------------------------------------------------- guides */}
            <div data-mega="" style={{ position: "static" }}>
              <Link data-navlink="" data-active={on("guides")} href={routes.guidesIndex()} aria-haspopup="true" style={NAVLINK_WITH_CHEVRON}>
                Guides
                <Chevron />
              </Link>
              <div
                data-panel=""
                style={{
                  ...PANEL,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "min(880px, calc(100% - 48px))",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 300px",
                }}
              >
                <div style={{ padding: "28px 28px 26px" }}>
                  <p style={{ ...GROUP_LABEL, margin: "0 0 10px 10px" }}>By question</p>
                  <ul style={{ display: "grid", gap: "2px" }}>
                    {nav.guideTypes.map((item) => (
                      <li key={item.href}>
                        <Link data-mitem="" href={item.href} style={{ ...MITEM, padding: "8px 10px" }}>
                          <span data-mico="" aria-hidden="true" style={{ ...MICO, background: undefined }}>
                            <Glyph d={path(item.icon)} />
                          </span>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: "28px 28px 26px", borderLeft: "1px solid var(--border-subtle)" }}>
                  <p style={{ ...GROUP_LABEL, margin: "0 0 10px 10px" }}>By trade</p>
                  <ul>
                    {nav.guideTopics.map((item) => (
                      <li key={item.href}>
                        <Link
                          data-mitem=""
                          href={item.href}
                          style={{ display: "block", padding: "8px 10px", borderRadius: "9px", fontSize: "14.5px", fontWeight: "500", color: "var(--text-primary)" }}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {nav.editorsPick ? (
                  <div style={{ background: "var(--surface-page)", borderLeft: "1px solid var(--border-subtle)", padding: "28px 26px" }}>
                    <p style={{ ...GROUP_LABEL, color: "var(--color-primary)", margin: "0 0 10px" }}>Editor&apos;s pick</p>
                    <p
                      style={{
                        fontSize: "17px",
                        fontWeight: "700",
                        lineHeight: "1.3",
                        letterSpacing: "-0.015em",
                        color: "var(--ink)",
                        margin: "0 0 8px",
                      }}
                    >
                      {nav.editorsPick.title}
                    </p>
                    <p style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                      {nav.editorsPick.summary}
                    </p>
                    <Link data-arrow="" href={nav.editorsPick.href} style={ARROW_LINK}>
                      Read the guide
                      <Arrow />
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <Link data-navlink="" data-active={on("trust")} href={routes.howWeRank()} style={NAVLINK}>
              How We Rank
            </Link>
          </nav>

          {/* -------------------------------------------------- mobile drawer */}
          <details data-mobile-nav="" style={{ position: "static", order: 4 }}>
            <summary
              aria-label="Open main menu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-card)",
                color: "var(--ink)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h10" />
              </svg>
            </summary>
            <nav
              data-mobile-sheet=""
              aria-label="Primary mobile"
              style={{
                position: "fixed",
                top: "var(--hdr-h)",
                left: "12px",
                right: "12px",
                maxHeight: "76vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-xl)",
                padding: "14px 16px 20px",
                zIndex: "210",
              }}
            >
              <form
                action={routes.search()}
                method="get"
                role="search"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "46px",
                  padding: "0 12px",
                  marginBottom: "8px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  background: "var(--surface-page)",
                }}
              >
                <Magnifier />
                <input
                  type="search"
                  name="service"
                  placeholder="Search a trade or city"
                  aria-label="Search"
                  style={{
                    flex: "1",
                    border: "0",
                    background: "transparent",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </form>

              <details data-macc="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <summary style={MOBILE_SUMMARY}>
                  Home Services
                  <span data-chev="" aria-hidden="true" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
                    <Chevron size={17} width={2.2} />
                  </span>
                </summary>
                <ul style={{ padding: "0 0 10px" }}>
                  {nav.serviceGroups.flatMap((group) => group.items).map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        style={{ display: "flex", alignItems: "center", gap: "11px", minHeight: "44px", padding: "10px 0", fontSize: "14.5px", color: "var(--text-primary)" }}
                      >
                        <span style={{ display: "inline-flex", color: "var(--gray-400)" }}>
                          <Glyph d={path(item.icon)} size={18} />
                        </span>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={routes.servicesIndex()}
                      style={{ display: "block", minHeight: "44px", padding: "11px 0 2px", fontSize: "15px", fontWeight: "600", color: "var(--color-primary)" }}
                    >
                      All services
                    </Link>
                  </li>
                </ul>
              </details>

              <details data-macc="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <summary style={MOBILE_SUMMARY}>
                  Locations
                  <span data-chev="" aria-hidden="true" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
                    <Chevron size={17} width={2.2} />
                  </span>
                </summary>
                <div style={{ padding: "2px 0 12px" }}>
                  {nav.countries.map((country) => (
                    <details key={country.code} data-macc="" style={{ borderTop: "1px solid var(--border-subtle)", marginLeft: "4px" }}>
                      <summary
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: "44px",
                          padding: "10px 0",
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "var(--ink)",
                        }}
                      >
                        {country.name}
                        <span data-chev="" aria-hidden="true" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
                          <Chevron size={16} width={2.2} />
                        </span>
                      </summary>
                      <ul style={{ padding: "0 0 10px 2px" }}>
                        <li>
                          <Link
                            href={country.href}
                            style={{ display: "block", minHeight: "44px", padding: "10px 0", fontSize: "14.5px", fontWeight: "600", color: "var(--color-primary)" }}
                          >
                            {country.hubLabel}
                          </Link>
                        </li>
                        {country.groups
                          .flatMap((group) => group.items)
                          .slice(0, 6)
                          .map((region) => (
                            <li key={region.href}>
                              <Link href={region.href} style={{ display: "block", minHeight: "44px", padding: "10px 0", fontSize: "14.5px", color: "var(--text-primary)" }}>
                                {region.name}
                              </Link>
                            </li>
                          ))}
                        {country.cities.slice(0, 4).map((city) => (
                          <li key={city.href}>
                            <Link href={city.href} style={{ display: "block", minHeight: "44px", padding: "10px 0", fontSize: "14.5px", color: "var(--text-secondary)" }}>
                              {city.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  <Link
                    href={routes.locationsIndex()}
                    style={{ display: "block", minHeight: "44px", padding: "11px 4px 2px", fontSize: "15px", fontWeight: "600", color: "var(--color-primary)" }}
                  >
                    All locations
                  </Link>
                </div>
              </details>

              <ul style={{ paddingTop: "4px" }}>
                <li>
                  <Link href={routes.rankingsIndex()} style={MOBILE_ROW}>
                    Rankings
                  </Link>
                </li>
                <li>
                  <Link href={routes.guidesIndex()} style={MOBILE_ROW}>
                    Guides
                  </Link>
                </li>
                <li>
                  <Link href={routes.howWeRank()} style={MOBILE_ROW}>
                    How We Rank
                  </Link>
                </li>
                <li>
                  <Link href={routes.forBusinesses()} style={{ ...MOBILE_ROW, color: "var(--text-secondary)", borderBottom: undefined }}>
                    For Businesses
                  </Link>
                </li>
              </ul>
              <Link
                href={routes.forBusinesses()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "50px",
                  marginTop: "14px",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                Add Your Business
              </Link>
            </nav>
          </details>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto", flexShrink: 0 }}>
            <form
              data-hsearch=""
              action={routes.search()}
              method="get"
              role="search"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "210px",
                height: "44px",
                padding: "0 14px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "999px",
                background: "var(--surface-page)",
              }}
            >
              <Magnifier />
              <input
                type="search"
                name="service"
                placeholder="Trade or city"
                aria-label="Search TenBestFind"
                style={{
                  flex: "1",
                  minWidth: "0",
                  border: "0",
                  background: "transparent",
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <kbd
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "var(--text-muted)",
                  padding: "2px 6px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  background: "var(--surface-card)",
                }}
              >
                /
              </kbd>
            </form>
            <Link
              href={routes.forBusinesses()}
              data-hdr-cta=""
              data-cta-primary=""
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "44px",
                padding: "0 18px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#fff",
                background: "var(--color-primary)",
              }}
            >
              Add Your Business
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- phone tab bar */}
      <nav
        data-tabbar=""
        aria-label="Quick navigation"
        style={{
          position: "fixed",
          left: "0",
          right: "0",
          bottom: "0",
          zIndex: "220",
          alignItems: "stretch",
          justifyContent: "space-around",
          height: "calc(64px + env(safe-area-inset-bottom))",
          padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(18px)",
          borderTop: "1px solid var(--border-subtle)",
          boxShadow: "0 -10px 30px -20px rgba(16,31,61,0.35)",
        }}
      >
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            data-tab=""
            data-on={on(tab.id)}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              minHeight: "52px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--text-secondary)",
            }}
          >
            <span
              data-tab-ico=""
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "28px",
                borderRadius: "999px",
              }}
            >
              <Glyph d={ICON_PATHS[tab.icon]} size={20} />
            </span>
            {tab.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
