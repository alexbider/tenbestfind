import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { InfoModal } from "@/components/site/InfoModal";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  CHIP,
  Crumbs,
  FaqItem,
  FinalSearchBand,
  GRID_BACKDROP,
  H2,
  LABEL,
  LEAD,
  RowLink,
  SHELL,
  SR_ONLY,
  TD,
  TH,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { money, monthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { serviceCopy, rankingCardTitle } from "@/lib/seo-copy";
import { breadcrumbSchema, serviceCrumbs } from "@/lib/breadcrumbs";

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

  const singular = category.singular.toLowerCase();
  const faqs = [
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


  const icon = (key: string | null | undefined): IconName => (key && hasIcon(key) ? (key as IconName) : "house");
  const article = /^[aeiou]/i.test(category.singular) ? "an" : "a";
  const latest = rankings[0];

  return (
    <SiteChrome active="services">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: copy.h1,
          description: copy.description,
          url: absoluteUrl(routes.category(category.slug)),
        }}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs.map((faq, index) => ({ id: String(index), ...faq }))} />

      {/* ------------------------------------------------------------- hero */}
      <section style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 64px" }}>
          <Crumbs items={crumbs} />
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "56px", alignItems: "start" }}>
            <div>
              <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "16px" }}>
                <span data-eyebrow-rule="" aria-hidden="true" />
                Home services
              </p>
              <h1
                data-hero-in="2"
                style={{
                  fontSize: "clamp(36px, 4.4vw, 54px)",
                  lineHeight: "1.07",
                  letterSpacing: "-0.04em",
                  fontWeight: "800",
                  textWrap: "balance",
                }}
              >
                {copy.h1}
              </h1>
              <p data-hero-in="3" style={{ ...LEAD, marginTop: "20px", fontSize: "18px", maxWidth: "600px", textWrap: "pretty" }}>
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
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-lg)",
                padding: "26px 26px 24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                Find top-rated {category.name.toLowerCase()} in your area
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
                    placeholder="City or postal code"
                    style={{
                      width: "100%",
                      border: "0",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      color: "var(--text-primary)",
                      background: "transparent",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    height: "54px",
                    padding: "0 24px",
                    border: "0",
                    borderRadius: "14px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Search
                </button>
              </form>
              </div>
              {category.subservices.length > 0 ? (
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px" }}>
                  {category.subservices.slice(0, 6).map((sub) => (
                    <li key={sub.id}>
                      <Link href={routes.subservice(category.slug, sub.slug)} style={{ ...CHIP, display: "inline-block" }}>
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- what */}
      <section id="what" aria-labelledby="what-h2" style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <h2 id="what-h2" style={{ ...H2, textWrap: "balance" }}>
            What does {article} {singular} do?
          </h2>
          <div>
            <p style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-secondary)" }}>
              {category.description ??
                `${category.serviceName} covers the work most households need at some point, from routine maintenance to the jobs that cannot wait. What a licence actually permits varies by state or province, which is why every ranking opens with the local rules before it lists a single company.`}
            </p>
            {category.subservices.length > 0 ? (
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "22px" }}>
                {category.subservices.map((sub) => (
                  <li key={sub.id}>
                    <Link href={routes.subservice(category.slug, sub.slug)} style={{ ...CHIP, display: "inline-block" }}>
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
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Explore services
            </p>
            <h2 id="services-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700", marginBottom: "32px" }}>
              Popular {category.serviceName.toLowerCase()} services
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {category.subservices.map((sub) => (
                <li
                  key={sub.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "46px",
                      height: "46px",
                      borderRadius: "13px",
                      background: "var(--blue-50)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={icon(sub.iconKey ?? category.iconKey)} size={22} strokeWidth={1.75} />
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.3" }}>{sub.name}</h3>
                  {sub.description ? (
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{sub.description}</p>
                  ) : null}
                  <Link
                    href={routes.subservice(category.slug, sub.slug)}
                    style={{ marginTop: "auto", paddingTop: "10px", fontSize: "15px", fontWeight: "600" }}
                  >
                    About {sub.name.toLowerCase()} →
                  </Link>
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
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "12px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Popular locations
            </p>
              <h2 id="cities-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" }}>
                Find the best {category.name.toLowerCase()} by city
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All rankings →
              </Link>
            </div>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "28px" }}>
              Each list is researched for that market, with the criteria and the review date on the page.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {rankings.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "24px",
                  }}
                >
                  <h3 style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700", marginBottom: "8px" }}>
                    <Link href={rankingUrl(entry)} style={{ color: "var(--blue-900)" }}>
                      {rankingCardTitle(entry)}
                    </Link>
                  </h3>
                  {entry.summary ? (
                    <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      {entry.summary}
                    </p>
                  ) : null}
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Reviewed {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- states */}
      {regions.length > 0 ? (
        <section id="states" aria-labelledby="states-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "28px" }}>
              <h2 id="states-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" }}>
                Browse {category.name.toLowerCase()} by {regions[0].country.regionLabel ?? "state"}
              </h2>
              <Link href={routes.locationsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Every location →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {regions.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "var(--shadow-xs)",
                    padding: "22px 24px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "10px" }}>
                    <Link href={routes.region(entry.country.code, entry.slug)} style={{ color: "var(--blue-900)" }}>
                      {entry.name}
                    </Link>
                  </h3>
                  <ul style={{ display: "grid", gap: "4px" }}>
                    {entry.cities.slice(0, 5).map((city) => (
                      <li key={city.id}>
                        <Link
                          href={routes.ranking(entry.country.code, entry.slug, city.slug, category.slug)}
                          style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}
                        >
                          {city.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ul style={{ padding: "4px 0 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
                {regions
                  .flatMap((entry) =>
                    entry.cities.map((city) => ({
                      key: city.id,
                      name: `${city.name}, ${entry.code.toUpperCase()}`,
                      href: routes.ranking(entry.country.code, entry.slug, city.slug, category.slug),
                    })),
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item) => (
                    <RowLink key={item.key} href={item.href} tight>
                      {item.name}
                    </RowLink>
                  ))}
              </ul>
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
              <h2 id="costs-h2" style={{ ...H2, marginBottom: "16px", textWrap: "balance" }}>
                How much does {article} {singular} cost?
              </h2>
              <p style={{ ...LEAD, lineHeight: "1.8" }}>
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
                      <td style={{ ...TD, padding: "16px 26px", fontWeight: "600", color: "var(--blue-900)" }}>{row.label}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>
                        {row.lowPrice && row.highPrice
                          ? `${money(row.lowPrice, row.currency)} – ${money(row.highPrice, row.currency)}`
                          : row.typical
                            ? money(row.typical, row.currency)
                            : "On request"}
                      </td>
                      <td style={{ ...TD, padding: "16px 26px", color: "var(--text-secondary)" }}>{row.note}</td>
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
            <div>
              <h2 id="choose-h2" style={{ ...H2, marginBottom: "16px", textWrap: "balance" }}>
                How to choose a reliable {singular}
              </h2>
              <p style={LEAD}>
                The same handful of checks separates a company worth calling from one worth avoiding, whatever the
                trade.
              </p>
            </div>
            <ol style={{ display: "grid", gap: "16px" }}>
              {CHOOSE_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  style={{
                    display: "flex",
                    gap: "16px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "20px 22px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 34px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "var(--blue-50)",
                      color: "var(--blue-800)",
                      fontSize: "14px",
                      fontWeight: "700",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ display: "block", minWidth: 0 }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>{step.title}</h3>
                    <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{step.body}</p>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ local */}
      <section id="local" aria-labelledby="local-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <h2 id="local-h2" style={{ ...H2, textWrap: "balance" }}>
            {category.serviceName} requirements can vary by location
          </h2>
          <div>
            <p style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-secondary)", marginBottom: "16px" }}>
              What a licence covers, who pulls the permit and what insurance is required are all set locally. A company
              that is properly credentialled in one state may not be in the next one over.
            </p>
            <p style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-secondary)" }}>
              Every ranking opens with the rules that apply in that market, so the list that follows can be read against
              them rather than in the abstract.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ methodology */}
      <section id="methodology" aria-labelledby="method-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div style={{ ...SHELL, padding: "80px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "16px" }}>
            <h2 id="method-h2" style={{ ...H2, color: "#fff" }}>
              How we evaluate {category.serviceName.toLowerCase()} companies
            </h2>
            <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              Full methodology →
            </Link>
          </div>
          <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)", maxWidth: "760px", marginBottom: "40px" }}>
            The steps are the same for every trade. The criteria are not, because a good mover and a good electrician
            are not measured the same way.
          </p>
          {criteria.length > 0 ? (
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              {criteria.map((criterion) => (
                <li
                  key={criterion.id}
                  style={{
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
            <h2 id="authors-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px" }}>
              About our {category.serviceName.toLowerCase()} research
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
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px" }}>Editorial transparency</h2>
            <ul style={{ display: "grid", gap: "10px" }}>
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
              <Link href={routes.advertisingDisclosure()} style={{ fontSize: "14px", fontWeight: "600" }}>
                Advertising disclosure →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <section id="guides" aria-labelledby="guides-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Homeowner resources
            </p>
              <h2 id="guides-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" }}>
                {category.serviceName} guides &amp; advice
              </h2>
              <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All guides →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {guides.map((guide) => (
                <li
                  key={guide.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    padding: "24px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <p style={{ ...LABEL, fontSize: "11px", marginBottom: "8px" }}>{category.name}</p>
                  <h3 style={{ fontSize: "18px", lineHeight: "1.35", fontWeight: "700", marginBottom: "10px" }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  {guide.excerpt ? (
                    <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      {guide.excerpt}
                    </p>
                  ) : null}
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    {guide.author ? `${guide.author.name} · ` : ""}
                    {guide.readingMinutes} min read
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- related */}
      {relatedCategories.length > 0 ? (
        <section id="related" aria-labelledby="related-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <h2 id="related-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700", marginBottom: "32px" }}>
              Related home services
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {relatedCategories.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    padding: "22px 24px",
                    boxShadow: "var(--shadow-xs)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 42px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "var(--blue-50)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={icon(entry.iconKey)} size={20} strokeWidth={1.75} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>
                      <Link href={routes.category(entry.slug)} style={{ color: "var(--blue-900)" }}>
                        {entry.name}
                      </Link>
                    </h3>
                    <p style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{entry.tagline}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="faqs-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "80px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "56px", alignItems: "start" }}
        >
          <h2 id="faqs-h2" style={{ ...H2, textWrap: "balance" }}>
            Common questions about hiring {article} {singular}
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- for businesses */}
      <section aria-labelledby="biz-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "center" }}
        >
          <div>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              For {category.name.toLowerCase()}
            </p>
            <h2 id="biz-h2" style={{ ...H2, marginBottom: "14px", textWrap: "balance" }}>
              Reach homeowners researching {category.name.toLowerCase()}
            </h2>
            <p style={LEAD}>
              Claim your profile to keep your licence, hours, service area and photos current, or take a labelled
              featured slot. Neither buys a ranked position.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href={routes.claim()} style={BTN_PRIMARY}>
              Claim your profile
            </Link>
            <Link href={routes.forBusinesses()} style={BTN_GHOST}>
              See business plans
            </Link>
          </div>
        </div>
      </section>

      <FinalSearchBand
        heading={`Find the best ${category.name.toLowerCase()} near you`}
        service={category.serviceName}
      />
    </SiteChrome>
  );
}
