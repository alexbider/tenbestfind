import type { Metadata } from "next";
import Link from "next/link";
import { CriteriaGrid, CrumbBar, FinalSearch, LinkGrid, TransparencyBlock } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  AiAssistanceDisclosure,
  BadgeDisclosure,
  CredentialDisclosure,
  EditorialDisclosure,
  GoogleReviewDisclosure,
  SponsoredDisclosure,
} from "@/components/site/disclosures";
import { Check, Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, JsonLd, Monogram, Section, SectionHead } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "How we rank — the full methodology",
  description:
    "The criteria behind every TenBestFind ranking, what we verify and what we cannot, how sponsorship works, and why a high rating does not automatically rank higher.",
  alternates: { canonical: "/how-we-rank/" },
};

const PROCESS = [
  {
    title: "Define the market",
    body: "A city and a trade. We work from the area a company genuinely serves rather than a radius drawn on a map.",
  },
  {
    title: "Build the research pool",
    body: "Every company documented as working in that market goes in, whether or not it advertises. Businesses never need to pay to be considered.",
  },
  {
    title: "Check the record",
    body: "Licensing or registration against the issuing authority, insurance certificates from the insurer, and manufacturer certification against the manufacturer's own directory.",
  },
  {
    title: "Compare the work",
    body: "Service range actually performed, warranty terms in writing, response and scheduling, and documented local projects.",
  },
  {
    title: "Read the feedback",
    body: "Patterns across public reviews rather than reactions to single reviews. Volume differs enormously between companies of similar quality.",
  },
  {
    title: "Publish and re-check",
    body: "Ten names with the criteria, the sources and the date. Then re-reviewed on a schedule, and sooner when something significant changes.",
  },
];

const MINIMUMS = [
  "A verifiable business presence in the market being ranked",
  "Current liability insurance appropriate to the trade",
  "Licensing or registration where the jurisdiction requires it",
  "Enough documented work to assess, rather than a new entity with no record",
  "No unresolved pattern of serious complaints in public records",
];

const EXCLUSIONS = [
  "We could not confirm the company operates in this market",
  "Licensing required for the trade could not be verified",
  "Insurance could not be confirmed with the insurer",
  "Too little documented work to assess fairly",
  "The company told us it does not serve this area",
];

const BADGES = [
  { label: "Verified details", body: "Registration and credentials checked against a primary source, with the date recorded.", tone: "positive" as const },
  { label: "Top 10 ranked", body: "An editorial position on a published ranking. It cannot be bought.", tone: "gold" as const },
  { label: "Claimed profile", body: "The owner verified ownership and manages the listing. Claiming never affects ranking.", tone: "brand" as const },
  { label: "Featured partner", body: "A paid, labelled placement outside the ranked list. It never earns a ranking position.", tone: "neutral" as const },
];

const FAQS = [
  {
    question: "Can a business pay to be ranked?",
    answer:
      "No. Editorial positions are not for sale at any price. A business can buy a labelled sponsored placement, which sits outside the ranked list and carries a Sponsored label wherever it appears.",
  },
  {
    question: "Does a higher Google rating rank a company higher?",
    answer:
      "No. A high rating does not automatically rank higher. Review volume varies enormously between companies of similar quality, and ratings are one signal among several. We read the pattern in what customers describe rather than the number alone.",
  },
  {
    question: "Why are there exactly ten?",
    answer:
      "Ten is enough to show real variety in a market and short enough to act on. Where a market cannot support ten companies that meet our minimum standards, we publish fewer and say so rather than padding the list.",
  },
  {
    question: "Is any of this decided by software?",
    answer:
      "No position is ever set by an automated system. We use software to gather and organize public records, and a named editor reads every page before it publishes.",
  },
  {
    question: "How often do rankings change?",
    answer:
      "Each list is re-reviewed on a schedule, and sooner when something significant changes such as a licence lapsing, a company closing, or a pattern emerging in feedback. The date on every page is the last time an editor actually reviewed it.",
  },
  {
    question: "What if a company we rank becomes a sponsor?",
    answer:
      "Its editorial position is unaffected, and the sponsorship is labelled. The editorial team is not told which companies are subscribers when a ranking is finalized.",
  },
  {
    question: "How do I report something that is wrong?",
    answer:
      "Send the page and the problem through the corrections form. We check the claim against the primary source, correct the page if the report is right, and note on the page that it changed.",
  },
  {
    question: "Do you accept payment to remove a company?",
    answer:
      "No. A company can be removed from a list only by the research, for example when a licence lapses or it stops serving the market.",
  },
];

