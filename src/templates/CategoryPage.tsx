import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusinessCta,
  CheckList,
  CostTable,
  CriteriaGrid,
  CrumbBar,
  FinalSearch,
  LinkGrid,
  TransparencyBlock,
} from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { MethodologyDisclosure } from "@/components/site/disclosures";
import { ChevronRight, Icon } from "@/components/ui/Icon";
import { ArrowLink, JsonLd, Media, Section, SectionHead, TrustItem } from "@/components/ui/primitives";
import { fullDate, monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

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

  return (
    <SiteChrome active="services">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: category.name,
          url: absoluteUrl(routes.category(category.slug)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Home services", href: routes.servicesIndex() },
          { label: category.name },
        ]}
      />

      <section
        aria-labelledby="hero-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 55%, var(--surface-card) 100%)",
        }}
      >
        <div className="shell" style={{ padding: "60px var(--gutter) 48px" }}>
          <span
            aria-hidden="true"
            style={{ display: "inline-flex", color: "var(--blue-700)", marginBottom: 16 }}
          >
            <Icon name={hasIcon(category.iconKey) ? category.iconKey : "house"} size={34} strokeWidth={1.6} />
          </span>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(34px, 4.2vw, 52px)", maxWidth: 820 }}>
            The ten best {category.name.toLowerCase()}, city by city
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            {category.description ??
              `Researched shortlists of ${category.name.toLowerCase()}, with credentials checked and the reasoning published alongside every list.`}
          </p>
          <div style={{ marginTop: 30, maxWidth: 720 }}>
            <SearchForm
              idPrefix="category"
              lockedService={{ label: `Searching ${category.name}`, value: category.name }}
              locationPlaceholder="Which city?"
            />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul className="shell trust-strip">
            <TrustItem icon="badge" label="Credentials checked" />
            <TrustItem icon="eye" label="Criteria published" />
            <TrustItem icon="pin" label="Researched per city" />
            <TrustItem icon="clock" label="Reviewed on a schedule" />
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- what they do */}
      <Section tone="page" ruleTop labelledBy="what-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 48 }}>
          <div>
            <h2 id="what-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              What {category.name.toLowerCase()} do
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              {category.description ??
                `${category.name} cover ${category.tagline?.toLowerCase() ?? "a range of work"}. What any given company actually takes on varies, and that gap is what our research is for.`}
            </p>
            <MethodologyDisclosure />
          </div>
          <div className="card" style={{ padding: "26px 28px" }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Before you call anyone</h3>
            <CheckList
              items={[
                "Check whether this trade is licensed where you live, and with which authority",
                "Confirm liability insurance directly with the insurer, not the contractor",
                "Get the scope itemized so quotes describe the same job",
                "Ask for the workmanship warranty in writing, and whether it transfers",
                "Agree how change orders are priced before work starts",
              ]}
            />
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------- subservices */}
      {category.subservices.length > 0 ? (
        <Section labelledBy="services-h2">
          <SectionHead
            id="services-h2"
            title={`${category.serviceName} services`}
            lead="The specific jobs within this trade, each with its own considerations."
          />
          <ul className="cat-grid">
            {category.subservices.map((subservice) => (
              <li key={subservice.id} className="card card--lift cat-card">
                <div className="cat-card__top">
                  <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex" }}>
                    <Icon
                      name={subservice.iconKey && hasIcon(subservice.iconKey) ? subservice.iconKey : (hasIcon(category.iconKey) ? category.iconKey : "wrench")}
                      size={22}
                      strokeWidth={1.7}
                    />
                  </span>
                  <ChevronRight size={16} color="var(--gray-300)" />
                </div>
                <h3 className="cat-card__name">
                  <Link
                    href={routes.subservice(category.slug, subservice.slug)}
                    style={{ color: "var(--ink)" }}
                  >
                    {subservice.name}
                  </Link>
                </h3>
                {subservice.description ? (
                  <p className="cat-card__sub">{subservice.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ cities */}
      {rankings.length > 0 ? (
        <Section tone="page" labelledBy="cities-h2">
          <SectionHead
            id="cities-h2"
            title={`${category.name} by city`}
            lead="Every market with a published top ten."
          />
          <div className="metro-grid">
            {rankings.map((ranking) => (
              <article key={ranking.id} className="card card--lift" style={{ overflow: "hidden" }}>
                <div className="thumb" style={{ height: 140 }}>
                  <Media src={ranking.city?.heroImage} alt="" />
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    {ranking.city?.region.name}
                  </p>
                  <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
                    <Link href={rankingUrl(ranking)} style={{ color: "var(--ink)" }}>
                      {category.name} in {ranking.city?.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                    Updated {shortMonthYear(ranking.lastReviewedAt)} · {ranking.companiesReviewed} companies
                    reviewed
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- regions */}
      {regions.length > 0 ? (
        <Section labelledBy="states-h2">
          <SectionHead
            id="states-h2"
            title={`Browse ${category.name.toLowerCase()} by state and province`}
            lead="Licensing rules change at this level, which is why the research does too."
          />
          <div className="region-groups">
            {regions.map((region) => (
              <div key={region.id}>
                <h3 className="region-groups__title">
                  {region.name}, {region.country.name}
                </h3>
                <ul style={{ display: "grid", gap: 8 }}>
                  {region.cities.map((city) => (
                    <li key={city.id}>
                      <Link
                        className="row-link"
                        href={routes.ranking(region.country.code, region.slug, city.slug, category.slug)}
                      >
                        <span>
                          {category.name} in {city.name}
                        </span>
                        <ChevronRight />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* -------------------------------------------------------------- cost */}
      {costRows.length > 0 ? (
        <Section tone="page" labelledBy="costs-h2">
          <SectionHead
            id="costs-h2"
            title={`How much does ${singular} work cost?`}
            lead="Sourced figures from our cost research. Rows with no sourced figure read as quoted per project rather than showing an invented number."
          />
          <CostTable
            caption={`${category.serviceName} pricing`}
            rows={costRows.map((row) => ({
              id: row.id,
              label: row.label,
              lowPrice: row.lowPrice,
              highPrice: row.highPrice,
              typical: row.typical,
              unit: row.unit,
              currency: row.currency,
              note: row.note,
            }))}
          />
        </Section>
      ) : null}

      {/* -------------------------------------------------------- how to choose */}
      <Section tone="ink" labelledBy="choose-h2">
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 id="choose-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
            How we compare {category.name.toLowerCase()}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
            The same factors apply in every market, weighted differently by trade. The criteria for a
            specific city are published on that city&apos;s ranking.
          </p>
        </div>
        <CriteriaGrid
          onInk
          criteria={criteria.map((criterion) => ({
            id: criterion.id,
            title: criterion.title,
            body: criterion.body,
            importance: criterion.importance,
            iconKey: criterion.iconKey,
          }))}
        />
      </Section>

      {/* ------------------------------------------------------------ guides */}
      {guides.length > 0 ? (
        <Section labelledBy="guides-h2">
          <SectionHead
            id="guides-h2"
            title={`${category.serviceName} guides`}
            linkHref={routes.guidesIndex()}
            linkLabel="All guides"
          />
          <LinkGrid
            columns={2}
            items={guides.map((guide) => ({
              label: guide.title,
              href: routes.guide(guide.slug),
              meta: `By ${guide.author?.name} · Updated ${monthYear(guide.publishedAt)}`,
            }))}
          />
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- related */}
      {relatedCategories.length > 0 ? (
        <Section tone="page" labelledBy="related-h2">
          <SectionHead id="related-h2" title="Related services" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {relatedCategories.map((related) => (
              <Link key={related.id} className="chip" href={routes.category(related.slug)}>
                {related.name}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {/* --------------------------------------------------------------- FAQ */}
      <Section labelledBy="faqs-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faqs-h2" className="h2" style={{ marginBottom: 16 }}>
              Common questions
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section tone="page" labelledBy="trans-h2">
        <SectionHead id="trans-h2" title="About this page" />
        <TransparencyBlock
          rows={[
            { label: "Rankings published", value: String(rankings.length) },
            { label: "Guides", value: String(guides.length) },
            { label: "Last reviewed", value: fullDate(rankings[0]?.lastReviewedAt ?? new Date()) },
            { label: "Sponsorship", value: "No sponsored placement on this page" },
          ]}
        />
      </Section>

      <Section labelledBy="biz-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Find ${category.name.toLowerCase()} near you`}
        lockedService={{ label: `Searching ${category.name}`, value: category.name }}
      />
    </SiteChrome>
  );
}
