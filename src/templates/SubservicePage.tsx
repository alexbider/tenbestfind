import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/site/blocks";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  Crumbs,
  Eyebrow,
  FaqItem,
  GRID_BACKDROP,
  LEAD,
  RowLink,
  SHELL,
  SR_ONLY,
  FinalSearchBand,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { faqsFor } from "@/lib/faqs";
import { parseHubBody } from "@/lib/hub-body";
import { parseSubserviceDetail, priceScale, toneColor } from "@/lib/subservice-detail";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { subserviceCopy, rankingCardTitle, tradesPhrase } from "@/lib/seo-copy";
import { breadcrumbSchema, subserviceCrumbs } from "@/lib/breadcrumbs";
import { graph, pageEntity, serviceEntity, serviceId } from "@/lib/schema";

/**
 * One job inside a trade: hardwood flooring, AC repair, chimney sweeping.
 *
 * Seventy-seven of these. They are the pages furthest from the data, because
 * a shortlist belongs to a city and a profile belongs to a company, and a job
 * has neither: it has what the work is, what it costs and how it goes wrong.
 * The previous pass gave them the site's shapes and they stopped reading as
 * stubs, but every section still described the trade rather than the job.
 *
 * So four of the sections here come out of a stored `detail` and appear only
 * when somebody has written one: the two options a buyer chooses between, the
 * prices, the claim worth making, and the failure points. None of them can be
 * generated from a name, and a generated price would be a lie, so a page with
 * nothing written renders without them rather than with something invented.
 *
 * Everything else is drawn from the database and is true of any job: who does
 * it, where it is covered, what to check before booking, and the rest of the
 * trade beside it.
 */

/** What separates a company that really does this work from one that lists it. */
const CHECKS: { title: string; body: string }[] = [
  {
    title: "In-house or subcontracted",
    body: "Ask whether the crew doing this specific work is on their payroll. Plenty of companies list a service and hand it straight to somebody else, which is not wrong, but it changes who is answerable when something goes back.",
  },
  {
    title: "The licence for the parent trade",
    body: "Look the number up with the authority that issues it rather than reading the certificate they send you. What a licence covers, and whether one is needed at all, changes by state and province.",
  },
  {
    title: "Insurance, confirmed with the insurer",
    body: "A current certificate sent to you by the insurer, not a photocopy from the company. Ask for liability and, where crews are on site, workers' compensation.",
  },
  {
    title: "What the quote leaves out",
    body: "Removal, disposal, subfloor or substrate work, permits and making good afterwards are where two quotes on the same job separate. Ask for the exclusions in writing next to the inclusions.",
  },
  {
    title: "Two warranties, not one",
    body: "The manufacturer covers the material and the company covers the workmanship. Get the second in writing, with its length, and ask whether it transfers if you sell.",
  },
  {
    title: "How a change is priced",
    body: "Agree before the deposit how anything found on the way is priced and approved. The moment to settle that is while you are still choosing between companies, not on the day somebody lifts a floorboard.",
  },
];

/* --------------------------------------------------------------- the pieces */

const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
};

const HAIR = "1px solid var(--border-subtle)";

const MICRO = {
  fontSize: "10.5px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
};

/**
 * The heading, with its last two words on their own line.
 *
 * The h1 is "Hardwood flooring near you" and the design breaks it after the
 * name and colours the tail. Done with a block span rather than the design's
 * `<br>`, because a break tag between the two halves would leave the heading
 * reading "Hardwood flooringnear you" to a screen reader and to anything else
 * that takes the text rather than the picture. The space before the span is
 * the one that keeps it a sentence; it collapses on screen.
 */
function SplitHeading({ text, id }: { text: string; id: string }) {
  const tail = " near you";
  const head = text.endsWith(tail) ? text.slice(0, -tail.length) : null;

  return (
    <h1
      id={id}
      data-hero-in="2"
      data-h1=""
      style={{
        fontSize: "clamp(38px, 5.2vw, 68px)",
        lineHeight: "0.99",
        letterSpacing: "-0.045em",
        fontWeight: "800",
        textWrap: "balance",
      }}
    >
      {head === null ? (
        text
      ) : (
        <>
          {head}{" "}
          <span style={{ display: "block", color: "var(--color-primary)" }}>near you</span>
        </>
      )}
    </h1>
  );
}

/* ----------------------------------------------------------------- the page */