export default async function HowWeRankPage() {
  const [criteria, settings, categories, people] = await Promise.all([
    db.criterion.findMany({ where: { scope: "GLOBAL" }, orderBy: { sortOrder: "asc" } }),
    db.setting.findMany({ where: { groupName: "editorial" } }),
    db.category.findMany({
      where: { published: true, rankings: { some: { status: "PUBLISHED" } } },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.person.findMany({ where: { published: true, isReviewer: true }, orderBy: { name: "asc" } }),
  ]);

  const version = parseJson<string>(
    settings.find((setting) => setting.key === "rankings.methodologyVersion")?.value,
    "1.0",
  );
  const cadence = parseJson<number>(
    settings.find((setting) => setting.key === "rankings.reviewCadenceMonths")?.value,
    6,
  );

  return (
    <SiteChrome active="trust">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "How we rank",
          url: absoluteUrl(routes.howWeRank()),
        }}
      />
      <FaqJsonLd faqs={FAQS} />

      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "How we rank" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <Badge tone="brand">Methodology version {version}</Badge>
            <Badge tone="neutral">Reviewed every {cadence} months</Badge>
          </div>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            How a TenBestFind ranking is made
          </h1>
          <p className="hero__lead" style={{ maxWidth: 680 }}>
            The criteria, what we verify and what we cannot, how sponsorship works, and the line
            between what we checked and what we were told. All of it is public because the ranking
            is worth nothing if you cannot see how it was built.
          </p>
          <nav aria-label="On this page" className="pill-nav">
            {[
              ["The process", "#process"],
              ["Evaluation factors", "#factors"],
              ["Google reviews", "#reviews"],
              ["Minimum standards", "#standards"],
              ["Sponsorship", "#sponsorship"],
              ["Human review", "#review"],
              ["Corrections", "#corrections"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="chip">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <Section labelledBy="process-h2" id="process">
        <SectionHead
          id="process-h2"
          title="The process, start to finish"
          lead="The same six stages run for every market. The criteria inside them change by trade."
        />
        <ol className="numbered-steps" style={{ marginTop: 0 }}>
          {PROCESS.map((step, index) => (
            <li key={step.title}>
              <span className="numbered-steps__num" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="ink" labelledBy="factors-h2" id="factors">
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 id="factors-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
            What we evaluate
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
            Factors carry importance labels rather than invented percentage weights, because a
            precise-looking number would imply a precision the research does not have.
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

      {categories.length > 0 ? (
        <Section labelledBy="trade-h2">
          <SectionHead
            id="trade-h2"
            title="Criteria change by trade"
            lead="Each ranking publishes the criteria that applied to it, because what matters for a roofer is not what matters for a mover."
          />
          <LinkGrid
            columns={3}
            items={categories.map((category) => ({
              label: `${category.name} criteria`,
              href: routes.category(category.slug),
            }))}
          />
        </Section>
      ) : null}

      <Section tone="page" labelledBy="reviews-h2" id="reviews">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <h2 id="reviews-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How we use Google reviews
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              Ratings and review counts come from each company&apos;s Google Business Profile, shown
              with the date we read them. They are Google&apos;s numbers, not ours, and we never
              blend them into a score of our own.
            </p>
            <p className="lead" style={{ marginBottom: 20 }}>
              A high rating does not automatically rank higher. Volume varies enormously between
              companies of similar quality, and a handful of recent reviews tells you less than a
              consistent pattern over years.
            </p>
            <GoogleReviewDisclosure />
          </div>
          <div className="card" style={{ padding: "28px 30px" }}>
            <h3 className="related-heading">What we check credentials against</h3>
            <ul style={{ display: "grid", gap: 12 }}>
              {[
                "Licensing registers held by the issuing authority",
                "Business registration with the state or province",
                "Insurance certificates, requested from the insurer",
                "Manufacturer certification directories",
                "Municipal permit records where they are public",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Check size={17} />
                  <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 18 }}>
              <CredentialDisclosure />
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="standards-h2" id="standards">
        <SectionHead
          id="standards-h2"
          title="Minimum standards, and why companies get left out"
          lead="Exclusion is a research outcome rather than a judgement about the company's work."
        />
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div className="card" style={{ padding: "26px 28px" }}>
            <h3 className="related-heading">To be considered, a company needs</h3>
            <ul style={{ display: "grid", gap: 11 }}>
              {MINIMUMS.map((item) => (
                <li key={item} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Check size={17} />
                  <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ padding: "26px 28px" }}>
            <h3 className="related-heading">Reasons a company is not listed</h3>
            <ul style={{ display: "grid", gap: 11 }}>
              {EXCLUSIONS.map((item) => (
                <li key={item} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Icon name="info" size={17} color="var(--gray-400)" />
                  <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="ink" labelledBy="sponsorship-h2" id="sponsorship">
        <div style={{ maxWidth: 720, marginBottom: 36 }}>
          <h2 id="sponsorship-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
            Advertising does not buy editorial rankings
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
            Businesses never need to pay to be considered, and no amount of payment moves a
            company into the ranked ten. Here is what each badge on the site actually means.
          </p>
        </div>
        <ul className="badge-grid">
          {BADGES.map((badge) => (
            <li key={badge.label}>
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <p>{badge.body}</p>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <SponsoredDisclosure />
          <BadgeDisclosure />
        </div>
      </Section>

      <Section labelledBy="review-h2" id="review">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <h2 id="review-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              Human review, and where software helps
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              We use software to gather and organize public records: licence registers, business
              registrations, permit data and published pricing. That is collection, not judgement.
            </p>
            <p className="lead" style={{ marginBottom: 20 }}>
              No ranking position is set by an automated system, and every published page is read by
              a named editor before it goes live.
            </p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <AiAssistanceDisclosure />
              <EditorialDisclosure />
            </div>
          </div>
          {people.length > 0 ? (
            <div>
              <h3 className="related-heading">Expert reviewers</h3>
              <ul style={{ display: "grid", gap: 12 }}>
                {people.map((person) => (
                  <li key={person.id} className="card person-card">
                    <Monogram name={person.name} size={52} />
                    <div>
                      <h4 style={{ fontSize: 16, marginBottom: 3 }}>
                        <Link href={routes.expert(person.slug)} style={{ color: "var(--ink)" }}>
                          {person.name}
                        </Link>
                      </h4>
                      <p className="person-card__role">{person.role}</p>
                      <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                        {person.limits ?? person.bio?.split(". ")[0]}.
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Section>

      <Section tone="page" labelledBy="corrections-h2" id="corrections">
        <SectionHead
          id="corrections-h2"
          title="Getting something changed"
          lead="Three routes, all of which end with an editor reading it."
        />
        <LinkGrid
          columns={3}
          items={[
            {
              label: "Report a correction",
              href: routes.corrections(),
              meta: "Anyone can report an error. We check it against the primary source.",
            },
            {
              label: "Claim your business",
              href: routes.claim(),
              meta: "Verify ownership and manage your own listing details.",
            },
            {
              label: "Submit a business",
              href: routes.addBusiness(),
              meta: "Add a company to the research pool for its city and trade.",
            },
          ]}
        />
      </Section>

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
          <FaqList faqs={FAQS} />
        </div>
      </Section>

      <Section tone="page" labelledBy="meta-h2" ruleBottom={false}>
        <TransparencyBlock
          title="About this methodology"
          rows={[
            { label: "Version", value: version },
            { label: "Review cadence", value: `Every ${cadence} months` },
            { label: "Last updated", value: fullDate(new Date()) },
            { label: "Owner", value: "TenBestFind editorial team" },
          ]}
        />
      </Section>

      <FinalSearch />
    </SiteChrome>
  );
}
