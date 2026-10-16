import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import Link from "next/link";
import { PROJECT_GROUPS, CATEGORY_BANDS } from "../../../prisma/data/taxonomy";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Chevron, Crumbs, SHELL, SR_ONLY } from "@/components/site/page-parts";
import {
  ArrowLink,
  DarkBackdrop,
  FaqRow,
  HeroBackdrop,
  Kicker,
  SectionToc,
  Tile,
  autoGrid,
  heroAccentTail,
} from "@/components/site/services/parts";
import { accentTail } from "@/components/ui/Accent";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { faqsFor, type FaqView } from "@/lib/faqs";
import { graph, pageEntity } from "@/lib/schema";
import { countriesOf, groupByCountry, regionNounAcross } from "@/lib/regions";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { homeServicesCopy } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = homeServicesCopy();

export const metadata: Metadata = withSocial({
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/home-services/" },
});

const SECTION = { ...SHELL, padding: "80px 24px" };
const SECTION_H2 = { fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" };
const SECTION_HEAD = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap" as const,
  marginBottom: "32px",
};
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
};
const DARK_CARD = {
  transition: "background 200ms ease, border-color 200ms ease",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "16px",
  padding: "22px 24px",
};
/** The display heading the design sets on its two-column sections. */
const SPLIT_H2 = {
  fontSize: "clamp(28px, 3.4vw, 42px)",
  lineHeight: "1.06",
  fontWeight: "800",
  letterSpacing: "-0.04em",
  textWrap: "balance" as const,
};
const ROW = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "9px 10px",
  margin: "0 -10px",
  borderRadius: "10px",
  fontSize: "15px",
  color: "var(--text-primary)",
  textDecoration: "none",
};
const SUGGEST_LABEL = {
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wider)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  marginBottom: "6px",
};
const SUGGEST_LINK = { display: "block", padding: "6px 0", fontSize: "15px", color: "var(--text-primary)" };
const FIELD = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "52px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};
const SUBMIT = {
  height: "52px",
  padding: "0 28px",
  border: "0",
  borderRadius: "14px",
  background: "var(--color-primary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
};

/** The eight checks that apply to every trade, whatever the job. */
const HIRING_CRITERIA = [
  {
    title: "Licensing and credentials",
    text: "Requirements vary by trade and state. Verify the licence with the issuing agency, not the company website.",
  },
  {
    title: "Insurance",
    text: "Look for liability coverage appropriate to the service, plus workers compensation when crews are involved.",
  },
  {
    title: "Relevant experience",
    text: "Weigh experience with your exact type of project, not with the trade in general.",
  },
  {
    title: "Reputation patterns",
    text: "Look for patterns in customer feedback rather than reacting to any single review.",
  },
  {
    title: "A written estimate",
    text: "Understand scope, labour, materials and exclusions before approving anything.",
  },
  {
    title: "Warranty terms",
    text: "Ask what the warranty covers, for how long, and whether labour and parts are separate.",
  },
  {
    title: "Permits and inspections",
    text: "Confirm who is responsible for pulling permits and booking inspections, and who pays if one fails.",
  },
  {
    title: "The agreement itself",
    text: "Get payment schedule, timeline and change-order handling in writing before work starts.",
  },
];

/** The shared evaluation framework, before per-category criteria are added. */
const EVAL_CRITERIA = [
  { title: "Reputation", text: "Customer feedback and reputation patterns across sources we can verify." },
  { title: "Experience", text: "Relevant trade experience and time working in the local market." },
  { title: "Credentials", text: "Licensing, insurance and certifications, checked against the issuing body." },
  { title: "Service range", text: "What the company actually takes on, rather than what it lists." },
  { title: "Local presence", text: "Whether the company genuinely works the area it claims to cover." },
  { title: "Responsiveness", text: "How quickly and how consistently a homeowner gets an answer." },
  { title: "Transparency", text: "How clearly pricing, scope and warranty terms are set out up front." },
];

/**
 * What moves the price in each trade. This is general guidance rather than a
 * figure, because the same job lands far apart between markets.
 */
const COST_DRIVERS: Record<string, string> = {
  plumbers: "Repair type, materials, and access to the pipe or fixture",
  hvac: "System type, the size the home needs, and efficiency rating",
  roofing: "Roof size and pitch, material, and how much decking has to be replaced",
  "home-remodeling": "Room size, fixture and finish level, and how much has to be moved",
  "moving-companies": "Distance, volume, access at both ends, and time of year",
  "pest-control": "Pest type, property size, and whether it is one visit or a programme",
  electricians: "Panel capacity, how far the run is, and whether walls have to be opened",
  landscaping: "Plot size, grading, planting choice, and irrigation",
};

