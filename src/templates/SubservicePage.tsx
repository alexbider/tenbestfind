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
  H2,
  LEAD,
  RowLink,
  SHELL,
  SR_ONLY,
  TenOutline,
  FinalSearchBand,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { faqsFor } from "@/lib/faqs";
import { parseHubBody } from "@/lib/hub-body";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { subserviceCopy, rankingCardTitle, tradesPhrase } from "@/lib/seo-copy";
import { breadcrumbSchema, subserviceCrumbs } from "@/lib/breadcrumbs";
import { graph, pageEntity, serviceEntity, serviceId } from "@/lib/schema";

/**
 * One job inside a trade: hardwood flooring, AC repair, chimney sweeping.
 *
 * Sixty-nine of these, and they used to read as the thinnest page on the site.
 * The problem was not the writing, it was the shape: a hero with one sentence
 * in it, a section whose left column held a single generated line beside a card
 * that did all the work, the same list of sibling services printed twice, and
 * then four calls to action stacked at the foot with nothing between them.
 * A reader scrolled past two screens of white space to reach an ask.
 *
 * So this is now built out of the same pieces the trade page above it uses, in
 * the same order a reader needs them: what the job is, who does it, where it is
 * covered, what to check before booking, and only then what we would like them
 * to do. Every section is allowed to be absent, and the ones that survive an
 * empty database are the ones that say something true about the work itself.
 */