export async function SubservicePage({
  categorySlug,
  subserviceSlug,
}: {
  categorySlug: string;
  subserviceSlug: string;
}) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    include: { subservices: { orderBy: { sortOrder: "asc" } } },
  });
  if (!category || !category.published) {
    await redirectIfKnown(routes.subservice(categorySlug, subserviceSlug));
    notFound();
  }

  const subservice = category.subservices.find((item) => item.slug === subserviceSlug);
  if (!subservice) {
    await redirectIfKnown(routes.subservice(categorySlug, subserviceSlug));
    notFound();
  }

  const [rankings, businesses, guides] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.business.findMany({
      where: { status: "PUBLISHED", services: { some: { subserviceId: subservice.id } } },
      include: { city: { include: { region: { include: { country: true } } } } },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { author: { select: { name: true } } },
    }),
  ]);

  // businesses is capped at six for the grid, so the gate counts separately.
  const offering = await db.businessService.count({ where: { subserviceId: subservice.id } });
  const copy = subserviceCopy(subservice, category, {
    businesses: offering,
    publishedRankings: rankings.length,
  });
  const crumbs = subserviceCrumbs(category, subservice);
  const body = parseHubBody(subservice.body);
  const detail = parseSubserviceDetail(subservice.detail);
  const trade = tradesPhrase(category);
  const term = (subservice.searchTerm?.trim() || subservice.name).toLowerCase();
  const siblings = category.subservices.filter((item) => item.id !== subservice.id);
  const tradeName = category.serviceName.toLowerCase();

  const cities = [
    ...new Set(
      rankings
        .map((ranking) => (ranking.city ? `${ranking.city.name}, ${ranking.city.region.name}` : null))
        .filter((place): place is string => Boolean(place)),
    ),
  ];

  const icon = (key: string | null | undefined): IconName =>
    key && hasIcon(key) ? (key as IconName) : hasIcon(category.iconKey) ? (category.iconKey as IconName) : "wrench";

  // The page's own numbers. Always four, because a strip that changes shape
  // from one page to the next reads as something broken, and the two that can
  // come back empty say so in words rather than printing a nought.
  const facts: { label: string; value: string; href?: string }[] = [
    { label: "Part of", value: category.serviceName, href: routes.category(category.slug) },
    {
      label: offering === 1 ? "Company offers it" : "Companies offer it",
      value: offering > 0 ? String(offering) : "None recorded yet",
    },
    {
      label: cities.length === 1 ? "City covered" : "Cities covered",
      value: cities.length > 0 ? String(cities.length) : "No shortlist yet",
    },
    { label: "Last checked", value: monthYear(subservice.updatedAt) },
  ];

  const glance = [
    { label: "The trade", value: category.serviceName },
    // tradesPhrase is built to sit mid-sentence, so it arrives lowercase.
    // This is a value in a list, where it starts one.
    { label: "Who does it", value: trade.charAt(0).toUpperCase() + trade.slice(1) },
    {
      label: "Where we cover it",
      value:
        cities.length > 0
          ? `${cities.slice(0, 2).join(" and ")}${cities.length > 2 ? ` and ${cities.length - 2} more` : ""}`
          : "No market shortlisted yet",
    },
    { label: "Related services", value: siblings.length > 0 ? `${siblings.length} in this trade` : "None listed" },
  ];

  const generatedFaqs = [
    {
      question: `Who handles ${term}?`,
      answer: `${subservice.name} is handled by ${trade}. Not every company in the trade takes this work on, so each ranking lists the services a company genuinely performs rather than everything it advertises.`,
    },
    {
      question: `What should I ask before booking ${term}?`,
      answer:
        "Ask what the quote includes and excludes, who is doing the work, whether a permit is needed and who is pulling it, and what the workmanship warranty covers. Get the answers in writing before anyone starts.",
    },
    {
      question: "How do I compare quotes for this?",
      answer:
        "Put them on one sheet line by line. Differences in price almost always turn out to be differences in scope, material grade or warranty length rather than margin.",
    },
    {
      question: `Is ${term} priced separately from the rest of the job?`,
      answer:
        "Usually it is a line inside a larger quote rather than its own invoice, which is exactly why the exclusions matter. Ask for it itemised so you can compare that line between companies instead of comparing two totals.",
    },
  ];

  const faqs = await faqsFor(
    "SUBSERVICE",
    subservice.id,
    generatedFaqs.map((faq, index) => ({ id: String(index), ...faq })),
  );

  const scale = detail.prices ? priceScale(detail.prices) : null;

  return (
    <SiteChrome active="services">
      <div className="sub-2026">
        {/* The page is a collection of companies that do this work. The Service
            beside it names the work itself, which is what a question about the
            trade is actually asking about. */}
        <JsonLd
          data={graph(
            pageEntity({
              path: routes.subservice(category.slug, subservice.slug),
              name: copy.h1,
              description: copy.description,
              type: "CollectionPage",
              dateModified: subservice.updatedAt,
              mainEntity: { "@id": serviceId(routes.subservice(category.slug, subservice.slug)) },
            }),
            serviceEntity({
              path: routes.subservice(category.slug, subservice.slug),
              name: subservice.name,
              serviceType: subservice.name,
              description: subservice.description,
              areaServed: cities,
            }),
          )}
        />
        <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
        <FaqJsonLd faqs={faqs} />

        {/* ----------------------------------------------------------- hero */}
        <section aria-labelledby="hero-h1" style={GRID_BACKDROP}>
          <span
            aria-hidden="true"
            data-glow=""
            style={{
              position: "absolute",
              right: "-180px",
              top: "-220px",
              width: "620px",
              height: "620px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, rgba(45,116,215,0.10), rgba(45,116,215,0) 62%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ ...SHELL, position: "relative", padding: "18px 24px 58px" }}>
            <Crumbs items={crumbs} />
            <div
              data-hero=""
              style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.08fr) minmax(0, 0.92fr)", gap: "60px", alignItems: "end" }}
            >
              <div>
                <Eyebrow heroIn="1" gap="18px">
                  <Link href={routes.category(category.slug)} style={{ color: "inherit" }}>
                    {category.serviceName}
                  </Link>
                </Eyebrow>
                <SplitHeading id="hero-h1" text={copy.h1} />
                <p
                  data-hero-in="3"
                  style={{ ...LEAD, marginTop: "22px", fontSize: "20px", lineHeight: "1.6", maxWidth: "34ch", textWrap: "pretty" }}
                >
                  {subservice.description ??
                    `Who takes this work on, what separates a company worth calling from one that merely lists it, and where we have published a researched shortlist.`}
                </p>
                <div
                  data-hero-in="4"
                  data-byline=""
                  style={{ marginTop: "26px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "13.5px", color: "var(--text-secondary)" }}
                >
                  <span>
                    Prepared by the{" "}
                    <Link href={routes.editorialTeam()} style={{ fontWeight: "600" }}>
                      TenBestFind Editorial Team
                    </Link>
                  </span>
                  {/* Separates two things on one line. On a phone they are two
                      lines, and it is left stranded at the end of the first. */}
                  <span aria-hidden="true" data-byline-dot="">
                    ·
                  </span>
                  <span>Updated {monthYear(subservice.updatedAt)}</span>
                </div>
              </div>

              <div data-hero-in="3" data-hero-card="" style={{ ...CARD, borderRadius: "22px", boxShadow: "var(--shadow-xl)", padding: "26px 26px 22px" }}>
                <h2 style={{ fontSize: "21px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                  Find {term} in your area
                </h2>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "18px" }}>
                  Enter your city or postal code and we will take you to the {tradeName} ranking for that market.
                </p>
                <form
                  action={routes.search()}
                  method="get"
                  role="search"
                  aria-label={`Find ${term} by location`}
                  data-stack=""
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <input type="hidden" name="service" value={subservice.name} />
                  <div
                    style={{
                      flex: "1",
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      height: "54px",
                      padding: "0 14px",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "14px",
                      background: "var(--surface-card)",
                    }}
                  >
                    <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--text-muted)", flexShrink: 0 }}>
                      <Icon name="pin" size={19} strokeWidth={2} />
                    </span>
                    <label htmlFor="sub-where" style={SR_ONLY}>
                      City or postal code
                    </label>
                    <input
                      id="sub-where"
                      name="location"
                      placeholder="City or postal code"
                      autoComplete="postal-code"
                      style={{ width: "100%", minWidth: 0, border: 0, outline: "none", height: "50px", fontSize: "16px", background: "transparent" }}
                    />
                  </div>
                  <button type="submit" style={{ ...BTN_PRIMARY, height: "54px", padding: "0 28px", borderRadius: "14px" }}>
                    Search
                  </button>
                </form>
                {siblings.length > 0 ? (
                  <ul
                    style={{ marginTop: "18px", paddingTop: "16px", borderTop: HAIR, display: "flex", flexWrap: "wrap", gap: "8px", listStyle: "none" }}
                  >
                    <li style={{ ...MICRO, alignSelf: "center", letterSpacing: "0.1em", fontSize: "11px", marginRight: "4px" }}>
                      Same trade
                    </li>
                    {siblings.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link className="chip" href={routes.subservice(category.slug, item.slug)}>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          {/* The page's own facts, full width under the hero, in the one place
              a reader looks for scale. The two that can come back empty say so
              in words rather than printing a nought. */}
          <div style={{ borderTop: HAIR, background: "var(--surface-card)" }}>
            <ul
              data-strip=""
              style={{ ...SHELL, padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", listStyle: "none" }}
            >
              {facts.map((fact) => (
                <li key={fact.label} style={{ padding: "22px 26px", borderLeft: HAIR }}>
                  <p style={{ ...MICRO, marginBottom: "7px" }}>{fact.label}</p>
                  <p style={{ fontSize: "17px", fontWeight: "700", color: "var(--blue-900)", letterSpacing: "-0.02em" }}>
                    {fact.href ? <Link href={fact.href}>{fact.value}</Link> : fact.value}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- the work */}
        <section id="involves" aria-labelledby="involves-h2" data-pad="" style={{ padding: "84px 0 0" }}>
          <div style={{ ...SHELL, padding: "0 24px" }}>
            <div
              data-editorial=""
              style={{ display: "grid", gridTemplateColumns: "210px minmax(0, 1fr) 300px", gap: "56px", alignItems: "start" }}
            >
              <div data-rail-col="" style={{ position: "sticky", top: "130px" }}>
                <Eyebrow gap="16px">The work</Eyebrow>
                <h2 id="involves-h2" style={{ fontSize: "30px", lineHeight: "1.12", fontWeight: "800" }}>
                  What {term} actually involves
                </h2>
              </div>

              <div data-prose="">
                {/* Three ways to fill this column, in order of how much anybody
                    wrote. A detail written for this job wins, then a body,
                    then the lines that are true of any job in any trade. */}
                {detail.involves?.heading ? (
                  <h3 style={{ fontSize: "23px", fontWeight: "700", letterSpacing: "-0.025em", marginBottom: "14px" }}>
                    {detail.involves.heading}
                  </h3>
                ) : null}

                {detail.involves?.paragraphs?.length ? (
                  <div style={{ display: "grid", gap: "16px" }}>
                    {detail.involves.paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-primary)", maxWidth: "66ch", textWrap: "pretty" }}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : body.length > 0 ? (
                  <div className="prose">
                    <GuideBody blocks={body} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <p style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-primary)", maxWidth: "66ch", textWrap: "pretty" }}>
                      {subservice.description ??
                        `${subservice.name} sits inside the ${tradeName} trade, so the licensing, insurance and permit rules that apply to it are the trade's rules rather than its own.`}
                    </p>
                    <p style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-primary)", maxWidth: "66ch", textWrap: "pretty" }}>
                      That is the part worth knowing before you call anybody: a company can list this work without doing it
                      itself, and the quote you are handed will often fold it into a larger job. Both are ordinary. Both
                      change what you should be asking.
                    </p>
                    <p style={{ fontSize: "18px", lineHeight: "1.75", color: "var(--text-primary)", maxWidth: "66ch", textWrap: "pretty" }}>
                      The shortlists below are built from the {tradeName} research for each market, and every profile
                      records the services a company genuinely performs rather than everything it advertises.
                    </p>
                  </div>
                )}

                {detail.involves?.options?.length ? (
                  <div data-two="" style={{ marginTop: "30px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                    {detail.involves.options.map((option) => (
                      <div key={option.name} data-card="" style={{ ...CARD, overflow: "hidden" }}>
                        <div style={{ padding: "18px 20px", borderBottom: HAIR, background: "var(--surface-page)" }}>
                          <h4 style={{ fontSize: "17px", fontWeight: "700" }}>{option.name}</h4>
                          {option.note ? (
                            // Leading set here rather than inherited. This is a
                            // caption under a title, and the page's prose
                            // line-height puts most of a blank line under it.
                            <p style={{ marginTop: "4px", fontSize: "13.5px", lineHeight: "1.3", color: "var(--text-secondary)" }}>
                              {option.note}
                            </p>
                          ) : null}
                        </div>
                        <ul data-cmp="" style={{ padding: "6px 22px 16px", listStyle: "none" }}>
                          {option.rows.map((row) => (
                            <li
                              key={row.label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                padding: "11px 0",
                                borderBottom: HAIR,
                                fontSize: "14.5px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <span>{row.label}</span>
                              <span style={{ fontWeight: "700", color: toneColor(row.tone), textAlign: "right" }}>{row.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detail.involves?.footnote ? (
                  <p style={{ marginTop: "14px", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", maxWidth: "66ch" }}>
                    {detail.involves.footnote}
                  </p>
                ) : null}
                {/* No link out of this column. The trade is already one tap
                    away from the eyebrow, the breadcrumb and the heading of
                    the same-trade section, and a fourth was the one thing
                    here the design does not have. */}
              </div>

              <aside data-glance="" style={{ position: "sticky", top: "130px", border: HAIR, borderRadius: "18px", background: "var(--paper)", padding: "22px 22px 6px" }}>
                <p style={{ ...MICRO, color: "var(--gold)", fontSize: "11px", marginBottom: "14px" }}>At a glance</p>
                <dl style={{ margin: 0 }}>
                  {glance.map((row) => (
                    <div key={row.label} style={{ padding: "12px 0", borderTop: HAIR }}>
                      <dt style={{ ...MICRO, letterSpacing: "0.1em", marginBottom: "5px" }}>{row.label}</dt>
                      <dd style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "var(--blue-900)", lineHeight: "1.45" }}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ what it costs */}
        {detail.prices && scale ? (
          <section id="cost" aria-labelledby="cost-h2" data-pad="" style={{ padding: "76px 0" }}>
            <div style={{ ...SHELL, padding: "0 24px" }}>
              <div style={{ border: HAIR, borderRadius: "26px", background: "var(--paper)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div data-two="" data-cost="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 0.75fr)" }}>
                  <div data-cost-main="" style={{ padding: "36px 38px", borderRight: HAIR }}>
                    {detail.prices.eyebrow ? <Eyebrow gap="14px">{detail.prices.eyebrow}</Eyebrow> : null}
                    <h2 id="cost-h2" style={{ fontSize: "clamp(26px, 2.6vw, 34px)", lineHeight: "1.14", fontWeight: "800", marginBottom: "8px" }}>
                      {detail.prices.heading ?? `What ${term} costs`}
                    </h2>
                    {detail.prices.lead ? (
                      <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--text-secondary)", maxWidth: "52ch" }}>
                        {detail.prices.lead}
                      </p>
                    ) : null}

                    <div style={{ marginTop: "28px", background: "var(--surface-card)", border: HAIR, borderRadius: "18px", padding: "24px 26px 18px" }}>
                      {detail.prices.unit ? <p style={{ ...MICRO, marginBottom: "20px" }}>{detail.prices.unit}</p> : null}
                      <div style={{ position: "relative" }}>
                        {/* The gridlines sit behind the bars at the same four
                            divisions the axis is labelled with, so a bar can be
                            read against a number without a legend. */}
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: "repeating-linear-gradient(90deg, var(--border-subtle) 0 1px, transparent 1px 25%)",
                            pointerEvents: "none",
                          }}
                        />
                        <ul style={{ position: "relative", display: "grid", gap: "24px", listStyle: "none", margin: 0, padding: 0 }}>
                          {scale.bars.map((bar) => (
                            <li key={bar.name}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", marginBottom: "10px" }}>
                                <span style={{ fontSize: "15.5px", fontWeight: "700", color: "var(--blue-900)" }}>{bar.name}</span>
                                <span
                                  style={{
                                    fontSize: "17px",
                                    fontWeight: "800",
                                    color: toneColor(bar.tone),
                                    letterSpacing: "-0.02em",
                                    fontVariantNumeric: "tabular-nums",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {bar.range}
                                </span>
                              </div>
                              <div style={{ position: "relative", height: "14px", borderRadius: "999px", background: "rgba(16,31,61,0.06)" }}>
                                <span
                                  data-bar=""
                                  aria-hidden="true"
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    left: bar.left,
                                    width: bar.width,
                                    borderRadius: "999px",
                                    background: bar.fill,
                                  }}
                                />
                              </div>
                              {bar.note ? (
                                <p style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.5", color: "var(--text-secondary)" }}>{bar.note}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div
                        data-ticks=""
                        aria-hidden="true"
                        style={{
                          position: "relative",
                          height: "30px",
                          marginTop: "14px",
                          borderTop: HAIR,
                          fontSize: "11.5px",
                          fontWeight: "600",
                          color: "var(--text-secondary)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {scale.ticks.map((tick, index) => (
                          <span key={tick} style={{ left: `${index * 25}%`, top: "10px" }}>
                            {tick}
                          </span>
                        ))}
                      </div>
                    </div>

                    {detail.prices.footnote ? (
                      <p style={{ marginTop: "18px", fontSize: "14.5px", lineHeight: "1.65", color: "var(--text-secondary)", maxWidth: "62ch" }}>
                        {detail.prices.footnote}
                      </p>
                    ) : null}
                  </div>

                  {detail.prices.aside ? (
                    <div style={{ padding: "36px 34px", background: "var(--gold-soft)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          background: "var(--gold)",
                          color: "#fff",
                          boxShadow: "0 6px 18px rgba(138,95,11,0.28)",
                          marginBottom: "20px",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="dollar" size={26} strokeWidth={1.9} />
                      </span>
                      {detail.prices.aside.label ? (
                        <p style={{ ...MICRO, color: "var(--gold)", fontSize: "11px", marginBottom: "10px" }}>{detail.prices.aside.label}</p>
                      ) : null}
                      <h3 style={{ fontSize: "24px", lineHeight: "1.2", color: "var(--gold)", letterSpacing: "-0.03em", marginBottom: "14px" }}>
                        {detail.prices.aside.heading}
                      </h3>
                      <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#7A5409" }}>{detail.prices.aside.body}</p>
                      {detail.prices.aside.footnote ? (
                        <p style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #F0DDB4", fontSize: "15px", lineHeight: "1.65", color: "#7A5409" }}>
                          {detail.prices.aside.footnote}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------------- the claim */}
        {detail.claim ? (
          <section id="claim" aria-labelledby="claim-h2" style={{ borderTop: HAIR, borderBottom: HAIR, background: "var(--paper)" }}>
            <div data-pad="" style={{ ...SHELL, padding: "72px 24px" }}>
              <div data-two="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)", gap: "56px", alignItems: "start" }}>
                <div>
                  {detail.claim.eyebrow ? <Eyebrow gap="18px">{detail.claim.eyebrow}</Eyebrow> : null}
                  <h2 id="claim-h2" data-quote="" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.1", fontWeight: "800", textWrap: "balance" }}>
                    {detail.claim.heading}
                  </h2>
                  {detail.claim.lead ? (
                    <p style={{ marginTop: "22px", fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", maxWidth: "46ch" }}>
                      {detail.claim.lead}
                    </p>
                  ) : null}
                </div>
                {detail.claim.notes.length > 0 ? (
                  <div style={{ display: "grid", gap: "16px" }}>
                    {detail.claim.notes.map((note, index) => (
                      <div
                        key={index}
                        style={{
                          background: "var(--surface-card)",
                          border: HAIR,
                          // The first note is the claim and the second is what
                          // qualifies it, so they are not the same colour.
                          borderLeft: `3px solid ${index === 0 ? "var(--color-primary)" : "var(--gold-ink)"}`,
                          borderRadius: "16px",
                          padding: "24px 26px",
                        }}
                      >
                        <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>{note}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------- failure points */}
        {detail.pitfalls?.length ? (
          <section id="wrong" aria-labelledby="wrong-h2">
            <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "30px" }}>
                <div>
                  <Eyebrow gap="16px">Failure points</Eyebrow>
                  <h2 id="wrong-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.12", fontWeight: "800" }}>
                    {detail.pitfalls.length === 1 ? "One thing that goes wrong" : `${countWord(detail.pitfalls.length)} things that go wrong`}
                  </h2>
                </div>
                <Link href={routes.category(category.slug)} style={{ fontSize: "15px", fontWeight: "600" }}>
                  All {trade.toLowerCase()} research →
                </Link>
              </div>
              <ol style={{ display: "grid", gap: "16px", listStyle: "none", margin: 0, padding: 0 }}>
                {detail.pitfalls.map((pitfall, index) => (
                  <li
                    key={pitfall.title}
                    data-pit=""
                    data-card=""
                    style={{
                      ...CARD,
                      display: "grid",
                      gridTemplateColumns: "86px minmax(0, 0.82fr) minmax(0, 1.18fr)",
                      gap: "32px",
                      alignItems: "start",
                      borderRadius: "22px",
                      padding: "32px 34px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        fontSize: "56px",
                        fontWeight: "800",
                        lineHeight: "0.82",
                        letterSpacing: "-0.05em",
                        color: "var(--gold-ink)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 style={{ fontSize: "23px", fontWeight: "700", letterSpacing: "-0.028em", lineHeight: "1.16", marginBottom: "14px" }}>
                        {pitfall.title}
                      </h3>
                      {pitfall.ask ? (
                        <p style={{ display: "flex", gap: "10px", fontSize: "14.5px", lineHeight: "1.55", color: "var(--color-primary)", fontWeight: "600" }}>
                          <span aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px", display: "inline-flex" }}>
                            <Icon name="chat" size={16} strokeWidth={2} />
                          </span>
                          {/* Quoted, because it is a thing to say rather than
                              a thing to know, and the quotes are what make
                              that read at a glance. Added here rather than
                              stored, so every author gets them. */}
                          <span>
                            <span style={SR_ONLY}>Ask: </span>
                            {`“${pitfall.ask}”`}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <p style={{ fontSize: "16.5px", lineHeight: "1.74", color: "var(--text-secondary)", paddingLeft: "32px", borderLeft: HAIR }}>
                      {pitfall.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------------- the checks */}
        <section id="checks" aria-labelledby="checks-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
          <div data-pad="" style={{ ...SHELL, padding: "84px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "14px" }}>
              <h2 id="checks-h2" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: "1.1", fontWeight: "800", color: "#fff", textWrap: "balance" }}>
                Before you book {term}
              </h2>
              <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "var(--gold-ink)" }}>
                How we rank →
              </Link>
            </div>
            <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-on-ink-soft)", maxWidth: "66ch", marginBottom: "42px" }}>
              Six checks, in the order they save you the most. None of them takes longer than a phone call, and the first
              one is the reason two quotes for the same job can be a thousand apart.
            </p>
            {/* Three across on a hairline grid, so six land as two even rows
                rather than a row of four and a stranded pair. The gap is the
                border: one pixel of the lighter colour showing between cells. */}
            <ol
              data-three=""
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1px",
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "22px",
                overflow: "hidden",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {CHECKS.map((check, index) => (
                <li key={check.title} data-check="" style={{ background: "#10213F", padding: "30px 30px 32px", display: "flex", flexDirection: "column" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      border: "1px solid rgba(231,184,99,0.45)",
                      background: "rgba(231,184,99,0.10)",
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--gold-ink)",
                      marginBottom: "20px",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <h3 data-check-h="" style={{ fontSize: "18px", fontWeight: "700", color: "#fff", lineHeight: "1.32", marginBottom: "10px", minHeight: "48px" }}>
                    {check.title}
                  </h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.68", color: "var(--text-on-ink-soft)" }}>{check.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- the rankings */}
        {rankings.length > 0 ? (
          <section id="rankings" aria-labelledby="rank-h2" style={{ borderBottom: HAIR }}>
            <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
              <Eyebrow gap="16px">Where we cover it</Eyebrow>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
                <h2 id="rank-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.12", fontWeight: "800", textWrap: "balance" }}>
                  {category.name} shortlists by city
                </h2>
                <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                  Every shortlist →
                </Link>
              </div>
              <p style={{ ...LEAD, maxWidth: "66ch", marginBottom: "28px" }}>
                A company offering {term} appears in the published list for its own market. Each one names the editor who
                built it and the date they last checked it.
              </p>
              <ul role="list" style={{ display: "grid", gap: "10px", listStyle: "none", padding: 0, margin: 0 }}>
                {rankings.map((ranking) => (
                  <RowLink key={ranking.id} href={rankingUrl(ranking)} outline compact>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block" }}>{rankingCardTitle(ranking)}</span>
                      {ranking.city ? (
                        <span style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {ranking.city.name}, {ranking.city.region.code.toUpperCase()} · Updated{" "}
                          {shortMonthYear(ranking.lastReviewedAt)}
                        </span>
                      ) : null}
                    </span>
                  </RowLink>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ the companies */}
        {businesses.length > 0 ? (
          <section id="companies" aria-labelledby="biz-h2" style={{ background: "var(--paper)", borderBottom: HAIR }}>
            <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
              <Eyebrow gap="16px">On the lists</Eyebrow>
              <h2 id="biz-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.12", fontWeight: "800", marginBottom: "12px", textWrap: "balance" }}>
                Companies that list {term}
              </h2>
              <p style={{ ...LEAD, maxWidth: "66ch", marginBottom: "28px" }}>
                Drawn from the profiles where this service is recorded, not from what a company advertises.
              </p>
              <ul data-three="" role="list" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
                {businesses.map((business) => (
                  <li key={business.id} data-card="" style={{ ...CARD, borderRadius: "20px", padding: "24px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.32", marginBottom: "4px" }}>
                      <Link href={routes.business(business.slug)} style={{ color: "var(--blue-900)" }}>
                        {business.name}
                      </Link>
                    </h3>
                    {business.city ? (
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                        {business.city.name}, {business.city.region.code.toUpperCase()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------------- the guides */}
        {guides.length > 0 ? (
          <section id="guides" aria-labelledby="guides-h2" style={{ borderBottom: HAIR }}>
            <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
              <Eyebrow gap="16px">Read first</Eyebrow>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
                <h2 id="guides-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.12", fontWeight: "800" }}>
                  {category.serviceName} guides
                </h2>
                <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                  All guides →
                </Link>
              </div>
              <ul data-three="" role="list" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
                {guides.map((guide) => (
                  <li key={guide.id} data-card="" style={{ ...CARD, borderRadius: "20px", padding: "24px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.32", marginBottom: "8px" }}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                        {guide.title}
                      </Link>
                    </h3>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      {guide.author?.name ? `${guide.author.name} · ` : ""}
                      {monthYear(guide.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------------- same trade */}
        {siblings.length > 0 ? (
          <section id="related" aria-labelledby="related-h2" style={{ background: "var(--paper)", borderBottom: HAIR }}>
            <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
              <Eyebrow gap="16px">Same trade</Eyebrow>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "28px" }}>
                <h2 id="related-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.12", fontWeight: "800", textWrap: "balance" }}>
                  Other {tradeName} services
                </h2>
                <Link href={routes.category(category.slug)} style={{ fontSize: "15px", fontWeight: "600" }}>
                  All of {tradeName} →
                </Link>
              </div>
              <ul data-three="" role="list" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "18px", alignItems: "stretch", listStyle: "none", padding: 0, margin: 0 }}>
                {siblings.map((item) => (
                  <li key={item.id} data-card="" style={{ ...CARD, borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <span data-tile="" aria-hidden="true">
                      <Icon name={icon(item.iconKey)} size={22} strokeWidth={1.7} />
                    </span>
                    <h3 style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.02em" }}>
                      <Link href={routes.subservice(category.slug, item.slug)} style={{ color: "var(--blue-900)" }}>
                        {item.name}
                      </Link>
                    </h3>
                    {item.description ? (
                      <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{item.description}</p>
                    ) : null}
                    <Link
                      href={routes.subservice(category.slug, item.slug)}
                      style={{ marginTop: "auto", paddingTop: "12px", fontSize: "14.5px", fontWeight: "600" }}
                    >
                      About {item.name.toLowerCase()} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------- the faqs */}
        <section id="faqs" aria-labelledby="faqs-h2">
          <div data-pad="" style={{ ...SHELL, padding: "76px 24px" }}>
            <div data-two="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.72fr) minmax(0, 1.28fr)", gap: "56px", alignItems: "start" }}>
              <div data-faq-head="" style={{ position: "sticky", top: "130px" }}>
                <h2 id="faqs-h2" style={{ fontSize: "clamp(27px, 3vw, 36px)", lineHeight: "1.14", fontWeight: "800", textWrap: "balance" }}>
                  Common questions about {term}
                </h2>
                <p style={{ marginTop: "16px" }}>
                  <Link href={routes.contact()} style={{ fontSize: "15px", fontWeight: "600" }}>
                    Ask us something else →
                  </Link>
                </p>
              </div>
              <ul data-faqs="" role="list" style={{ display: "grid", gap: "12px", listStyle: "none", padding: 0, margin: 0 }}>
                {faqs.map((faq) => (
                  <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- for the businesses */}
        <section id="business" aria-labelledby="cta-h2" style={{ background: "var(--paper)", borderTop: HAIR }}>
          <div data-pad="" style={{ ...SHELL, padding: "68px 24px" }}>
            <div
              data-two=""
              style={{
                ...CARD,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                gap: "44px",
                alignItems: "center",
                borderRadius: "24px",
                padding: "38px 40px",
              }}
            >
              <div>
                <Eyebrow gap="14px">For {tradeName}</Eyebrow>
                <h2 id="cta-h2" style={{ fontSize: "clamp(25px, 2.6vw, 33px)", lineHeight: "1.14", fontWeight: "800", marginBottom: "14px" }}>
                  Do you offer {term}?
                </h2>
                <p style={{ fontSize: "16.5px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "54ch" }}>
                  Claim your profile so the services you actually perform are the ones recorded here, alongside your
                  licence, hours and coverage. Neither claiming nor advertising buys a ranked position.
                </p>
              </div>
              <div data-stack="" data-biz-actions="" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link href={routes.claim()} style={BTN_PRIMARY}>
                  Claim your profile
                </Link>
                <Link href={routes.forBusinesses()} style={BTN_GHOST}>
                  See business plans
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FinalSearchBand heading={`Find ${term} near you`} service={subservice.name} />
      </div>
    </SiteChrome>
  );
}

/** Small counts read as words in a heading, which is where these appear. */
function countWord(count: number): string {
  const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  return words[count] ?? String(count);
}