const TRUST = [
  { icon: "shield" as IconName, label: "Independent research", color: "var(--color-success)" },
  { icon: "pin" as IconName, label: "Local rankings", color: "var(--color-primary)" },
  { icon: "balance" as IconName, label: "Transparent methodology", color: "var(--color-primary)" },
  { icon: "clock" as IconName, label: "Regularly reviewed", color: "var(--color-primary)" },
];

const EEAT = [
  {
    title: "Who creates our rankings",
    body: "Rankings are produced and reviewed by the TenBestFind editorial team, and each article names the people behind it.",
    cta: "Editorial team",
    href: routes.editorialTeam(),
  },
  {
    title: "How businesses are evaluated",
    body: "Our criteria, sources and limits are published so you can judge the reasoning for yourself.",
    cta: "How we rank",
    href: routes.howWeRank(),
  },
  {
    title: "Sponsorship transparency",
    body: "Sponsored placement is labelled everywhere it appears and never presented as editorial selection.",
    cta: "Advertising disclosure",
    href: routes.advertisingDisclosure(),
  },
  {
    title: "Corrections and updates",
    body: "Readers and businesses can report information that is out of date, and we publish how we handle it.",
    cta: "Corrections policy",
    href: routes.corrections(),
  },
];

/**
 * The pillar's own questions. It used to repeat the homepage's six brand
 * questions word for word, so two pages published the same FAQPage. These are
 * the questions homeowners ask before they know which trade they need.
 */
const PILLAR_FAQS: FaqView[] = [
  {
    id: "what-counts",
    question: "What counts as a home service?",
    answer:
      "Any trade you hire to repair, maintain or improve a house. That covers plumbing, heating and cooling, electrical work and roofing, remodeling and exterior work, and upkeep like cleaning, landscaping and moving. Each trade on this page links to its own rankings by city.",
  },
  {
    id: "which-licensed",
    question: "Which home service trades need a license?",
    answer:
      "Electrical, plumbing, gas and HVAC work need a license almost everywhere in the United States and Canada. Roofing and general contracting are licensed in some states and provinces and not in others, and cleaning or handyman work usually needs none. Every ranking names the authority we checked for that city.",
  },
  {
    id: "what-it-costs",
    question: "How much do common home services cost?",
    answer:
      "It depends on the job, the market and the materials, so we do not publish one national number. Our cost guides explain what moves the price for each trade, and a ranking quotes local ranges only where an editor could source them.",
  },
  {
    id: "find-reliable",
    question: "How do I find a reliable contractor near me?",
    answer:
      "Start from a shortlist, then check the license with the authority that issues it, ask the insurer for the insurance certificate, and get two or three itemized written quotes on the same scope. A TenBestFind ranking has already done the shortlist and the license check.",
  },
  {
    id: "emergencies",
    question: "Who do I call first for a burst pipe, no heat or a roof leak?",
    answer:
      "Make it safe first: shut off the main water valve or the furnace, and keep away from wet wiring. Then call a plumber, HVAC company or roofer that runs emergency service. Not every company answers after hours, so check before you need one.",
  },
  {
    id: "vs-google-maps",
    question: "How is a top 10 list different from Google Maps results?",
    answer:
      "Our lists start from the companies Google Maps shows for that trade and city, then keep only those with strong ratings, enough reviews, a working website and a real local address, and explain why each one is there. Sponsored placements are labelled and never change the order.",
  },
];

const BIZ_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "pin",
    title: "Reach your actual service area",
    body: "Appear in the cities and categories where you really operate.",
  },
  {
    icon: "book",
    title: "Present your business properly",
    body: "Services, credentials, coverage and contact details in one place.",
  },
  {
    icon: "shield",
    title: "Clearly labelled, always",
    body: "Promotion is marked as promotion and kept separate from our editorial rankings.",
  },
];

