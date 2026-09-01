import Link from "next/link";
import { ArrowRight, Icon, SearchIcon } from "@/components/ui/Icon";
import { getSiteNav, type NavKey } from "@/lib/navigation";
import { routes } from "@/lib/urls";
import { LocationsMenu } from "./LocationsMenu";
import { LogoMark } from "./Logo";

function Chevron({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export async function SiteHeader({ active = "none" }: { active?: NavKey }) {
  const nav = await getSiteNav();
  const flatServices = nav.serviceGroups.flatMap((group) => group.items).slice(0, 12);

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <Link href="/" aria-label="TenBestFind home" className="hdr__brand">
          <LogoMark />
          <span className="hdr__wordmark">TenBestFind</span>
        </Link>

        <nav aria-label="Primary" className="hdr__nav">
          <div className="mega">
            <Link
              className="navlink"
              data-active={active === "services"}
              href={routes.servicesIndex()}
              aria-haspopup="true"
            >
              Home Services
              <Chevron />
            </Link>
            <div className="mega__panel mega__panel--services">
              {nav.serviceGroups.map((group) => (
                <div key={group.title}>
                  <p className="mega__label">{group.title}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link className="mega__item" href={item.href}>
                          {item.icon ? <Icon name={item.icon} size={18} strokeWidth={1.7} /> : null}
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mega__aside">
                <p className="mega__label" style={{ margin: "0 0 12px" }}>
                  <Icon name="up" size={14} strokeWidth={2.2} color="var(--color-primary)" />
                  Most searched
                </p>
                <ul style={{ display: "grid", gap: 2, marginBottom: 16 }}>
                  {nav.mostSearched.map((item) => (
                    <li key={item.href}>
                      <Link className="mega__aside-link" href={item.href}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link className="arrow-link" href={routes.servicesIndex()} style={{ fontSize: 14 }}>
                  All 40+ services
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          <div className="mega">
            <Link
              className="navlink"
              data-active={active === "locations"}
              href={routes.locationsIndex()}
              aria-haspopup="true"
            >
              Locations
              <Chevron />
            </Link>
            <LocationsMenu countries={nav.countries} />
          </div>

          <Link className="navlink" data-active={active === "rankings"} href={routes.rankingsIndex()}>
            Rankings
          </Link>

          <div className="mega">
            <Link
              className="navlink"
              data-active={active === "guides"}
              href={routes.guidesIndex()}
              aria-haspopup="true"
            >
              Guides
              <Chevron />
            </Link>
            <div className="mega__panel mega__panel--guides">
              <div>
                <p className="mega__label">By type</p>
                <ul>
                  {nav.guideTypes.map((item) => (
                    <li key={item.href}>
                      <Link className="mega__item" href={item.href}>
                        {item.icon ? <Icon name={item.icon} size={18} strokeWidth={1.7} /> : null}
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mega__label">By service</p>
                <ul>
                  {nav.guideTopics.map((item) => (
                    <li key={item.href}>
                      <Link className="mega__item" href={item.href}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {nav.editorsPick ? (
                <div className="mega__aside">
                  <p className="mega__label" style={{ margin: "0 0 8px" }}>
                    Editor&apos;s pick
                  </p>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      color: "var(--ink)",
                      marginBottom: 8,
                    }}
                  >
                    {nav.editorsPick.title}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      marginBottom: 14,
                    }}
                  >
                    {nav.editorsPick.summary}
                  </p>
                  <Link className="arrow-link" href={nav.editorsPick.href} style={{ fontSize: 14 }}>
                    Read the guide
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <Link className="navlink" data-active={active === "trust"} href={routes.howWeRank()}>
            How We Rank
          </Link>
          <Link
            className="navlink navlink--muted"
            data-active={active === "business"}
            href={routes.forBusinesses()}
          >
            For Businesses
          </Link>
        </nav>

        <details className="mobile-nav">
          <summary aria-label="Open main menu">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </summary>
          <nav aria-label="Primary mobile" className="mobile-nav__sheet">
            <details className="macc">
              <summary>
                Home Services
                <span className="macc__chev" aria-hidden="true">
                  <Chevron size={17} />
                </span>
              </summary>
              <ul style={{ padding: "2px 0 12px" }}>
                {flatServices.map((item) => (
                  <li key={item.href}>
                    <Link className="macc__link" href={item.href}>
                      {item.icon ? <Icon name={item.icon} size={17} strokeWidth={1.7} /> : null}
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={routes.servicesIndex()}
                    style={{
                      display: "block",
                      padding: "9px 4px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                    }}
                  >
                    All services
                  </Link>
                </li>
              </ul>
            </details>

            <details className="macc">
              <summary>
                Locations
                <span className="macc__chev" aria-hidden="true">
                  <Chevron size={17} />
                </span>
              </summary>
              <div style={{ padding: "2px 0 12px" }}>
                {nav.countries.map((country) => (
                  <details key={country.code} className="macc macc--nested">
                    <summary>
                      {country.name}
                      <span className="macc__chev" aria-hidden="true">
                        <Chevron size={16} />
                      </span>
                    </summary>
                    <ul style={{ padding: "0 0 10px 2px" }}>
                      <li>
                        <Link
                          href={country.href}
                          style={{
                            display: "block",
                            padding: "8px 0",
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: "var(--color-primary)",
                          }}
                        >
                          {country.hubLabel}
                        </Link>
                      </li>
                      {country.groups
                        .flatMap((group) => group.items)
                        .slice(0, 6)
                        .map((region) => (
                          <li key={region.href}>
                            <Link
                              href={region.href}
                              style={{ display: "block", padding: "8px 0", fontSize: 14.5, color: "var(--text-primary)" }}
                            >
                              {region.name}
                            </Link>
                          </li>
                        ))}
                      {country.cities.slice(0, 4).map((city) => (
                        <li key={city.href}>
                          <Link
                            href={city.href}
                            style={{ display: "block", padding: "8px 0", fontSize: 14.5, color: "var(--text-secondary)" }}
                          >
                            {city.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
                <Link
                  href={routes.locationsIndex()}
                  style={{
                    display: "block",
                    padding: "11px 4px 2px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                  }}
                >
                  All locations
                </Link>
              </div>
            </details>

            <ul className="mobile-nav__list" style={{ paddingTop: 4 }}>
              <li>
                <Link href={routes.rankingsIndex()}>Rankings</Link>
              </li>
              <li>
                <Link href={routes.guidesIndex()}>Guides</Link>
              </li>
              <li>
                <Link href={routes.howWeRank()}>How We Rank</Link>
              </li>
              <li>
                <Link href={routes.forBusinesses()} style={{ color: "var(--text-secondary)" }}>
                  For Businesses
                </Link>
              </li>
            </ul>
            <Link href={routes.advertise()} className="mobile-nav__cta">
              Sponsor your business
            </Link>
          </nav>
        </details>

        <div className="hdr__actions">
          <Link href={routes.search()} aria-label="Search TenBestFind" className="hdr__icon-btn">
            <SearchIcon size={19} color="currentColor" />
          </Link>
          <Link href={routes.advertise()} className="hdr__cta">
            Sponsor your business
          </Link>
        </div>
      </div>
    </header>
  );
}
