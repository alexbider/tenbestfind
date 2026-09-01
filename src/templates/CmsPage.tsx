import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../prisma/data/editorial";
import { CrumbBar, GuideBody, LinkGrid } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/ContactForm";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Icon } from "@/components/ui/Icon";
import { ArrowLink, JsonLd, Monogram, Section } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, routes } from "@/lib/urls";

const TRUST_PAGES = [
  { label: "How we rank", href: routes.howWeRank() },
  { label: "Editorial standards", href: "/editorial-standards/" },
  { label: "Advertising disclosure", href: routes.advertisingDisclosure() },
  { label: "Data sources", href: "/data-sources/" },
  { label: "Corrections", href: routes.corrections() },
  { label: "About", href: "/about/" },
];

export async function CmsPage({ slug }: { slug: string }) {
  const page = await db.page.findUnique({
    where: { slug },
    include: { faqs: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page || page.status !== "PUBLISHED") {
    await redirectIfKnown(routes.page(slug));
    notFound();
  }

  const blocks = parseJson<GuideBlock[]>(page.body, []);
  const headings = blocks.filter(
    (block): block is Extract<GuideBlock, { kind: "heading" }> => block.kind === "heading",
  );
  const faqs = page.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));

  const [team, categories, countries] = await Promise.all([
    page.slug === "editorial-team" || page.slug === "about"
      ? db.person.findMany({ where: { published: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    page.template === "sitemap"
      ? db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 20 })
      : Promise.resolve([]),
    page.template === "sitemap"
      ? db.country.findMany({
          where: { published: true },
          include: { regions: { where: { published: true }, orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <SiteChrome active="trust">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.title,
          url: absoluteUrl(routes.page(page.slug)),
          dateModified: page.updatedAt.toISOString(),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar items={[{ label: "Home", href: "/" }, { label: page.title }]} />

      <section aria-labelledby="page-h1" style={{ background: "var(--surface-page)" }}>
        <div className="shell" style={{ padding: "52px var(--gutter) 44px", maxWidth: 900 }}>
          <h1 id="page-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            {page.title}
          </h1>
          {page.excerpt ? (
            <p className="hero__lead" style={{ maxWidth: 660 }}>
              {page.excerpt}
            </p>
          ) : null}
          <p style={{ marginTop: 20, fontSize: 13.5, color: "var(--text-muted)" }}>
            Last updated {fullDate(page.updatedAt)}
          </p>
        </div>
      </section>

      {page.template === "contact" ? (
        <Section ruleTop labelledBy="contact-h2">
          <h2 id="contact-h2" className="sr-only">
            Contact routes
          </h2>
          <ContactForm />
        </Section>
      ) : null}

      {page.template === "sitemap" ? (
        <Section ruleTop labelledBy="sitemap-h2">
          <h2 id="sitemap-h2" className="h2" style={{ marginBottom: 32 }}>
            Everything on the site
          </h2>
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            <div>
              <h3 className="related-heading">Home services</h3>
              <LinkGrid
                columns={1}
                items={categories.map((category) => ({
                  label: category.name,
                  href: routes.category(category.slug),
                }))}
              />
            </div>
            <div>
              <h3 className="related-heading">Locations</h3>
              <LinkGrid
                columns={1}
                items={countries.flatMap((country) => [
                  { label: country.name, href: routes.country(country.code) },
                  ...country.regions.slice(0, 6).map((region) => ({
                    label: `${region.name}, ${country.name}`,
                    href: routes.region(country.code, region.slug),
                  })),
                ])}
              />
            </div>
            <div>
              <h3 className="related-heading">Editorial</h3>
              <LinkGrid
                columns={1}
                items={[
                  { label: "All rankings", href: routes.rankingsIndex() },
                  { label: "All guides", href: routes.guidesIndex() },
                  { label: "Editorial team", href: routes.editorialTeam() },
                  { label: "Search", href: routes.search() },
                ]}
              />
            </div>
            <div>
              <h3 className="related-heading">About and policies</h3>
              <LinkGrid columns={1} items={TRUST_PAGES} />
            </div>
          </div>
        </Section>
      ) : null}

      {page.template === "document" ? (
        <Section ruleTop labelledBy="doc-h2">
          <h2 id="doc-h2" className="sr-only">
            {page.title}
          </h2>
          <div
            className="split"
            style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 56, alignItems: "start" }}
          >
            {headings.length > 1 ? (
              <nav className="toc" aria-label="On this page">
                <p className="toc__title">On this page</p>
                <ul>
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ul>
                {page.printable ? (
                  <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
                    This page is written to print cleanly for your records.
                  </p>
                ) : null}
              </nav>
            ) : (
              <div />
            )}

            <div style={{ maxWidth: 780 }}>
              {page.noticeTitle ? (
                <div className="callout callout--brand" style={{ marginBottom: 32 }}>
                  <Icon name="info" size={20} color="var(--color-primary)" />
                  <div>
                    <p className="callout__title">{page.noticeTitle}</p>
                    <p>{page.noticeBody}</p>
                  </div>
                </div>
              ) : null}

              <GuideBody blocks={blocks} />

              {team.length > 0 ? (
                <div style={{ marginTop: 44 }}>
                  <h2 style={{ fontSize: 24, marginBottom: 20 }}>The editorial team</h2>
                  <ul style={{ display: "grid", gap: 14 }}>
                    {team.map((person) => (
                      <li key={person.id} className="card" style={{ padding: "20px 22px", display: "flex", gap: 16 }}>
                        <Monogram name={person.name} size={52} />
                        <div>
                          <h3 style={{ fontSize: 17, marginBottom: 3 }}>
                            <Link href={routes.expert(person.slug)} style={{ color: "var(--ink)" }}>
                              {person.name}
                            </Link>
                          </h3>
                          <p style={{ fontSize: 14, color: "var(--color-primary)", marginBottom: 8 }}>
                            {person.role}
                          </p>
                          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                            {person.bio?.split(". ").slice(0, 2).join(". ")}.
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {faqs.length > 0 ? (
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
      ) : null}

      <Section tone="page" labelledBy="trust-h2" ruleBottom={false}>
        <h2 id="trust-h2" className="h2" style={{ marginBottom: 24 }}>
          Related pages
        </h2>
        <LinkGrid columns={3} items={TRUST_PAGES.filter((item) => item.href !== routes.page(page.slug))} />
      </Section>
    </SiteChrome>
  );
}
