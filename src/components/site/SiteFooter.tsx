import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";
import { LogoMark } from "./Logo";

const EXPLORE = [
  { label: "Latest Rankings", href: routes.rankingsIndex() },
  { label: "Guides", href: routes.guidesIndex() },
  { label: "All Locations", href: routes.locationsIndex() },
  { label: "Search", href: routes.search() },
];

const COMPANY = [
  { label: "About", href: "/about/" },
  { label: "How We Rank", href: routes.howWeRank() },
  { label: "Editorial Team", href: routes.editorialTeam() },
  { label: "Editorial Standards", href: "/editorial-standards/" },
  { label: "Corrections Policy", href: routes.corrections() },
  { label: "Contact", href: routes.contact() },
];

const BUSINESS = [
  { label: "Claim Your Business", href: routes.claim() },
  { label: "Add a Business", href: routes.addBusiness() },
  { label: "Advertising", href: routes.advertise() },
];

const LEGAL = [
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
  { label: "Advertising Disclosure", href: routes.advertisingDisclosure() },
  { label: "Accessibility", href: "/accessibility/" },
];

export async function SiteFooter() {
  const [categories, countries] = await Promise.all([
    db.category.findMany({
      where: { published: true, featured: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { name: true, slug: true },
    }),
    db.country.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  return (
    <footer className="ftr">
      <div className="shell ftr__inner">
        <div className="ftr__grid">
          <div className="ftr__brand">
            <Link href="/" aria-label="TenBestFind home" className="ftr__logo">
              <LogoMark size={26} />
              <span>TenBestFind</span>
            </Link>
            <p className="ftr__blurb">
              Independent research on local service companies. We publish the shortlist and the
              reasoning behind it.
            </p>
            <p className="ftr__label">Choose a region</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {countries.map((country) => (
                <Link key={country.code} href={routes.country(country.code)} className="ftr__country">
                  {country.name}
                </Link>
              ))}
            </div>
          </div>

          <nav aria-label="Home services">
            <h2 className="ftr__heading">Home Services</h2>
            <ul className="ftr__links">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={routes.category(category.slug)}>{category.name}</Link>
                </li>
              ))}
              <li>
                <Link href={routes.servicesIndex()} className="ftr__links-cta">
                  All services
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Explore">
            <h2 className="ftr__heading">Explore</h2>
            <ul className="ftr__links">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
              {countries.map((country) => (
                <li key={country.code}>
                  <Link href={routes.country(country.code)}>{country.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="ftr__heading">Company</h2>
            <ul className="ftr__links">
              {COMPANY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="For businesses and legal">
            <h2 className="ftr__heading">For Businesses</h2>
            <ul className="ftr__links" style={{ marginBottom: 26 }}>
              {BUSINESS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <h2 className="ftr__heading">Legal</h2>
            <ul className="ftr__links">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="ftr__bottom">
          <p>© {new Date().getFullYear()} TenBestFind. All rights reserved.</p>
          <p style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="shield" size={16} color="var(--gray-400)" strokeWidth={1.8} />
            Editorial rankings are never paid. Sponsored placements are labeled.
          </p>
        </div>
      </div>
    </footer>
  );
}