export default async function ServicesIndexPage() {
  const [categories, rankings, guides, faqs, trending, regions, cities, emergency] = await Promise.all([
    db.category.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { rankings: { where: { status: "PUBLISHED" } } } } },
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 8,
      include: { category: { select: { serviceName: true, slug: true } }, author: { select: { name: true } } },
    }),
    faqsFor("PAGE", "home-services", PILLAR_FAQS),
    db.subservice.findMany({
      where: { trending: true },
      orderBy: { sortOrder: "asc" },
      take: 10,
      include: { category: { select: { slug: true } } },
    }),
    // Sorted globally, `take: 10` was whichever ten regions happened to
    // have the lowest sort order, which can be ten American states and no
    // Canadian provinces at all. Take enough to see both, then show a few
    // from each.
    db.region.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      take: 30,
      include: { country: { select: { code: true, name: true, regionLabel: true, sortOrder: true } } },
    }),
    db.city.findMany({
      where: { published: true, topMetro: true },
      orderBy: { sortOrder: "asc" },
      take: 12,
      include: { region: { select: { slug: true, code: true, country: { select: { code: true } } } } },
    }),
    // The emergency subservices we actually publish, rather than a fixed list.
    db.subservice.findMany({
      where: {
        OR: [{ name: { contains: "Emergency" } }, { slug: { contains: "emergency" } }],
        // Only trades with a published ranking; the others are noindexed.
        category: { rankings: { some: { status: "PUBLISHED" } } },
      },
      orderBy: { sortOrder: "asc" },
      include: { category: { select: { slug: true } } },
    }),
  ]);

  const bands = CATEGORY_BANDS.map((band) => ({
    ...band,
    items: categories.filter((category) => category.groupName === band.title),
  })).filter((band) => band.items.length > 0);

  const icon = (key: string | null | undefined): IconName =>
    key && hasIcon(key) ? (key as IconName) : "house";

  // A trade with no published ranking is noindexed, so linking to it sends
  // readers and crawlers to a page with nothing on it. Those trades stay on
  // the page as names, marked as coming, without the link.
  const liveSlugs = new Set(categories.filter((category) => category._count.rankings > 0).map((category) => category.slug));
  const isLive = (href: string) => liveSlugs.has(href.split("/").filter(Boolean)[0] ?? "");
  const liveTrending = trending.filter((sub) => liveSlugs.has(sub.category.slug));

  const costRows = categories
    .filter((category) => COST_DRIVERS[category.slug])
    .slice(0, 6)
    .map((category) => ({ name: category.name, drivers: COST_DRIVERS[category.slug] }));

  const [leadGuides, categoryGuides] = [
    guides.slice(0, 4),
    guides.filter((guide) => guide.category).slice(0, 6),
  ];

  return (
    <SiteChrome active="services" skin>
      <div className="v2-svc" style={{ display: "contents" }}>
      {/* The page node now says what the page is and lists the trades that have
          rankings, and the visible breadcrumb is published as BreadcrumbList. */}
      <JsonLd
        data={graph(
          pageEntity({
            path: routes.servicesIndex(),
            type: "CollectionPage",
            name: copy.h1,
            description: copy.description,
            dateModified: rankings[0]?.lastReviewedAt ?? null,
            mainEntity: {
              "@type": "ItemList",
              name: "Home service trades with published rankings",
              itemListElement: categories
                .filter((category) => liveSlugs.has(category.slug))
                .map((category, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: category.name,
                  url: absoluteUrl(routes.category(category.slug)),
                })),
            },
          }),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Home Services", item: absoluteUrl(routes.servicesIndex()) },
            ],
          },
        )}
      />
      <FaqJsonLd faqs={faqs} />

      {/* ------------------------------------------------------------- hero */}
      <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)" }}>
        <HeroBackdrop />
        <div style={{ ...SHELL, position: "relative", padding: "20px 24px 56px" }}>
          <div style={{ marginBottom: "30px" }}>
            <Crumbs flush items={[{ label: "Home", href: "/" }, { label: "Home services" }]} />
          </div>

          <div style={{ maxWidth: "860px" }}>
            <Kicker hero="1" gap="16px">
              Home services
            </Kicker>
            <h1
              data-in="2"
              style={{
                fontSize: "clamp(36px, 5vw, 60px)",
                lineHeight: "1.06",
                letterSpacing: "-0.04em",
                fontWeight: "800",
                textWrap: "balance",
              }}
            >
              {heroAccentTail(copy.h1, 2)}
            </h1>
            <p
              data-in="3"
              style={{
                marginTop: "20px",
                fontSize: "19px",
                lineHeight: "1.65",
                color: "var(--text-secondary)",
                maxWidth: "720px",
                textWrap: "pretty",
              }}
            >
              Explore researched local rankings for {categories.length} trades, from plumbers and HVAC
              contractors to roofers, remodelers, chimney professionals and movers.
            </p>
          </div>

          <div data-searchbox="" style={{ position: "relative", marginTop: "32px", maxWidth: "940px" }}>
            <form
              action={routes.search()}
              method="get"
              role="search"
              aria-label="Find home service professionals"
              data-stack=""
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
                boxShadow: "var(--shadow-lg)",
                padding: "8px",
              }}
            >
              <div style={{ flex: "1.15", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.34-4.34" />
                </svg>
                <label htmlFor="hs-svc" style={SR_ONLY}>
                  What service do you need?
                </label>
                <input id="hs-svc" name="service" type="text" placeholder="Plumber, roofer, chimney repair, remodeling…" style={FIELD} />
              </div>
              <div aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
              <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <label htmlFor="hs-loc" style={SR_ONLY}>
                  Where?
                </label>
                <input id="hs-loc" name="location" type="text" autoComplete="postal-code" placeholder="City or ZIP code" style={FIELD} />
              </div>
              <button type="submit" style={{ ...SUBMIT, boxShadow: "var(--shadow-primary)" }}>
                Find the best
              </button>
            </form>

            {/* Opens on focus, in CSS: the shortcuts people reach for most. */}
            <div
              data-suggest=""
              role="listbox"
              aria-label="Suggestions"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: "0",
                right: "0",
                zIndex: 320,
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
                boxShadow: "var(--shadow-xl)",
                padding: "18px 22px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <p style={SUGGEST_LABEL}>Categories</p>
                <ul>
                  {categories.slice(0, 4).map((category) => (
                    <li key={category.id}>
                      <Link href={routes.category(category.slug)} style={SUGGEST_LINK}>
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {liveTrending.length > 0 ? (
              <div>
                <p style={SUGGEST_LABEL}>Subservices</p>
                <ul>
                  {liveTrending.slice(0, 4).map((sub) => (
                    <li key={sub.id}>
                      <Link href={routes.subservice(sub.category.slug, sub.slug)} style={SUGGEST_LINK}>
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}
              <div>
                <p style={SUGGEST_LABEL}>Locations</p>
                <ul>
                  {cities.slice(0, 2).map((city) => (
                    <li key={city.id}>
                      <Link
                        href={routes.city(city.region.country.code, city.region.slug, city.slug)}
                        style={SUGGEST_LINK}
                      >
                        {city.name}, {city.region.code.toUpperCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={SUGGEST_LABEL}>Rankings</p>
                <ul>
                  {rankings.slice(0, 2).map((ranking) => (
                    <li key={ranking.id}>
                      <Link href={rankingUrl(ranking)} style={SUGGEST_LINK}>
                        {ranking.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul data-ag="" data-facts="" style={{ ...SHELL, ...autoGrid(220, "0", { padding: "0 24px" }) }}>
            {TRUST.map((item, index, all) => (
              <li
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding:
                    index === 0 ? "20px 24px 20px 0" : index === all.length - 1 ? "20px 0 20px 24px" : "20px 24px",
                  borderRight: index === all.length - 1 ? undefined : "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ color: item.color, display: "inline-flex" }}>
                  <Icon name={item.icon} size={21} strokeWidth={1.75} />
                </span>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SectionToc
        items={[
          { href: "#intro", label: "Start" },
          { href: "#categories", label: "Categories" },
          { href: "#projects", label: "Your needs" },
          ...(rankings.length > 0 ? [{ href: "#rankings", label: "Rankings" }] : []),
          { href: "#locations", label: "Explore" },
          { href: "#choose", label: "Choosing" },
          ...(costRows.length > 0 ? [{ href: "#costs", label: "Costs" }] : []),
          ...(emergency.length > 0 ? [{ href: "#emergency", label: "Timing" }] : []),
          { href: "#methodology", label: "Method" },
          ...(leadGuides.length > 0 ? [{ href: "#guides", label: "Guides" }] : []),
          ...(faqs.length > 0 ? [{ href: "#faqs", label: "FAQs" }] : []),
          { href: "#biz", label: "Businesses" },
        ]}
      />

      {/* ------------------------------------------------------------ intro */}
      <section
        id="intro"
        aria-labelledby="intro-h2"
        style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <h2 data-reveal="" id="intro-h2" style={SPLIT_H2}>
            {accentTail("Your starting point for home services", 2)}
          </h2>
          <div>
            <p style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              Home services cover the trades and companies homeowners hire to keep a property working,
              safe and comfortable: repairs to core systems like plumbing, heating and electrical,
              remodeling and construction projects, exterior improvements such as roofing and siding,
              protection work including pest control and restoration, and routine property care like
              cleaning, landscaping and moving. TenBestFind researches these businesses city by city
              and publishes rankings that compare reputation, experience, credentials, services and
              local presence, so you can start with a short list instead of a map full of pins. Use
              the category groups below to identify the right kind of professional, then follow
              through to the local ranking for your market.
            </p>
            <p style={{ marginTop: "18px", fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
              See{" "}
              <Link href={routes.howWeRank()} style={{ fontWeight: "600" }}>
                how we rank
              </Link>{" "}
              for our criteria, or read more{" "}
              <Link href={routes.page("about")} style={{ fontWeight: "600" }}>
                about TenBestFind
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <section
        id="categories"
        aria-labelledby="cats-h2"
        style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div style={SECTION}>
          <Kicker gap="14px">
            Explore services
          </Kicker>
          <div style={{ ...SECTION_HEAD, marginBottom: "40px" }}>
            <h2 data-reveal="" id="cats-h2" style={SECTION_H2}>
              {accentTail("Find the right home service professional", 2)}
            </h2>
            <ArrowLink href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
              View all rankings
            </ArrowLink>
          </div>

          {bands.map((band) => (
            <div key={band.title} style={{ marginBottom: "44px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  paddingBottom: "14px",
                  marginBottom: "20px",
                  borderBottom: "2px solid var(--blue-900)",
                }}
              >
                <h3 style={{ fontSize: "20px", fontWeight: "700" }}>{band.title}</h3>
                <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>{band.note}</span>
              </div>
              <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
                {band.items.map((category) => (
                  <li
                    key={category.id}
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "16px",
                      padding: "20px",
                      boxShadow: "var(--shadow-xs)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                    }}
                  >
                    <Tile icon={icon(category.iconKey)} flex />
                    <span style={{ display: "block", minWidth: "0" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "700", lineHeight: "1.3", marginBottom: "4px" }}>
                        {liveSlugs.has(category.slug) ? (
                          <Link href={routes.category(category.slug)} style={{ color: "var(--blue-900)" }}>
                            {category.name}
                          </Link>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>{category.name}</span>
                        )}
                      </h4>
                      <p style={{ fontSize: "13px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                        {category.tagline}
                        {liveSlugs.has(category.slug) ? null : " · Rankings coming soon"}
                      </p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- projects */}
      <section id="projects" aria-labelledby="proj-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <Kicker gap="14px">
            Start with your project
          </Kicker>
          <div style={SECTION_HEAD}>
            <h2 data-reveal="" id="proj-h2" style={SECTION_H2}>
              {accentTail("What do you need help with?", 2)}
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "420px" }}>
              Not sure which trade you need? Start from the job instead of the job title.
            </p>
          </div>
          <div data-stagger="" data-ag="" data-facts="" style={autoGrid(230, "18px")}>
            {PROJECT_GROUPS.map((group) => (
              <div key={group.title} data-card="" style={{ ...CARD, padding: "24px 22px 18px" }}>
                <Tile icon={icon(group.iconKey)} size={46} iconSize={22} tone="amber" style={{ marginBottom: "16px" }} />
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: "700",
                    paddingBottom: "14px",
                    marginBottom: "6px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {group.title}
                </h3>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      {isLive(href) ? (
                        <Link data-row="proj" href={href} style={{ ...ROW, padding: "8px 10px" }}>
                          {label}
                          <Chevron />
                        </Link>
                      ) : (
                        <span style={{ ...ROW, padding: "8px 10px", color: "var(--text-secondary)" }}>{label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {liveTrending.length > 0 ? (
            <div
              style={{
                marginTop: "36px",
                padding: "22px 24px",
                background: "var(--surface-page)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  letterSpacing: "var(--ls-wide)",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  marginRight: "6px",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
                Trending now
              </span>
              {liveTrending.map((sub) => (
                <Link
                  key={sub.id}
                  href={routes.subservice(sub.category.slug, sub.slug)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--blue-900)",
                  }}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <section
          id="rankings"
          aria-labelledby="rank-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION}>
            <Kicker gap="14px">
              Popular local rankings
            </Kicker>
            <div style={SECTION_HEAD}>
              <h2 data-reveal="" id="rank-h2" style={SECTION_H2}>
                {accentTail("Popular home service rankings", 2)}
              </h2>
              <ArrowLink href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                View all rankings
              </ArrowLink>
            </div>
            <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
              {rankings.map((ranking) => (
                <li key={ranking.id} data-card="" style={{ ...CARD, padding: "22px 24px", display: "flex", gap: "18px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 46px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "46px",
                      height: "46px",
                      borderRadius: "13px",
                      background: "var(--amber-50)",
                      color: "#8A5F0B",
                      fontSize: "15px",
                      fontWeight: "700",
                    }}
                  >
                    10
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: "0" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--color-primary)",
                      }}
                    >
                      {ranking.category.name}
                      {ranking.city ? ` · ${ranking.city.name}, ${ranking.city.region.code.toUpperCase()}` : ""}
                    </span>
                    <h3 style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700" }}>
                      <Link href={rankingUrl(ranking)} style={{ color: "var(--blue-900)" }}>
                        {ranking.title}
                      </Link>
                    </h3>
                    {ranking.summary ? (
                      <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                        {ranking.summary}
                      </span>
                    ) : null}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginTop: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        Updated {monthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                      </span>
                      <ArrowLink href={rankingUrl(ranking)} style={{ fontSize: "14px", fontWeight: "600" }}>
                        View ranking
                      </ArrowLink>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- locations */}
      <section id="locations" aria-labelledby="geo-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <Kicker gap="14px">
            Local expertise, nationwide
          </Kicker>
          <h2 data-reveal="" id="geo-h2" style={{ ...SECTION_H2, marginBottom: "32px", maxWidth: "680px", textWrap: "balance" }}>
            {accentTail("Explore home services across every market we cover", 3)}
          </h2>

          <div data-split="" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "24px" }}>
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "26px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "16px",
                  paddingBottom: "14px",
                  marginBottom: "6px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>
                  Popular {regionNounAcross(countriesOf(regions), 2, "and")}
                </h3>
                <Link href={routes.locationsIndex()} style={{ fontSize: "14px", fontWeight: "600" }}>
                  Browse all
                </Link>
              </div>
              {/* One list said "Popular states" over Ontario and Florida
                  together. Each country gets its own short list under its own
                  name, and its own word for what these places are. */}
              {groupByCountry(regions).map((group) => (
                <div key={group.country.code} style={{ marginBottom: "14px" }}>
                  <p
                    style={{
                      fontSize: "11.5px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      margin: "10px 0 2px",
                    }}
                  >
                    {group.country.name}
                  </p>
                  <ul style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                    {group.regions.slice(0, 6).map((region) => (
                      <li key={region.id}>
                        <Link data-row="place" href={routes.region(region.country.code, region.slug)} style={ROW}>
                          {region.name}
                          <Chevron />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "26px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "16px",
                  paddingBottom: "14px",
                  marginBottom: "6px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Popular cities</h3>
                <Link href={routes.locationsIndex()} style={{ fontSize: "14px", fontWeight: "600" }}>
                  Browse all cities
                </Link>
              </div>
              <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(150, "0 20px")}>
                {cities.map((city) => (
                  <li key={city.id}>
                    <Link
                      data-row="place"
                      href={routes.city(city.region.country.code, city.region.slug, city.slug)}
                      style={ROW}
                    >
                      {city.name}, {city.region.code.toUpperCase()}
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- choose */}
      <section
        id="choose"
        aria-labelledby="choose-h2"
        style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div style={SECTION}>
          <Kicker gap="14px">
            Before you hire
          </Kicker>
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "56px", alignItems: "start" }}>
            <div style={{ position: "sticky", top: "100px" }}>
              <h2 data-reveal="" id="choose-h2" style={{ ...SECTION_H2, lineHeight: "1.15", marginBottom: "20px", textWrap: "balance" }}>
                {accentTail("How to choose a home service professional", 2)}
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-secondary)", marginBottom: "16px", textWrap: "pretty" }}>
                Hiring well has less to do with finding the cheapest quote than with confirming a
                handful of things before work starts. Requirements differ by trade and by state: an
                electrician or plumber usually needs a licence, while a handyman or cleaning company
                often does not, and the dollar threshold at which a contractor licence becomes
                mandatory varies widely.
              </p>
              <p style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-secondary)", textWrap: "pretty" }}>
                Whatever the trade, ask for the same things in writing: scope, materials, timeline,
                exclusions and warranty terms. For larger projects, confirm who pulls the permit and
                who is responsible if inspection fails. These questions cost nothing and remove most
                of the risk in the relationship.
              </p>
              <p style={{ marginTop: "20px" }}>
                <ArrowLink href="/guides/how-to-choose/" style={{ fontSize: "16px", fontWeight: "600" }}>
                  Read the full hiring guide
                </ArrowLink>
              </p>
            </div>
            <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
              {HIRING_CRITERIA.map((item) => (
                <li
                  key={item.title}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "20px 22px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--color-success)", display: "inline-flex", paddingTop: "2px" }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span style={{ display: "block" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>{item.title}</h3>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{item.text}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ costs */}
      {costRows.length > 0 ? (
        <section id="costs" aria-labelledby="costs-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
          >
            <div>
              <Kicker gap="14px">
                Project planning
              </Kicker>
              <h2 data-reveal="" id="costs-h2" style={{ ...SPLIT_H2, marginBottom: "18px" }}>
                {accentTail("Understanding home service costs", 2)}
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
                Pricing for home services moves with location, labour availability, materials, project
                complexity, permits, home size, how accessible the work area is, and whether the job
                is scheduled or urgent. Two identical projects in different markets can land far
                apart, which is why we describe cost drivers rather than publishing a single national
                number.
              </p>
              <p style={{ marginTop: "20px" }}>
                <ArrowLink href="/guides/cost/" style={{ fontSize: "16px", fontWeight: "600" }}>
                  Explore home service cost guides
                </ArrowLink>
              </p>
            </div>
            <div style={{ ...CARD, overflowX: "auto" }}>
              <table style={{ minWidth: "520px" }}>
                <caption
                  style={{
                    textAlign: "left",
                    padding: "20px 26px 16px",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "var(--blue-900)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  What moves the price in each category
                </caption>
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    {["Service", "Main cost drivers"].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        style={{
                          padding: "12px 26px",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "var(--ls-wide)",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.name}>
                      <th
                        scope="row"
                        style={{
                          padding: "16px 26px",
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        {row.name}
                      </th>
                      <td
                        style={{
                          padding: "16px 26px",
                          fontSize: "15px",
                          lineHeight: "1.6",
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        {row.drivers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- emergency */}
      {emergency.length > 0 ? (
        <section
          id="emergency"
          aria-labelledby="emg-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "var(--ls-wider)",
                textTransform: "uppercase",
                color: "#C32620",
                marginBottom: "14px",
              }}
            >
              Urgent help
            </p>
            <div data-split="" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "48px", alignItems: "start" }}>
              <div>
                <h2 data-reveal="" id="emg-h2" style={{ ...SPLIT_H2, marginBottom: "16px" }}>
                  {accentTail("When you need a pro quickly", 2)}
                </h2>
                <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
                  Urgent service availability varies by provider and by market. Some companies staff
                  after-hours crews, others return calls the next morning, and response windows differ
                  between dense metros and rural areas. Confirm availability directly with the company
                  before assuming same-day help.
                </p>
              </div>
              <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(240, "12px")}>
                {emergency.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      data-row="pill"
                      href={routes.subservice(sub.category.slug, sub.slug)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "15px 18px",
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "14px",
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "var(--blue-900)",
                        textDecoration: "none",
                      }}
                    >
                      <span aria-hidden="true" style={{ display: "inline-flex", color: "#C32620", flexShrink: 0 }}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4" />
                          <path d="M12 17h.01" />
                          <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
                        </svg>
                      </span>
                      {sub.name}
                      <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                        <Chevron />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ methodology */}
      <section
        id="methodology"
        aria-labelledby="method-h2"
        style={{ position: "relative", overflow: "hidden", background: "var(--ink)", color: "var(--text-on-ink)" }}
      >
        <DarkBackdrop />
        <div style={{ ...SECTION, position: "relative" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "var(--ls-wider)",
              textTransform: "uppercase",
              color: "#E8B551",
              marginBottom: "14px",
            }}
          >
            Our research process
          </p>
          <div style={{ ...SECTION_HEAD, marginBottom: "16px" }}>
            <h2 data-reveal="" id="method-h2" style={{ ...SECTION_H2, color: "#fff" }}>
              {accentTail("How we evaluate home service businesses", 2)}
            </h2>
            <ArrowLink dark href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              Read our ranking methodology
            </ArrowLink>
          </div>
          <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)", maxWidth: "760px", marginBottom: "40px" }}>
            This is the shared framework. Criteria are then written per category: a chimney company is
            not evaluated the same way as a moving company or a remodeling contractor, because the
            decisions consumers face are different.
          </p>
          <ul data-stagger="" data-ag="" data-facts="" style={{ ...autoGrid(240, "16px", { marginBottom: "48px" }) }}>
            {EVAL_CRITERIA.map((item) => (
              <li key={item.title} data-hov="" data-dark-card="" style={DARK_CARD}>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{item.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)" }}>{item.text}</p>
              </li>
            ))}
          </ul>

          <h3
            data-reveal=""
            data-h2=""
            style={{
              fontSize: "clamp(26px, 3vw, 36px)",
              lineHeight: "1.08",
              fontWeight: "800",
              letterSpacing: "-0.035em",
              color: "#fff",
              marginBottom: "24px",
            }}
          >
            {accentTail("Home service research you can understand", 2)}
          </h3>
          <ul data-stagger="" data-ag="" data-facts="" style={{ ...autoGrid(240, "16px", { marginBottom: "32px" }) }}>
            {EEAT.map((item) => (
              <li key={item.title} data-hov="" data-dark-card="" style={DARK_CARD}>
                <h4 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{item.title}</h4>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)", marginBottom: "12px" }}>
                  {item.body}
                </p>
                <ArrowLink dark href={item.href} style={{ fontSize: "14px", fontWeight: "600", color: "#E8B551" }}>
                  {item.cta}
                </ArrowLink>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: "15px", color: "rgba(232,237,245,0.7)" }}>
            Prepared by the{" "}
            <Link href={routes.editorialTeam()} style={{ color: "#E8B551", fontWeight: "600" }}>
              TenBestFind editorial team
            </Link>
            {rankings[0] ? ` · Last reviewed ${monthYear(rankings[0].lastReviewedAt ?? rankings[0].publishedAt)}` : ""}
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- guides */}
      {leadGuides.length > 0 ? (
        <section id="guides" aria-labelledby="guides-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <Kicker gap="14px">
              Homeowner resources
            </Kicker>
            <div style={SECTION_HEAD}>
              <h2 data-reveal="" id="guides-h2" style={SECTION_H2}>
                {accentTail("Guides for hiring and maintaining your home", 2)}
              </h2>
              <ArrowLink href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All homeowner guides
              </ArrowLink>
            </div>
            <ul
              data-stagger=""
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                marginBottom: "44px",
              }}
            >
              {leadGuides.map((guide) => (
                <li key={guide.id} data-card="" style={{ ...CARD, borderRadius: "16px", padding: "22px 24px" }}>
                  <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700", marginBottom: "8px" }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  {guide.excerpt ? (
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "10px" }}>
                      {guide.excerpt}
                    </p>
                  ) : null}
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {[guide.author ? `By ${guide.author.name}` : null, `Updated ${shortMonthYear(guide.reviewedAt ?? guide.publishedAt)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>

            {categoryGuides.length > 0 ? (
              <>
                <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "18px" }}>Guides by category</h3>
                <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(300, "12px")}>
                  {categoryGuides.map((guide) => (
                    <li
                      key={guide.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 20px",
                        background: "var(--surface-page)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "14px",
                      }}
                    >
                      <span
                        style={{
                          flex: "0 0 auto",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                        }}
                      >
                        <Link href={routes.category(guide.category!.slug)} style={{ color: "var(--blue-900)" }}>
                          {guide.category!.serviceName}
                        </Link>
                      </span>
                      <Link href={routes.guide(guide.slug)} style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {guide.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      {faqs.length > 0 ? (
        <section
          id="faqs"
          aria-labelledby="faqs-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            data-split=""
            style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "56px", alignItems: "start" }}
          >
            <h2 data-reveal="" id="faqs-h2" style={SPLIT_H2}>
              {accentTail("Common questions about home services", 2)}
            </h2>
            <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
              {faqs.map((faq) => (
                <FaqRow key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- biz */}
      <section id="biz" aria-labelledby="biz-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
          <div
            data-split=""
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0",
              border: "1px solid var(--border-subtle)",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ padding: "44px 44px 48px", background: "var(--blue-50)" }}>
              <Kicker gap="16px">
                For home service businesses
              </Kicker>
              <h2 data-reveal="" id="biz-h2" style={{ ...SPLIT_H2, marginBottom: "16px" }}>
                {accentTail("Reach homeowners researching local pros", 2)}
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "460px" }}>
                TenBestFind offers clearly identified promotional opportunities for home service
                companies looking to reach consumers researching their services and location.
              </p>
              <div style={{ marginTop: "28px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link
                  data-btn=""
                  href={routes.advertise()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: "52px",
                    padding: "0 26px",
                    borderRadius: "14px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "600",
                    boxShadow: "var(--shadow-primary)",
                  }}
                >
                  Sponsor your business
                </Link>
                <Link
                  href={routes.forBusinesses()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: "52px",
                    padding: "0 24px",
                    borderRadius: "14px",
                    border: "1.5px solid var(--border-strong)",
                    background: "var(--surface-card)",
                    color: "var(--blue-900)",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  Advertising opportunities
                </Link>
              </div>
            </div>
            <ul style={{ padding: "44px", background: "var(--surface-card)", display: "grid", gap: "22px", alignContent: "center" }}>
              {BIZ_POINTS.map((point) => (
                <li key={point.title} style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                  <Tile icon={point.icon} size={44} iconSize={21} flex />
                  <span style={{ display: "block" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>{point.title}</h3>
                    <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{point.body}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ final */}
      <section
        aria-labelledby="final-h2"
        style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}
      >
        <DarkBackdrop />
        <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", padding: "76px 24px", textAlign: "center" }}>
          <h2 data-reveal="" id="final-h2" style={{ ...SPLIT_H2, color: "#fff", marginBottom: "24px" }}>
            {accentTail("Find the right home service pro near you", 2)}
          </h2>
          <form
            action={routes.search()}
            method="get"
            role="search"
            aria-label="Find home service professionals"
            data-stack=""
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface-card)",
              borderRadius: "18px",
              boxShadow: "var(--shadow-xl)",
              padding: "8px",
              textAlign: "left",
            }}
          >
            <div style={{ flex: "1.15", padding: "0 14px" }}>
              <label htmlFor="hs-svc2" style={SR_ONLY}>
                Service
              </label>
              <input id="hs-svc2" name="service" type="text" placeholder="Service" style={FIELD} />
            </div>
            <div aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
            <div style={{ flex: "1", padding: "0 14px" }}>
              <label htmlFor="hs-loc2" style={SR_ONLY}>
                City or ZIP
              </label>
              <input id="hs-loc2" name="location" type="text" autoComplete="postal-code" placeholder="City or ZIP" style={FIELD} />
            </div>
            <button data-btn="" type="submit" style={SUBMIT}>
              Find the best
            </button>
          </form>
        </div>
      </section>
      </div>
    </SiteChrome>
  );
}
