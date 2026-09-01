import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { EditorialDisclosure } from "@/components/site/disclosures";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Badge, JsonLd, Monogram, Section, SectionHead } from "@/components/ui/primitives";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Editorial team — who writes and reviews the rankings",
  description:
    "The people who research, write and review what gets published here, with their credentials and the limits of what each one covers.",
  alternates: { canonical: "/experts/" },
};

export default async function ExpertsIndexPage() {
  const people = await db.person.findMany({
    where: { published: true },
    orderBy: [{ isExpert: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { authoredRankings: true, reviewedRankings: true, authoredGuides: true } },
    },
  });

  return (
    <SiteChrome active="trust">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Editorial team",
          url: absoluteUrl(routes.expertsIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Editorial team" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            The people behind the rankings
          </h1>
          <p className="hero__lead" style={{ maxWidth: 660 }}>
            Every list is written or reviewed by someone named on this page. Each profile states what
            that person covers and, just as importantly, what they do not.
          </p>
          <div style={{ marginTop: 20 }}>
            <EditorialDisclosure />
          </div>
        </div>
      </section>

      <Section labelledBy="team-h2" ruleBottom={false}>
        <SectionHead id="team-h2" title="Editorial team" />
        <ul className="card-grid card-grid--2">
          {people.map((person) => (
            <li key={person.id} className="card card--lift person-card">
              <Monogram name={person.name} size={64} />
              <div style={{ minWidth: 0 }}>
                <h3>
                  <Link href={routes.expert(person.slug)} style={{ color: "var(--ink)" }}>
                    {person.name}
                  </Link>
                </h3>
                <p className="person-card__role">{person.role}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {person.isExpert ? <Badge tone="positive">Verified expert</Badge> : null}
                  {person.isReviewer ? <Badge tone="brand">Reviewer</Badge> : null}
                  {person.isAuthor ? <Badge tone="neutral">Author</Badge> : null}
                </div>
                <p>{person.bio?.split(". ").slice(0, 2).join(". ")}.</p>
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                  {person._count.authoredRankings} rankings written ·{" "}
                  {person._count.reviewedRankings} reviewed · {person._count.authoredGuides} guides
                </p>
                {parseList(person.specializations).length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {parseList(person.specializations)
                      .slice(0, 3)
                      .map((item) => (
                        <span key={item} className="chip" style={{ cursor: "default", fontSize: 13 }}>
                          {item}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <FinalSearch title="Start with the shortlist" />
    </SiteChrome>
  );
}
