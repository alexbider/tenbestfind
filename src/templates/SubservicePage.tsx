import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCta, CheckList, CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Icon } from "@/components/ui/Icon";
import { ArrowLink, JsonLd, Section, SectionHead } from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

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
      include: {
        city: { include: { region: { include: { country: true } } } },
      },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { author: { select: { name: true } } },
    }),
  ]);

  const faqs = [
    {
      question: `Who handles ${subservice.name.toLowerCase()}?`,
      answer: `${subservice.name} is handled by ${category.name.toLowerCase()}. Not every company in the trade takes this work on, so each ranking lists the services a company genuinely performs rather than everything it advertises.`,
    },
    {
      question: `What should I ask before booking ${subservice.name.toLowerCase()}?`,
      answer:
        "Ask what the quote includes and excludes, who is doing the work, whether a permit is needed and who is pulling it, and what the workmanship warranty covers. Get the answers in writing before anyone starts.",
    },
    {
      question: "How do I compare quotes for this?",
      answer:
        "Put them on one sheet line by line. Differences in price almost always turn out to be differences in scope, material grade or warranty length rather than margin.",
    },
  ];

  return (
    <SiteChrome active="services">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: subservice.name,
          serviceType: category.serviceName,
          url: absoluteUrl(routes.subservice(category.slug, subservice.slug)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Home services", href: routes.servicesIndex() },
          { label: category.name, href: routes.category(category.slug) },
          { label: subservice.name },
        ]}
      />

      <section
        aria-labelledby="hero-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 55%, var(--surface-card) 100%)",
        }}
      >
        <div className="shell" style={{ padding: "56px var(--gutter) 44px" }}>
          <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--blue-700)", marginBottom: 16 }}>
            <Icon
              name={subservice.iconKey && hasIcon(subservice.iconKey) ? subservice.iconKey : hasIcon(category.iconKey) ? category.iconKey : "wrench"}
              size={32}
              strokeWidth={1.6}
            />
          </span>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 4vw, 48px)", maxWidth: 820 }}>
            {subservice.name}
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            {subservice.description ??
              `${subservice.name} is part of the ${category.serviceName.toLowerCase()} trade. Here is who does it, what to check, and where we have published a researched shortlist.`}
          </p>
          <div style={{ marginTop: 28, maxWidth: 720 }}>
            <SearchForm
              idPrefix="subservice"
              lockedService={{ label: `Searching ${subservice.name}`, value: subservice.name }}
              locationPlaceholder="Which city?"
            />
          </div>
        </div>
      </section>

      <Section tone="page" ruleTop labelledBy="about-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 48 }}>
          <div>
            <h2 id="about-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              What this work involves
            </h2>
            <p className="lead" style={{ marginBottom: 20 }}>
              {subservice.description ??
                `${subservice.name} sits within ${category.serviceName.toLowerCase()}. Scope, pricing and licensing follow the parent trade, so start with the ${category.name.toLowerCase()} research for your city.`}
            </p>
            <ArrowLink href={routes.category(category.slug)}>
              All {category.name.toLowerCase()} research
            </ArrowLink>
          </div>
          <div className="card" style={{ padding: "26px 28px" }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>What to check first</h3>
            <CheckList
              items={[
                "Whether the company performs this specific work in-house",
                "Licensing or registration for the parent trade in your area",
                "Liability insurance, confirmed with the insurer",
                "What the quote excludes as much as what it includes",
                "Warranty terms in writing before work starts",
              ]}
            />
          </div>
        </div>
      </Section>

      {rankings.length > 0 ? (
        <Section labelledBy="rank-h2">
          <SectionHead
            id="rank-h2"
            title={`${category.name} rankings by city`}
            lead="Companies offering this service appear in the published lists for their market."
          />
          <ul className="index-list">
            {rankings.map((ranking) => (
              <li key={ranking.id}>
                <Link className="index-row" href={rankingUrl(ranking)}>
                  <span aria-hidden="true" className="rank-mark">
                    10
                  </span>
                  <span className="eyebrow">
                    {ranking.city?.name}, {ranking.city?.region.code.toUpperCase()}
                  </span>
                  <span style={{ display: "block", minWidth: 0 }}>
                    <span className="index-row__title">{ranking.title}</span>
                    <span className="index-row__summary">{ranking.summary}</span>
                  </span>
                  <span className="index-row__meta">Updated {shortMonthYear(ranking.lastReviewedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {businesses.length > 0 ? (
        <Section tone="page" labelledBy="biz-h2">
          <SectionHead
            id="biz-h2"
            title={`Companies offering ${subservice.name.toLowerCase()}`}
            lead="Drawn from the profiles where this service is listed."
          />
          <LinkGrid
            columns={2}
            items={businesses.map((business) => ({
              label: business.name,
              href: routes.business(business.slug),
              meta: business.city
                ? `${business.city.name}, ${business.city.region.code.toUpperCase()}`
                : undefined,
            }))}
          />
        </Section>
      ) : null}

      {category.subservices.length > 1 ? (
        <Section labelledBy="sib-h2">
          <SectionHead id="sib-h2" title={`Other ${category.serviceName.toLowerCase()} services`} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {category.subservices
              .filter((item) => item.id !== subservice.id)
              .map((item) => (
                <Link key={item.id} className="chip" href={routes.subservice(category.slug, item.slug)}>
                  {item.name}
                </Link>
              ))}
          </div>
        </Section>
      ) : null}

      {guides.length > 0 ? (
        <Section tone="page" labelledBy="guides-h2">
          <SectionHead id="guides-h2" title="Guides" linkHref={routes.guidesIndex()} linkLabel="All guides" />
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

      <Section labelledBy="faq-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Common questions
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section tone="page" labelledBy="biz2-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Find ${subservice.name.toLowerCase()} near you`}
        lockedService={{ label: `Searching ${subservice.name}`, value: subservice.name }}
      />
    </SiteChrome>
  );
}