/** What separates a company that really does this work from one that lists it. */
const CHECKS: { title: string; body: string; icon: IconName }[] = [
  {
    title: "In-house or subcontracted",
    body: "Ask whether the crew doing this specific work is on their payroll. Plenty of companies list a service and hand it straight to somebody else, which is not wrong, but it changes who is answerable when something goes back.",
    icon: "users",
  },
  {
    title: "The licence for the parent trade",
    body: "Look the number up with the authority that issues it rather than reading the certificate they send you. What a licence covers, and whether one is needed at all, changes by state and province.",
    icon: "scale",
  },
  {
    title: "Insurance, confirmed with the insurer",
    body: "A current certificate sent to you by the insurer, not a photocopy from the company. Ask for liability and, where crews are on site, workers' compensation.",
    icon: "shield",
  },
  {
    title: "What the quote leaves out",
    body: "Removal, disposal, subfloor or substrate work, permits and making good afterwards are where two quotes on the same job separate. Ask for the exclusions in writing next to the inclusions.",
    icon: "doc",
  },
  {
    title: "Two warranties, not one",
    body: "The manufacturer covers the material and the company covers the workmanship. Get the second in writing, with its length, and ask whether it transfers if you sell.",
    icon: "award",
  },
  {
    title: "How a change is priced",
    body: "Agree before the deposit how anything found on the way is priced and approved. The moment to settle that is while you are still choosing between companies, not on the day somebody lifts a floorboard.",
    icon: "pencil",
  },
];

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
  const trade = tradesPhrase(category);
  const term = (subservice.searchTerm?.trim() || subservice.name).toLowerCase();
  const siblings = category.subservices.filter((item) => item.id !== subservice.id);

  const cities = [
    ...new Set(rankings.map((ranking) => (ranking.city ? `${ranking.city.name}, ${ranking.city.region.name}` : null)).filter((place): place is string => Boolean(place))),
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

  const CARD = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "18px",
    boxShadow: "var(--shadow-sm)",
  };

  return (
    <SiteChrome active="services">
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

      {/* ------------------------------------------------------------- hero */}
      <section aria-labelledby="hero-h1" style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 56px" }}>
          <Crumbs items={crumbs} />
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "56px", alignItems: "start" }}>
            <div>
              <Eyebrow heroIn="1" gap="16px">
                <Link href={routes.category(category.slug)} style={{ color: "inherit" }}>
                  {category.serviceName}
                </Link>
              </Eyebrow>
              <h1
                id="hero-h1"
                data-hero-in="2"
                style={{
                  fontSize: "clamp(34px, 4.2vw, 52px)",
                  lineHeight: "1.07",
                  letterSpacing: "-0.04em",
                  fontWeight: "800",
                  textWrap: "balance",
                }}
              >
                {copy.h1}
              </h1>
              <p data-hero-in="3" style={{ ...LEAD, marginTop: "20px", fontSize: "18px", maxWidth: "600px", textWrap: "pretty" }}>
                {subservice.description ??
                  `Who takes this work on, what separates a company worth calling from one that merely lists it, and where we have published a researched shortlist.`}
              </p>
              <div style={{ marginTop: "22px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <span>
                  Prepared by the{" "}
                  <Link href={routes.editorialTeam()} style={{ fontWeight: "600" }}>
                    TenBestFind Editorial Team
                  </Link>
                </span>
                <span aria-hidden="true">·</span>
                <span>Updated {monthYear(subservice.updatedAt)}</span>
              </div>
            </div>

            <div style={{ ...CARD, boxShadow: "var(--shadow-lg)", borderRadius: "20px", padding: "26px 26px 24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                Find {term} in your area
              </h2>
              <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "18px" }}>
                Enter your city or postal code and we will take you to the {category.serviceName.toLowerCase()} ranking
                for that market.
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
                <label htmlFor="sub-where" style={SR_ONLY}>
                  City or postal code
                </label>
                <input
                  id="sub-where"
                  name="location"
                  placeholder="City or postal code"
                  autoComplete="postal-code"
                  style={{
                    flex: "1",
                    minWidth: 0,
                    height: "48px",
                    padding: "0 14px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    background: "var(--surface-page)",
                  }}
                />
                <button type="submit" style={{ ...BTN_PRIMARY, height: "48px" }}>
                  Search
                </button>
              </form>
              {siblings.length > 0 ? (
                <div style={{ marginTop: "18px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {siblings.slice(0, 3).map((item) => (
                    <Link key={item.id} className="chip" href={routes.subservice(category.slug, item.slug)}>
                      {item.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* The page's own facts, in the one place a reader looks for scale.
              Anything the database cannot answer is left out rather than
              printed as a zero. */}
          <ul
            style={{
              marginTop: "44px",
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
              gap: "1px",
              background: "var(--border-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            {facts.map((fact) => (
              <li key={fact.label} style={{ background: "var(--surface-card)", padding: "18px 20px" }}>
                <span style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  {fact.label}
                </span>
                <span style={{ display: "block", fontSize: "19px", fontWeight: "700", lineHeight: "1.25" }}>
                  {fact.href ? <Link href={fact.href}>{fact.value}</Link> : fact.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ about */}
      <section id="about" aria-labelledby="about-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "80px 24px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "48px", alignItems: "start" }}
        >
          <div>
            <h2 id="about-h2" style={{ ...H2, marginBottom: "18px", textWrap: "balance" }}>
              What {term} actually involves
            </h2>
            {/* A written body replaces the generated paragraphs rather than
                joining them, so a page somebody has written reads as written. */}
            {body.length > 0 ? (
              <div className="prose">
                <GuideBody blocks={body} />
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                <p style={{ ...LEAD, fontSize: "17px" }}>
                  {subservice.description ??
                    `${subservice.name} sits inside the ${category.serviceName.toLowerCase()} trade, so the licensing, insurance and permit rules that apply to it are the trade's rules rather than its own.`}
                </p>
                <p style={{ ...LEAD, fontSize: "17px" }}>
                  That is the part worth knowing before you call anybody: a company can list this work without doing it
                  itself, and the quote you are handed will often fold it into a larger job. Both are ordinary. Both
                  change what you should be asking.
                </p>
                <p style={{ ...LEAD, fontSize: "17px" }}>
                  The shortlists below are built from the {category.serviceName.toLowerCase()} research for each market,
                  and every profile records the services a company genuinely performs rather than everything it
                  advertises.
                </p>
              </div>
            )}
            <p style={{ marginTop: "22px" }}>
              <Link href={routes.category(category.slug)} style={{ fontSize: "15px", fontWeight: "600" }}>
                All {trade.toLowerCase()} research →
              </Link>
            </p>
          </div>

          <div style={{ ...CARD, padding: "26px 28px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "16px" }}>At a glance</h3>
            <dl style={{ display: "grid", gap: "14px", margin: 0 }}>
              {[
                { term: "The trade", detail: category.serviceName },
                { term: "Who does it", detail: trade },
                {
                  term: "Where we cover it",
                  detail:
                    cities.length > 0
                      ? `${cities.slice(0, 2).join(" and ")}${cities.length > 2 ? ` and ${cities.length - 2} more` : ""}`
                      : "No market shortlisted yet",
                },
                {
                  term: "Related services",
                  detail: siblings.length > 0 ? `${siblings.length} in this trade` : "None listed",
                },
              ].map((row) => (
                <div key={row.term} style={{ display: "grid", gap: "2px" }}>
                  <dt style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    {row.term}
                  </dt>
                  <dd style={{ margin: 0, fontSize: "16px", fontWeight: "600", lineHeight: "1.45" }}>{row.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- checks */}
      <section id="checks" aria-labelledby="checks-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div style={{ ...SHELL, padding: "80px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "16px" }}>
            <h2 id="checks-h2" style={{ ...H2, color: "#fff", textWrap: "balance" }}>
              Before you book {term}
            </h2>
            <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              How we rank →
            </Link>
          </div>
          <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)", maxWidth: "760px", marginBottom: "40px" }}>
            Six checks, in the order they save you the most. None of them takes longer than a phone call, and the
            first one is the reason two quotes for the same job can be a thousand apart.
          </p>
          {/* Three across, so six checks land as two even rows rather than a
              row of four and a stranded pair. */}
          <ol role="list"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}
          >
            {CHECKS.map((check, index) => (
              <li
                key={check.title}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "16px",
                  padding: "22px 24px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "38px",
                    height: "38px",
                    borderRadius: "11px",
                    background: "rgba(231,184,99,0.16)",
                    color: "var(--gold-ink)",
                    marginBottom: "14px",
                  }}
                >
                  <Icon name={check.icon} size={19} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>
                  <span style={{ color: "var(--gold-ink)", marginRight: "8px" }}>{index + 1}</span>
                  {check.title}
                </h3>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "rgba(232,237,245,0.78)" }}>{check.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <section id="rankings" aria-labelledby="rank-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Eyebrow gap="12px">Where we cover it</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "28px" }}>
              <h2 id="rank-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700", textWrap: "balance" }}>
                {category.name} shortlists by city
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Every shortlist →
              </Link>
            </div>
            <p style={{ ...LEAD, maxWidth: "700px", marginBottom: "28px" }}>
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

      {/* -------------------------------------------------------- companies */}
      {businesses.length > 0 ? (
        <section id="companies" aria-labelledby="biz-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Eyebrow gap="12px">On the lists</Eyebrow>
            <h2 id="biz-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700", marginBottom: "12px", textWrap: "balance" }}>
              Companies that list {term}
            </h2>
            <p style={{ ...LEAD, maxWidth: "700px", marginBottom: "32px" }}>
              Drawn from the profiles where this service is recorded, not from what a company advertises.
            </p>
            <ul role="list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
              {businesses.map((business) => (
                <li key={business.id} data-card="" style={{ ...CARD, padding: "22px 24px" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", lineHeight: "1.35", marginBottom: "4px" }}>
                    <Link href={routes.business(business.slug)}>{business.name}</Link>
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

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <section id="guides" aria-labelledby="guides-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Eyebrow gap="12px">Read first</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "28px" }}>
              <h2 id="guides-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700" }}>
                {category.serviceName} guides
              </h2>
              <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All guides →
              </Link>
            </div>
            <ul role="list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
              {guides.map((guide) => (
                <li key={guide.id} data-card="" style={{ ...CARD, padding: "24px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.35", marginBottom: "8px" }}>
                    <Link href={routes.guide(guide.slug)}>{guide.title}</Link>
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

      {/* ---------------------------------------------------------- related */}
      {siblings.length > 0 ? (
        <section id="related" aria-labelledby="related-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "80px 24px" }}>
            <Eyebrow gap="12px">Same trade</Eyebrow>
            <h2 id="related-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: "700", marginBottom: "32px", textWrap: "balance" }}>
              Other {category.serviceName.toLowerCase()} services
            </h2>
            <ul role="list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", listStyle: "none", padding: 0, margin: 0 }}>
              {siblings.map((item) => (
                <li key={item.id} data-card="" style={{ ...CARD, padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
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
                    <Icon name={icon(item.iconKey)} size={22} strokeWidth={1.75} />
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.3" }}>{item.name}</h3>
                  {item.description ? (
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{item.description}</p>
                  ) : null}
                  <Link
                    href={routes.subservice(category.slug, item.slug)}
                    style={{ marginTop: "auto", paddingTop: "10px", fontSize: "15px", fontWeight: "600" }}
                  >
                    About {item.name.toLowerCase()} →
                  </Link>
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
          <div>
            <h2 id="faqs-h2" style={{ ...H2, textWrap: "balance", marginBottom: "16px" }}>
              Common questions about {term}
            </h2>
            <Link href={routes.contact()} style={{ fontSize: "15px", fontWeight: "600" }}>
              Ask us something else →
            </Link>
          </div>
          <ul role="list" style={{ display: "grid", gap: "12px", listStyle: "none", padding: 0, margin: 0 }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- for businesses */}
      <section aria-labelledby="cta-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "center" }}
        >
          <div>
            <Eyebrow gap="12px">For {category.name.toLowerCase()}</Eyebrow>
            <h2 id="cta-h2" style={{ ...H2, marginBottom: "14px", textWrap: "balance" }}>
              Do you offer {term}?
            </h2>
            <p style={LEAD}>
              Claim your profile so the services you actually perform are the ones recorded here, alongside your
              licence, hours and coverage. Neither claiming nor advertising buys a ranked position.
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

      <FinalSearchBand heading={`Find ${term} near you`} service={subservice.name} />
    </SiteChrome>
  );
}
