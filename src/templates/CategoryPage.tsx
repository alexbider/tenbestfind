import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/site/blocks";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { InfoModal } from "@/components/site/InfoModal";
import {
  BTN_GHOST,
  Chevron,
  Crumbs,
  LABEL,
  LEAD,
  SHELL,
  SR_ONLY,
  TD,
  TH,
} from "@/components/site/page-parts";
import {
  ArrowLink,
  DarkBackdrop,
  FaqRow,
  FinalBand,
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
import { money, monthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { countriesOf, groupByCountry, regionNoun, regionNounAcross } from "@/lib/regions";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { serviceCopy, rankingCardTitle } from "@/lib/seo-copy";
import { breadcrumbSchema, serviceCrumbs } from "@/lib/breadcrumbs";
import { faqsFor } from "@/lib/faqs";
import { parseHubBody } from "@/lib/hub-body";
import { graph, pageEntity, serviceEntity, serviceId } from "@/lib/schema";

/** The checks that separate a company worth calling from one worth avoiding. */
const CHOOSE_STEPS = [
  { title: "Check the credential at source", body: "Ask for the licence or registration number, then look it up with the authority that issues it rather than taking the certificate at face value." },
  { title: "Get the insurance certificate from the insurer", body: "A current certificate sent directly by the insurer, not a photocopy from the company." },
  { title: "Ask for a written, itemised estimate", body: "Scope, materials, removal, disposal and who pulls the permit, all named on the page before anyone starts." },
  { title: "Compare like for like", body: "Two or three bids on the same scope. A number far below the others usually means something has been left out." },
  { title: "Separate the two warranties", body: "The manufacturer covers materials, the company covers the work. Get both in writing, and check whether the second transfers if you sell." },
  { title: "Ask who actually turns up", body: "Employees or subcontractors, and who supervises on the day." },
  { title: "Put the surprises in writing first", body: "Agree how change orders are priced and approved before the first payment." },
];

/** The display heading the design sets on its two-column sections. */
const SPLIT_H2 = {
  fontSize: "clamp(28px, 3.4vw, 42px)",
  lineHeight: "1.06",
  fontWeight: "800",
  letterSpacing: "-0.04em",
  textWrap: "balance" as const,
};
const SECTION_H2 = { fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" };
const BODY_P = { fontSize: "18px", lineHeight: "1.75", textWrap: "pretty" as const };
const ROW = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 10px",
  margin: "0 -10px",
  borderRadius: "10px",
  fontSize: "15px",
  color: "var(--text-primary)",
  textDecoration: "none",
};
const CITY_CHIP = {
  display: "block",
  padding: "7px 13px",
  borderRadius: "999px",
  border: "1px solid var(--border-subtle)",
  fontSize: "14px",
  color: "var(--text-primary)",
};
const SUB_CHIP = {
  display: "block",
  padding: "7px 13px",
  borderRadius: "999px",
  border: "1px solid var(--border-subtle)",
  fontSize: "13.5px",
  fontWeight: "600",
  color: "var(--blue-900)",
};
const SUGGEST_LINK = { display: "block", padding: "8px 0", fontSize: "15px", color: "var(--text-primary)" };
const AMBER_BADGE = {
  flex: "0 0 46px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "46px",
  height: "46px",
  borderRadius: "13px",
  background: "var(--amber-50)",
  color: "#8A5F0B",
  fontWeight: "700",
};
const PLUS_ICO = {
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: "1px solid var(--border-strong)",
  color: "var(--ink)",
};
const FIELD = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "50px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};

const TRUST: { icon: IconName; label: string; color: string }[] = [
  { icon: "pin", label: "Local rankings", color: "var(--color-primary)" },
  { icon: "shield", label: "Independent research", color: "var(--color-success)" },
  { icon: "balance", label: "Transparent methodology", color: "var(--color-primary)" },
  { icon: "clock", label: "Regularly reviewed", color: "var(--color-primary)" },
];

function PlusIcon() {
  return (
    <span data-fq-ico="" aria-hidden="true" style={PLUS_ICO}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </span>
  );
}

export async function CategoryPage({ categorySlug }: { categorySlug: string }) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    include: { subservices: { orderBy: { sortOrder: "asc" } } },
  });
  if (!category || !category.published) {
    await redirectIfKnown(routes.category(categorySlug));
    notFound();
  }

  const [rankings, guides, criteria, costRows, relatedCategories, regions] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { lastReviewedAt: "desc" },
      select: rankingCardSelect,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
    db.criterion.findMany({ where: { scope: "GLOBAL" }, orderBy: { sortOrder: "asc" }, take: 6 }),
    db.costRow.findMany({
      where: { guide: { categoryId: category.id, type: "COST" } },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    db.category.findMany({
      where: { published: true, groupName: category.groupName, NOT: { id: category.id } },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.region.findMany({
      where: { published: true, rankings: { some: { categoryId: category.id, status: "PUBLISHED" } } },
      include: {
        country: true,
        cities: {
          where: { rankings: { some: { categoryId: category.id, status: "PUBLISHED" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const copy = serviceCopy(category, { publishedRankings: rankings.length });
  const crumbs = serviceCrumbs(category);
  const body = parseHubBody(category.body);

  const singular = category.singular.toLowerCase();
  const generatedFaqs = [
    {
      question: `What does ${/^[aeiou]/i.test(category.singular) ? "an" : "a"} ${singular} do?`,
      answer:
        category.description ??
        `${category.name} handle ${category.tagline?.toLowerCase() ?? "work in this trade"}. Scope varies by company, which is why every ranking lists what each one actually takes on rather than what they advertise.`,
    },
    {
      question: `Do ${category.name.toLowerCase()} need a licence?`,
      answer:
        "It depends entirely on where you are. Some trades are licensed everywhere, some in only a few states or provinces, and some nowhere at all. Each ranking names the authority we checked for that market, or says plainly that the trade is not licensed there.",
    },
    {
      question: `How do you decide which ${category.name.toLowerCase()} make a list?`,
      answer:
        "We research every company that genuinely serves the market, check credentials with the issuing authority, compare service range, warranty terms and documented local work, then read patterns in public feedback. The criteria are published on every ranking.",
    },
    {
      question: `How much does ${singular} work cost?`,
      answer:
        "Cost depends on the job, the market and the material grade. We publish sourced ranges per market rather than a single national average, and where we have no sourced figure we say so rather than inventing one.",
    },
    {
      question: "Can a company pay to be on a list?",
      answer:
        "No. Editorial positions are not for sale. Companies can buy a labelled sponsored placement that sits outside the ranked list, and it carries a Sponsored label wherever it appears.",
    },
    {
      question: "My city is not listed. What now?",
      answer:
        "We add markets each month, working outward from the largest metros. The country and state pages show the nearest covered areas, and you can request a market through the contact form.",
    },
  ];


  // A question written for this service replaces the generated set.
  const faqs = await faqsFor(
    "CATEGORY",
    category.id,
    generatedFaqs.map((faq, index) => ({ id: String(index), ...faq })),
  );

  const icon = (key: string | null | undefined): IconName => (key && hasIcon(key) ? (key as IconName) : "house");
  const article = /^[aeiou]/i.test(category.singular) ? "an" : "a";
  const latest = rankings[0];

  const cityChips = rankings.filter((entry) => entry.city).slice(0, 4);
  const regionWord = regionNounAcross(countriesOf(regions));
  const tocItems = [
    ...(category.subservices.length > 0 ? [{ href: "#services", label: "Services" }] : []),
    ...(rankings.length > 0 ? [{ href: "#cities", label: "Popular cities" }] : []),
    ...(regions.length > 0 ? [{ href: "#states", label: `By ${regionWord}` }] : []),
    ...(costRows.length > 0 ? [{ href: "#costs", label: "Costs" }] : []),
    { href: "#choose", label: "How to choose" },
    { href: "#methodology", label: "How we rank" },
    ...(guides.length > 0 ? [{ href: "#guides", label: "Guides" }] : []),
    { href: "#faqs", label: "FAQs" },
  ];

  return (
    <SiteChrome active="services" skin>
      <div className="v2-svc" style={{ display: "contents" }}>
      {/* CollectionPage says the page lists things. The Service beside it says
          which trade and where it is covered, which is the part an engine needs
          to answer a question about the trade rather than about the page. */}
      <JsonLd
        data={graph(
          pageEntity({
            path: routes.category(category.slug),
            name: copy.h1,
            description: copy.description,
            type: "CollectionPage",
            dateModified: category.updatedAt,
            mainEntity: { "@id": serviceId(routes.category(category.slug)) },
          }),
          serviceEntity({
            path: routes.category(category.slug),
            name: category.serviceName,
            serviceType: category.serviceName,
            description: category.description,
            areaServed: regions.map((region) => `${region.name}, ${region.country.name}`),
            offers: category.subservices.map((sub) => ({
              name: sub.name,
              path: routes.subservice(category.slug, sub.slug),
            })),
          }),
        )}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs} />

      {/* ------------------------------------------------------------- hero */}
      <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)" }}>
        <HeroBackdrop />
        <div style={{ ...SHELL, position: "relative", padding: "20px 24px 64px" }}>
          <div style={{ marginBottom: "28px" }}>
            <Crumbs flush items={crumbs} />
          </div>
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "56px", alignItems: "start" }}>
            <div>
              <Kicker hero="1" gap="16px">
                Home services
              </Kicker>
              <h1
                data-in="2"
                style={{
                  fontSize: "clamp(36px, 5vw, 60px)",
                  lineHeight: "1.07",
                  letterSpacing: "-0.04em",
                  fontWeight: "800",
                  textWrap: "balance",
                }}
              >
                {heroAccentTail(copy.h1, 2)}
              </h1>
              <p data-in="3" style={{ ...LEAD, marginTop: "20px", fontSize: "18px", maxWidth: "600px", textWrap: "pretty" }}>
                Compare TenBestFind rankings of local {category.name.toLowerCase()}, explore common{" "}
                {category.serviceName.toLowerCase()} services, understand typical costs and learn what to look for
                before hiring.
              </p>
              <div style={{ marginTop: "22px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <span>
                  Prepared by the{" "}
                  <Link href={routes.editorialTeam()} style={{ fontWeight: "600" }}>
                    TenBestFind Editorial Team
                  </Link>
                </span>
                {latest ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Updated {monthYear(latest.lastReviewedAt ?? latest.publishedAt)}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div
              data-hero-side=""
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-lg)",
                padding: "26px 26px 24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                {accentTail(`Find top-rated ${category.name.toLowerCase()} in your area`, 2)}
              </h2>
              <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "18px" }}>
                Enter your city or postal code and we will take you to the ranking for that market.
              </p>
              <div data-searchbox="" style={{ position: "relative" }}>
                <form
                  action={routes.search()}
                  method="get"
                  role="search"
                  aria-label={`Find ${category.name.toLowerCase()} by location`}
                  data-stack=""
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <input type="hidden" name="service" value={category.serviceName} />
                  <div
                    style={{
                      flex: "1",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      height: "54px",
                      padding: "0 14px",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "14px",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <label htmlFor="cat-loc" style={SR_ONLY}>
                      City or postal code
                    </label>
                    <input
                      id="cat-loc"
                      name="location"
                      type="text"
                      autoComplete="postal-code"
                      placeholder="City or postal code"
                      style={FIELD}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      height: "54px",
                      padding: "0 26px",
                      border: "0",
                      borderRadius: "14px",
                      background: "var(--color-primary)",
                      color: "#fff",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-primary)",
                    }}
                  >
                    Search
                  </button>
                </form>
                {cityChips.length > 0 ? (
                  <div
                    data-suggest=""
                    role="listbox"
                    aria-label="Location suggestions"
                    style={{
                      position: "absolute",
                      left: "0",
                      right: "0",
                      top: "calc(100% + 8px)",
                      zIndex: 320,
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "16px",
                      boxShadow: "var(--shadow-xl)",
                      padding: "12px 16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wider)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      Rankings available
                    </p>
                    <ul>
                      {rankings.slice(0, 5).map((entry) => (
                        <li key={entry.id}>
                          <Link href={rankingUrl(entry)} style={SUGGEST_LINK}>
                            {rankingCardTitle(entry)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {cityChips.length > 0 ? (
                <ul style={{ marginTop: "18px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {cityChips.map((entry) => (
                    <li key={entry.id}>
                      <Link href={rankingUrl(entry)} style={CITY_CHIP}>
                        {entry.city!.name}, {entry.city!.region.code.toUpperCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {category.subservices.length > 0 ? (
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: cityChips.length > 0 ? "12px" : "18px" }}>
                  {category.subservices.slice(0, 6).map((sub) => (
                    <li key={sub.id}>
                      <Link href={routes.subservice(category.slug, sub.slug)} style={SUB_CHIP}>
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
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

      <SectionToc items={tocItems} />

      {/* ------------------------------------------------------------- what */}
      <section id="what" aria-labelledby="what-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <h2 data-reveal="" id="what-h2" style={SPLIT_H2}>
            {accentTail(`What does ${article} ${singular} do?`, 2)}
          </h2>
          <div>
            {/* A written body replaces the one-liner rather than joining it. */}
            {body.length > 0 ? (
              <div className="prose">
                <GuideBody blocks={body} />
              </div>
            ) : (
              <p style={{ ...BODY_P, color: "var(--text-primary)" }}>
                {category.description ??
                  `${category.serviceName} covers the work most households need at some point, from routine maintenance to the jobs that cannot wait. What a licence actually permits varies by state or province, which is why every ranking opens with the local rules before it lists a single company.`}
              </p>
            )}
            {category.subservices.length > 0 ? (
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "22px" }}>
                {category.subservices.map((sub) => (
                  <li key={sub.id}>
                    <Link href={routes.subservice(category.slug, sub.slug)} style={SUB_CHIP}>
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      {category.subservices.length > 0 ? (
        <section id="services" aria-labelledby="services-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Kicker>Explore services</Kicker>
            <h2 data-reveal="" id="services-h2" style={{ ...SECTION_H2, marginBottom: "32px" }}>
              {accentTail(`Popular ${category.serviceName.toLowerCase()} services`, 1)}
            </h2>
            <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(270, "16px")}>
              {category.subservices.map((sub) => (
                <li
                  key={sub.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "22px",
                    padding: "24px",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <Tile icon={icon(sub.iconKey ?? category.iconKey)} size={46} iconSize={22} style={{ borderRadius: "13px" }} />
                  <h3 style={{ fontSize: "17px", fontWeight: "700", lineHeight: "1.3" }}>{sub.name}</h3>
                  {sub.description ? (
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{sub.description}</p>
                  ) : null}
                  <ArrowLink
                    href={routes.subservice(category.slug, sub.slug)}
                    style={{ marginTop: "auto", paddingTop: "8px", fontSize: "14px", fontWeight: "600" }}
                  >
                    About {sub.name.toLowerCase()}
                  </ArrowLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- cities */}
      {rankings.length > 0 ? (
        <section id="cities" aria-labelledby="cities-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Kicker>Popular locations</Kicker>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "12px" }}>
              <h2 data-reveal="" id="cities-h2" style={SECTION_H2}>
                {accentTail(`Find the best ${category.name.toLowerCase()} by city`, 2)}
              </h2>
              <ArrowLink href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All rankings
              </ArrowLink>
            </div>
            <p style={{ fontSize: "17px", color: "var(--text-secondary)", marginBottom: "32px" }}>
              Each list is researched for that market, with the criteria and the review date on the page.
            </p>
            <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(320, "20px")}>
              {rankings.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "22px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "22px 24px",
                    display: "flex",
                    gap: "18px",
                  }}
                >
                  <span aria-hidden="true" style={{ ...AMBER_BADGE, fontSize: "15px" }}>
                    {entry._count.entries}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                    <h3 style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700" }}>
                      <Link href={rankingUrl(entry)} style={{ color: "var(--blue-900)" }}>
                        {rankingCardTitle(entry)}
                      </Link>
                    </h3>
                    {entry.summary ? (
                      <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{entry.summary}</span>
                    ) : null}
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        Reviewed {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                      </span>
                      <ArrowLink href={rankingUrl(entry)} style={{ fontSize: "14px", fontWeight: "600" }}>
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

      {/* ----------------------------------------------------------- states

           Grouped by country, because a state and a province are the same
           rung of the ladder and a different word. Ungrouped this printed
           "Browse plumbers by provinces" over Florida and Ontario: the
           plural of whichever region sorted first, applied to both, with
           nothing to say which country either name belonged to. */}
      {regions.length > 0 ? (
        <section id="states" aria-labelledby="states-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "28px" }}>
              <h2 data-reveal="" id="states-h2" style={SECTION_H2}>
                Browse {category.name.toLowerCase()} <span className="serif-accent">by {regionWord}</span>
              </h2>
              <ArrowLink href={routes.locationsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Every location
              </ArrowLink>
            </div>
            {groupByCountry(regions).map((group) => (
              <div key={group.country.code} style={{ marginBottom: "34px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", color: "var(--blue-900)" }}>
                    <Link href={routes.country(group.country.code)} style={{ color: "var(--blue-900)" }}>
                      {group.country.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    {group.regions.length} {regionNoun(group.country, group.regions.length)}
                  </p>
                </div>
                <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(300, "16px")}>
                  {group.regions.map((entry) => (
                    <li
                      key={entry.id}
                      data-card=""
                      style={{
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "22px",
                        padding: "20px 22px",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        gap: "16px",
                      }}
                    >
                      <span aria-hidden="true" style={{ ...AMBER_BADGE, fontSize: "14px", letterSpacing: "0.02em" }}>
                        {entry.code.toUpperCase()}
                      </span>
                      <span style={{ display: "block", minWidth: 0 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "700", lineHeight: "1.3", marginBottom: "8px" }}>
                          <Link href={routes.region(entry.country.code, entry.slug)} style={{ color: "var(--blue-900)" }}>
                            {entry.name}
                          </Link>
                        </h4>
                        <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {entry.cities.slice(0, 5).map((city) => (
                            <li key={city.id}>
                              <Link
                                href={routes.ranking(entry.country.code, entry.slug, city.slug, category.slug)}
                                style={{
                                  display: "inline-block",
                                  padding: "5px 11px",
                                  borderRadius: "999px",
                                  border: "1px solid var(--border-subtle)",
                                  fontSize: "13px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {city.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <details
              data-faq=""
              style={{
                marginTop: "20px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
                padding: "4px 24px",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "18px 0",
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "var(--blue-900)",
                  cursor: "pointer",
                }}
              >
                Show every location alphabetically
                <PlusIcon />
              </summary>
              {/* A-Z within each country rather than across both. "Miami, FL"
                  next to "Toronto, ON" is only unambiguous to a reader who
                  already knows every abbreviation on both sides of the
                  border. */}
              <div style={{ padding: "4px 0 22px", display: "grid", gap: "18px" }}>
                {groupByCountry(regions).map((group) => (
                  <div key={group.country.code}>
                    <h4
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "8px",
                      }}
                    >
                      {group.country.name}
                    </h4>
                    <ul data-ag="" data-facts="" style={autoGrid(180, "0 20px")}>
                      {group.regions
                        .flatMap((entry) =>
                          entry.cities.map((city) => ({
                            key: city.id,
                            name: `${city.name}, ${entry.code.toUpperCase()}`,
                            href: routes.ranking(entry.country.code, entry.slug, city.slug, category.slug),
                          })),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <li key={item.key}>
                            <Link data-row="tight" href={item.href} style={ROW}>
                              {item.name}
                              <Chevron />
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ costs */}
      {costRows.length > 0 ? (
        <section id="costs" aria-labelledby="costs-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "80px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
          >
            <div>
              <h2 data-reveal="" id="costs-h2" style={{ ...SPLIT_H2, marginBottom: "18px" }}>
                {accentTail(`How much does ${article} ${singular} cost?`, 2)}
              </h2>
              <p style={{ ...LEAD, lineHeight: "1.75" }}>
                Cost depends on the job, the market and the grade of material. We publish sourced ranges per market
                rather than one national average, and where there is no sourced figure the page says so.
              </p>
              <div style={{ marginTop: "20px" }}>
                <InfoModal
                  label="About these ranges"
                  title="About these ranges"
                  link={{ href: routes.howWeRank(), label: "How we research" }}
                >
                  Ranges are compiled from published local pricing and updated with each editorial review. They are not
                  quotes. A real price depends on the property, and every company prices it differently.
                </InfoModal>
              </div>
            </div>
            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
                background: "var(--surface-card)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <table style={{ minWidth: "520px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    <th scope="col" style={{ ...TH, padding: "12px 26px" }}>Service</th>
                    <th scope="col" style={{ ...TH, whiteSpace: "nowrap" }}>Typical range</th>
                    <th scope="col" style={{ ...TH, padding: "12px 26px" }}>What moves the price</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ ...TD, padding: "18px 26px", fontWeight: "600", color: "var(--blue-900)", verticalAlign: "top" }}>{row.label}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap", verticalAlign: "top" }}>
                        {row.lowPrice && row.highPrice
                          ? `${money(row.lowPrice, row.currency)} to ${money(row.highPrice, row.currency)}`
                          : row.typical
                            ? money(row.typical, row.currency)
                            : "On request"}
                      </td>
                      <td style={{ ...TD, padding: "18px 26px", color: "var(--text-secondary)", lineHeight: "1.6", verticalAlign: "top" }}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- choose */}
      <section id="choose" aria-labelledby="choose-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "80px 24px" }}>
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "56px", alignItems: "start" }}>
            <div style={{ position: "sticky", top: "148px" }}>
              <h2
                data-reveal=""
                id="choose-h2"
                style={{ ...SECTION_H2, lineHeight: "1.15", marginBottom: "20px", textWrap: "balance" }}
              >
                {accentTail(`How to choose a reliable ${singular}`, 2)}
              </h2>
              <p style={{ ...LEAD, lineHeight: "1.8", textWrap: "pretty" }}>
                The same handful of checks separates a company worth calling from one worth avoiding, whatever the
                trade.
              </p>
            </div>
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              <ol>
                {CHOOSE_STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    style={{
                      display: "flex",
                      gap: "18px",
                      padding: "20px 26px",
                      borderBottom: index === CHOOSE_STEPS.length - 1 ? undefined : "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ ...AMBER_BADGE, flex: "0 0 40px", width: "40px", height: "40px", borderRadius: "11px", fontSize: "13px" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span style={{ display: "block", minWidth: 0 }}>
                      <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "5px" }}>{step.title}</h3>
                      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{step.body}</p>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ local */}
      <section id="local" aria-labelledby="local-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <h2 data-reveal="" id="local-h2" style={SPLIT_H2}>
            {accentTail(`${category.serviceName} requirements can vary by location`, 2)}
          </h2>
          <div>
            <p style={{ ...BODY_P, color: "var(--text-secondary)", marginBottom: "16px" }}>
              What a licence covers, who pulls the permit and what insurance is required are all set locally. A company
              that is properly credentialled in one state may not be in the next one over.
            </p>
            <p style={{ ...BODY_P, color: "var(--text-secondary)" }}>
              Every ranking opens with the rules that apply in that market, so the list that follows can be read against
              them rather than in the abstract.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ methodology */}
      <section
        id="methodology"
        aria-labelledby="method-h2"
        style={{ position: "relative", overflow: "hidden", background: "var(--ink)", color: "var(--text-on-ink)" }}
      >
        <DarkBackdrop />
        <div style={{ ...SHELL, position: "relative", padding: "80px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "16px" }}>
            <h2 data-reveal="" id="method-h2" style={{ ...SECTION_H2, color: "#fff" }}>
              {accentTail(`How we evaluate ${category.serviceName.toLowerCase()} companies`, 2)}
            </h2>
            <ArrowLink dark href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              Full methodology
            </ArrowLink>
          </div>
          <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)", maxWidth: "720px", marginBottom: "40px" }}>
            The steps are the same for every trade. The criteria are not, because a good mover and a good electrician
            are not measured the same way.
          </p>
          {criteria.length > 0 ? (
            <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(250, "16px")}>
              {criteria.map((criterion) => (
                <li
                  key={criterion.id}
                  data-hov=""
                  data-dark-card=""
                  style={{
                    transition: "background 200ms ease, border-color 200ms ease",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "16px",
                    padding: "22px 24px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{criterion.title}</h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)" }}>{criterion.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- authors */}
      <section id="authors" aria-labelledby="authors-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "40px", alignItems: "start" }}
        >
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <h2 data-reveal="" id="authors-h2" style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>
              {accentTail(`About our ${category.serviceName.toLowerCase()} research`, 2)}
            </h2>
            <p style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "18px" }}>
              Every list carries the name of the editor who researched it and the date they last checked it. Where we
              could not verify something, the page says so rather than leaving it implied.
            </p>
            <Link href={routes.editorialTeam()} style={BTN_GHOST}>
              Meet the editorial team
            </Link>
          </div>
          <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "28px" }}>
            <h2 data-reveal="" style={{ fontSize: "18px", fontWeight: "700", marginBottom: "18px" }}>
              {accentTail("Editorial transparency", 1)}
            </h2>
            <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
              {[
                "Ranked positions are never for sale.",
                "Sponsored placements are always labelled and sit outside the list.",
                "Corrections are noted on the page with the date they were made.",
              ].map((line) => (
                <li key={line} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "16px" }}>
              <ArrowLink href={routes.advertisingDisclosure()} style={{ fontSize: "14px", fontWeight: "600" }}>
                Advertising disclosure
              </ArrowLink>
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <section id="guides" aria-labelledby="guides-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Kicker>Homeowner resources</Kicker>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
              <h2 data-reveal="" id="guides-h2" style={SECTION_H2}>
                {accentTail(`${category.serviceName} guides & advice`, 2)}
              </h2>
              <ArrowLink href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All guides
              </ArrowLink>
            </div>
            <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(300, "20px")}>
              {guides.map((guide) => (
                <li
                  key={guide.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "22px",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {guide.heroImage ? (
                    <span style={{ display: "block", height: "168px", background: "var(--surface-sunken)" }}>
                      <img
                        src={guide.heroImage}
                        alt=""
                        loading="lazy"
                        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </span>
                  ) : null}
                  <span style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "22px 24px 24px", flex: "1" }}>
                    <span style={{ ...LABEL, fontSize: "11px" }}>{category.name}</span>
                    <h3 style={{ fontSize: "19px", lineHeight: "1.3", fontWeight: "700" }}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                        {guide.title}
                      </Link>
                    </h3>
                    {guide.excerpt ? (
                      <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{guide.excerpt}</span>
                    ) : null}
                    <span style={{ marginTop: "auto", paddingTop: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {guide.author ? `${guide.author.name} · ` : ""}
                      {guide.readingMinutes} min read
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- related */}
      {relatedCategories.length > 0 ? (
        <section id="sibling-trades" aria-labelledby="related-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <h2 data-reveal="" id="related-h2" style={{ ...SECTION_H2, marginBottom: "32px" }}>
              {accentTail("Related home services", 1)}
            </h2>
            <ul data-stagger="" data-ag="" data-facts="" style={autoGrid(280, "16px")}>
              {relatedCategories.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "22px",
                    padding: "24px",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                  }}
                >
                  <Tile icon={icon(entry.iconKey)} size={46} iconSize={22} flex style={{ borderRadius: "13px" }} />
                  <span style={{ display: "block", paddingTop: "2px", minWidth: 0 }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", lineHeight: "1.3", marginBottom: "5px" }}>
                      <Link href={routes.category(entry.slug)} style={{ color: "var(--blue-900)" }}>
                        {entry.name}
                      </Link>
                    </h3>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{entry.tagline}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="faqs-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "80px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "56px", alignItems: "start" }}
        >
          <h2 data-reveal="" id="faqs-h2" style={SPLIT_H2}>
            {accentTail(`Common questions about hiring ${article} ${singular}`, 2)}
          </h2>
          <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqRow key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- for businesses */}
      <section id="biz" aria-labelledby="biz-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "center" }}
        >
          <div>
            <Kicker>For {category.name.toLowerCase()}</Kicker>
            <h2 data-reveal="" id="biz-h2" style={{ ...SPLIT_H2, marginBottom: "14px" }}>
              {accentTail(`Reach homeowners researching ${category.name.toLowerCase()}`, 2)}
            </h2>
            <p style={{ ...LEAD, maxWidth: "520px" }}>
              Claim your profile to keep your licence, hours, service area and photos current, or take a labelled
              featured slot. Neither buys a ranked position.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              data-btn=""
              href={routes.claim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "50px",
                padding: "0 26px",
                borderRadius: "14px",
                background: "var(--color-primary)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "var(--shadow-primary)",
              }}
            >
              Claim your profile
            </Link>
            <Link
              href={routes.forBusinesses()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "50px",
                padding: "0 24px",
                borderRadius: "14px",
                border: "1.5px solid var(--border-strong)",
                background: "var(--surface-card)",
                color: "var(--blue-900)",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              See business plans
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ final */}
      <FinalBand
        heading={accentTail(`Find the best ${category.name.toLowerCase()} near you`, 2)}
        service={category.serviceName}
      />
      </div>
    </SiteChrome>
  );
}
