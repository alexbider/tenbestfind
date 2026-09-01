import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CrumbBar, FinalSearch, LinkGrid, TransparencyBlock } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { CredentialDisclosure, EditorialDisclosure } from "@/components/site/disclosures";
import { Icon } from "@/components/ui/Icon";
import {
  ArrowLink,
  Badge,
  JsonLd,
  Monogram,
  Section,
  SectionHead,
  StatusPill,
} from "@/components/ui/primitives";
import { fullDate, monthYear } from "@/lib/format";
import { parseJson, parseList, type LinkRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCardSelect } from "@/lib/queries";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function loadPerson(slug: string) {
  return db.person.findUnique({
    where: { slug },
    include: {
      credentials: { orderBy: { sortOrder: "asc" } },
      experience: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = await loadPerson(slug);
  if (!person) return {};
  return seoFor("person", person.id, {
    title: `${person.name} — ${person.role}`,
    description: person.bio,
    path: routes.expert(person.slug),
    image: person.portrait,
  });
}

export default async function ExpertProfilePage({ params }: Props) {
  const { slug } = await params;
  const person = await loadPerson(slug);
  if (!person || !person.published) {
    await redirectIfKnown(routes.expert(slug));
    notFound();
  }

  const [authoredRankings, reviewedRankings, authoredGuides, reviewedGuides] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED", authorId: person.id },
      orderBy: { lastReviewedAt: "desc" },
      select: rankingCardSelect,
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED", reviewerId: person.id },
      orderBy: { lastReviewedAt: "desc" },
      select: rankingCardSelect,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", authorId: person.id },
      orderBy: { publishedAt: "desc" },
      include: { category: { select: { serviceName: true } } },
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", reviewerId: person.id },
      orderBy: { publishedAt: "desc" },
      include: { category: { select: { serviceName: true } } },
    }),
  ]);

  const specializations = parseList(person.specializations);
  const markets = parseList(person.markets);
  const links = parseJson<LinkRow[]>(person.links, []);

  const faqs = [
    {
      question: `What does ${person.name.split(" ")[0]} review?`,
      answer:
        person.limits ??
        `${person.name} works across ${specializations.slice(0, 3).join(", ").toLowerCase() || "home services"} content. Every page they touch carries their name.`,
    },
    {
      question: "Does an expert reviewer set ranking positions?",
      answer:
        "No. Reviewers read the criteria and the finished page for technical accuracy. Editors set the order, and a reviewer is not shown a ranking order before reviewing the criteria.",
    },
    {
      question: "How are credentials on this page verified?",
      answer:
        "Verified means we found the credential in the issuing body's own register and noted the date. Self-reported means the person told us and we could not independently confirm it. Expired means the record exists but has lapsed.",
    },
    {
      question: "Do reviewers have commercial relationships with the companies covered?",
      answer:
        "No. Anyone reviewing or writing about a trade declares outside work in that trade, and they are recused from any market where they hold a commercial interest.",
    },
  ];

  return (
    <SiteChrome active="trust">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: person.name,
          jobTitle: person.role,
          description: person.bio,
          url: absoluteUrl(routes.expert(person.slug)),
          knowsAbout: specializations,
          worksFor: { "@type": "Organization", name: "TenBestFind" },
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Editorial team", href: routes.editorialTeam() },
          { label: person.name },
        ]}
      />

      <section aria-labelledby="expert-h1" style={{ background: "var(--surface-page)" }}>
        <div className="shell expert-hero" style={{ padding: "48px var(--gutter) 44px" }}>
          <div className="expert-portrait">
            <Monogram name={person.name} size={112} radius={24} />
            <div className="expert-portrait__roles">
              {person.isExpert ? <Badge tone="positive">Verified expert</Badge> : null}
              {person.isReviewer ? <Badge tone="brand">Editorial reviewer</Badge> : null}
              {person.isAuthor ? <Badge tone="neutral">Staff author</Badge> : null}
            </div>
            {links.length > 0 ? (
              <ul style={{ display: "grid", gap: 8, marginTop: 18, textAlign: "left" }}>
                {links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      rel="nofollow noopener"
                      target="_blank"
                      style={{ fontSize: 14, display: "inline-flex", alignItems: "center", gap: 7 }}
                    >
                      <Icon name="link" size={14} />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <CredentialDisclosure />
            </div>
          </div>

          <div>
            <h1 id="expert-h1" style={{ fontSize: "clamp(30px, 3.6vw, 44px)", lineHeight: 1.1, marginBottom: 10 }}>
              {person.name}
            </h1>
            <p style={{ fontSize: 18, color: "var(--color-primary)", fontWeight: 600, marginBottom: 20 }}>
              {person.role}
            </p>
            {specializations.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {specializations.map((item) => (
                  <span key={item} className="chip" style={{ cursor: "default" }}>
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            <dl className="glance-card__grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {person.yearsExperience ? (
                <div>
                  <dt>Years in the field</dt>
                  <dd>{person.yearsExperience}</dd>
                </div>
              ) : null}
              <div>
                <dt>Rankings written</dt>
                <dd>{authoredRankings.length}</dd>
              </div>
              <div>
                <dt>Rankings reviewed</dt>
                <dd>{reviewedRankings.length}</dd>
              </div>
              <div>
                <dt>Guides</dt>
                <dd>{authoredGuides.length + reviewedGuides.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <Section ruleTop labelledBy="about-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48 }}>
          <div>
            <h2 id="about-h2" className="h2" style={{ marginBottom: 18 }}>
              About {person.name.split(" ")[0]}
            </h2>
            <div className="prose">
              <p>{person.bio}</p>
              {person.limits ? <p>{person.limits}</p> : null}
            </div>
            <div style={{ marginTop: 20 }}>
              <EditorialDisclosure />
            </div>
          </div>
          {markets.length > 0 ? (
            <div className="card" style={{ padding: "24px 26px", alignSelf: "start" }}>
              <h3 className="related-heading">Markets covered</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {markets.map((market) => (
                  <span key={market} className="chip" style={{ cursor: "default" }}>
                    {market}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Section>

      {person.credentials.length > 0 ? (
        <Section tone="page" labelledBy="cred-h2">
          <SectionHead
            id="cred-h2"
            title="Credentials"
            lead="Each item carries its status, so you can tell what we confirmed from what was reported to us."
          />
          <ul className="credential-list">
            {person.credentials.map((credential) => (
              <li key={credential.id}>
                <span className="credential-list__icon" aria-hidden="true">
                  <Icon
                    name={credential.status === "VERIFIED" ? "badge" : credential.status === "EXPIRED" ? "alert" : "doc"}
                    size={20}
                    color={
                      credential.status === "VERIFIED"
                        ? "var(--green-600)"
                        : credential.status === "EXPIRED"
                          ? "var(--maple-600)"
                          : "var(--gray-400)"
                    }
                  />
                </span>
                <span>
                  <strong>{credential.label}</strong>
                  <span>
                    {credential.issuer ?? "Issuer not recorded"}
                    {credential.checkedAt ? ` · Checked ${fullDate(credential.checkedAt)}` : ""}
                  </span>
                </span>
                <StatusPill status={credential.status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {person.experience.length > 0 ? (
        <Section labelledBy="exp-h2">
          <SectionHead id="exp-h2" title="Experience" />
          <ol className="timeline">
            {person.experience.map((item) => (
              <li key={item.id}>
                <span className="timeline__years">
                  {item.startedAt ? new Date(item.startedAt).getFullYear() : ""}
                  {" – "}
                  {item.endedAt ? new Date(item.endedAt).getFullYear() : "present"}
                </span>
                <span>
                  <h3>{item.role}</h3>
                  <p className="timeline__org">{item.org}</p>
                  {item.summary ? <p>{item.summary}</p> : null}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {(authoredRankings.length > 0 || reviewedRankings.length > 0) ? (
        <Section tone="page" labelledBy="work-h2">
          <SectionHead id="work-h2" title="Rankings" />
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {authoredRankings.length > 0 ? (
              <div>
                <h3 className="related-heading">Written by {person.name.split(" ")[0]}</h3>
                <LinkGrid
                  columns={1}
                  items={authoredRankings.map((ranking) => ({
                    label: ranking.title,
                    href: rankingUrl(ranking),
                    meta: `Updated ${monthYear(ranking.lastReviewedAt)}`,
                  }))}
                />
              </div>
            ) : null}
            {reviewedRankings.length > 0 ? (
              <div>
                <h3 className="related-heading">Reviewed by {person.name.split(" ")[0]}</h3>
                <LinkGrid
                  columns={1}
                  items={reviewedRankings.map((ranking) => ({
                    label: ranking.title,
                    href: rankingUrl(ranking),
                    meta: `Reviewed ${monthYear(ranking.lastReviewedAt)}`,
                  }))}
                />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {(authoredGuides.length > 0 || reviewedGuides.length > 0) ? (
        <Section labelledBy="guides-h2">
          <SectionHead id="guides-h2" title="Guides" linkHref={routes.guidesIndex()} linkLabel="All guides" />
          <LinkGrid
            columns={2}
            items={[...authoredGuides, ...reviewedGuides].map((guide) => ({
              label: guide.title,
              href: routes.guide(guide.slug),
              meta: guide.category?.serviceName,
            }))}
          />
        </Section>
      ) : null}

      <Section tone="page" labelledBy="faq-h2">
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

      <Section labelledBy="meta-h2" ruleBottom={false}>
        <TransparencyBlock
          title={`About this profile`}
          rows={[
            { label: "Profile updated", value: fullDate(person.updatedAt) },
            { label: "Verified credentials", value: `${person.credentials.filter((c) => c.status === "VERIFIED").length} of ${person.credentials.length}` },
            { label: "Role", value: person.role },
            { label: "Editorial independence", value: "No commercial relationships in covered trades" },
          ]}
        />
      </Section>

      <FinalSearch title="Start with the shortlist" />
    </SiteChrome>
  );
}
