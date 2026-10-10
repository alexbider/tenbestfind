import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { EditorialDisclosure } from "@/components/site/disclosures";
import { RelatedContent } from "@/components/site/RelatedContent";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SHELL } from "@/components/site/page-parts";
import { HeroBackdrop, autoGrid, heroAccentTail } from "@/components/site/trust/parts";
import { accentTail } from "@/components/ui/Accent";
import { JsonLd, Monogram } from "@/components/ui/primitives";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { relatedForPerson } from "@/lib/related";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Who writes and reviews our rankings",
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

  const related = await relatedForPerson();

  return (
    <SiteChrome active="trust" skin>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Editorial team",
          url: absoluteUrl(routes.expertsIndex()),
        }}
      />
      <div className="tr2 ex2">
        <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Editorial team" }]} />

        <section aria-labelledby="hero-h1" data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <HeroBackdrop />
          <div style={{ ...SHELL, position: "relative", padding: "52px 24px 48px" }}>
            <div style={{ maxWidth: "840px" }}>
              <h1
                id="hero-h1"
                data-in="2"
                style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
              >
                {heroAccentTail("The people behind the rankings", 2)}
              </h1>
              <p data-in="3" style={{ marginTop: "20px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", maxWidth: "660px", textWrap: "pretty" }}>
                Every list is written or reviewed by someone named on this page. Each profile states what
                that person covers and, just as importantly, what they do not.
              </p>
              <div style={{ marginTop: "20px" }}>
                <EditorialDisclosure />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="team-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <h2 id="team-h2" data-reveal="" style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.08", fontWeight: "800", letterSpacing: "-0.035em", marginBottom: "28px" }}>
              {accentTail("Editorial team", 1)}
            </h2>
            <ul data-ag="one" style={autoGrid(420, "22px")}>
              {people.map((person) => {
                const specializations = parseList(person.specializations).slice(0, 3);
                return (
                  <li
                    key={person.id}
                    data-card=""
                    data-person=""
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "20px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "22px",
                      boxShadow: "var(--shadow-sm)",
                      padding: "24px",
                    }}
                  >
                    <Monogram name={person.name} size={64} radius={18} />
                    <div style={{ minWidth: "0", flex: "1" }}>
                      <h3 style={{ fontSize: "20px", lineHeight: "1.2", fontWeight: "800", letterSpacing: "-0.025em" }}>
                        <Link href={routes.expert(person.slug)} style={{ color: "var(--ink)" }}>
                          {person.name}
                        </Link>
                      </h3>
                      <p style={{ marginTop: "4px", fontSize: "15px", fontWeight: "600", color: "var(--color-primary)" }}>{person.role}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                        {person.isExpert ? <Pill tone="green">Verified expert</Pill> : null}
                        {person.isReviewer ? <Pill tone="blue">Reviewer</Pill> : null}
                        {person.isAuthor ? <Pill tone="gold">Author</Pill> : null}
                      </div>
                      <p style={{ marginTop: "14px", fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", textWrap: "pretty" }}>
                        {person.bio?.split(". ").slice(0, 2).join(". ")}.
                      </p>
                      <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-muted)" }}>
                        {person._count.authoredRankings} rankings written ·{" "}
                        {person._count.reviewedRankings} reviewed · {person._count.authoredGuides} guides
                      </p>
                      {specializations.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
                          {specializations.map((item) => (
                            <span
                              key={item}
                              style={{
                                display: "inline-block",
                                padding: "7px 13px",
                                borderRadius: "999px",
                                background: "var(--surface-card)",
                                border: "1px solid var(--border-subtle)",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "var(--blue-900)",
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      <RelatedContent groups={related} title="How the work is checked" />

      <FinalSearch title="Start with the shortlist" />
    </SiteChrome>
  );
}

const PILL_TONES = {
  green: { background: "var(--green-50)", color: "#178054" },
  blue: { background: "var(--blue-50)", color: "var(--blue-700)" },
  gold: { background: "var(--gold-soft)", color: "var(--gold-ink)" },
} as const;

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700",
        ...PILL_TONES[tone],
      }}
    >
      {children}
    </span>
  );
}
