import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Chevron,
  Crumbs,
  Eyebrow,
  FaqItem,
  GRID_BACKDROP,
  SHELL,
  TenOutline,
  initials,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { fullDate, monthYear, shortMonthYear } from "@/lib/format";
import { parseJson, parseList, type LinkRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const SECTION = { ...SHELL, padding: "64px 24px" };
const SECTION_H2 = { fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" };
const SPLIT_H2 = { fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" };
const PANEL = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "20px",
  padding: "26px",
};
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
  padding: "22px 24px",
};
const TILE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background: "var(--blue-50)",
  color: "var(--color-primary)",
};
const CHIP = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  fontSize: "14px",
  fontWeight: "600",
  color: "var(--blue-900)",
};

/** What an editorial contributor is responsible for, whatever their beat. */
const DUTIES = [
  "Researching and writing hiring and cost guidance in their categories",
  "Reviewing local provider rankings before they publish",
  "Verifying licensing, insurance and service-area claims against primary sources",
  "Re-checking published research on a schedule",
  "Maintaining the criteria used to evaluate their categories",
  "Handling corrections raised by readers and business owners",
];

const STATUS_SKIN: Record<string, { label: string; bg: string; border: string; color: string; icon: IconName }> = {
  VERIFIED: { label: "Verified", bg: "var(--green-50)", border: "var(--green-100)", color: "#178054", icon: "check" },
  SELF_REPORTED: { label: "Reported", bg: "var(--amber-50)", border: "#EBCE95", color: "#8A5F0B", icon: "alert" },
  EXPIRED: { label: "Expired", bg: "var(--surface-page)", border: "var(--border-strong)", color: "var(--text-secondary)", icon: "clock" },
};

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

  // The bio is one field; paragraphs are separated by blank lines.
  const bioParagraphs = (person.bio ?? "").split(/\n\s*\n/).filter(Boolean);

  const badges = [
    person.isExpert ? { label: "Verified expert", tone: "green" as const, icon: "shield" as IconName } : null,
    person.isReviewer ? { label: "Editorial reviewer", tone: "blue" as const, icon: "usercheck" as IconName } : null,
    person.isAuthor ? { label: "Staff author", tone: "amber" as const, icon: "pen" as IconName } : null,
  ].filter((badge): badge is { label: string; tone: "green" | "blue" | "amber"; icon: IconName } => badge !== null);

  const TONE = {
    green: { bg: "var(--green-50)", border: "var(--green-100)", color: "#178054" },
    blue: { bg: "var(--blue-50)", border: "var(--blue-100)", color: "var(--blue-800)" },
    amber: { bg: "var(--amber-50)", border: "#EBCE95", color: "#8A5F0B" },
  };

  const reviewedItems = [
    ...reviewedRankings.map((entry) => ({
      id: entry.id,
      type: "Ranking",
      title: entry.title,
      meta: `${entry.companiesReviewed} companies evaluated · Reviewed ${monthYear(entry.lastReviewedAt ?? entry.publishedAt)}`,
      cta: "View ranking",
      href: rankingUrl(entry),
    })),
    ...reviewedGuides.map((guide) => ({
      id: guide.id,
      type: guide.type === "COST" ? "Cost guide" : "Guide",
      title: guide.title,
      meta: `${guide.category?.serviceName ?? "Home services"} · Reviewed ${monthYear(guide.reviewedAt ?? guide.publishedAt)}`,
      cta: "View guide",
      href: routes.guide(guide.slug),
    })),
  ];

  // Everything this person touched, newest first, whichever role they held.
  const recent = [
    ...authoredGuides.map((guide) => ({
      id: `ga-${guide.id}`,
      title: `Wrote ${guide.title}`,
      at: guide.reviewedAt ?? guide.publishedAt,
      href: routes.guide(guide.slug),
      icon: "pen" as IconName,
    })),
    ...reviewedGuides.map((guide) => ({
      id: `gr-${guide.id}`,
      title: `Reviewed ${guide.title}`,
      at: guide.reviewedAt ?? guide.publishedAt,
      href: routes.guide(guide.slug),
      icon: "shield" as IconName,
    })),
    ...authoredRankings.map((entry) => ({
      id: `ra-${entry.id}`,
      title: `Wrote ${entry.title}`,
      at: entry.lastReviewedAt ?? entry.publishedAt,
      href: rankingUrl(entry),
      icon: "pen" as IconName,
    })),
    ...reviewedRankings.map((entry) => ({
      id: `rr-${entry.id}`,
      title: `Reviewed ${entry.title}`,
      at: entry.lastReviewedAt ?? entry.publishedAt,
      href: rankingUrl(entry),
      icon: "shield" as IconName,
    })),
  ]
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    .slice(0, 5);

  const glance: { label: string; value: string; icon: IconName }[] = [
    { label: "Role", value: person.role, icon: "clipboard" },
    ...(person.yearsExperience
      ? [{ label: "Experience", value: `${person.yearsExperience} years in the trade`, icon: "briefcase" as IconName }]
      : []),
    { label: "Guides written", value: String(authoredGuides.length), icon: "pen" },
    { label: "Items reviewed", value: String(reviewedItems.length), icon: "shield" },
    ...(specializations.length > 0
      ? [{ label: "Categories covered", value: String(specializations.length), icon: "layers" as IconName }]
      : []),
    ...(markets.length > 0 ? [{ label: "Markets covered", value: String(markets.length), icon: "pin" as IconName }] : []),
  ];

  const faqs = [
    {
      id: "topics",
      question: `What topics does ${person.name} cover?`,
      answer:
        specializations.length > 0
          ? `${specializations.join(", ")}. ${person.limits ?? "Anything outside those areas is written and reviewed by someone else."}`
          : (person.limits ??
            "Their beat is set by the editorial team, and anything outside it is written and reviewed by someone else."),
    },
    {
      id: "role",
      question: `What does ${person.name} do at TenBestFind?`,
      answer: `${person.role}. That means writing guidance in their categories, reviewing rankings before they publish, and re-checking published research on a schedule.`,
    },
    {
      id: "paid",
      question: "Is their work influenced by advertisers?",
      answer:
        "No. No contributor's compensation is tied to which businesses appear in a ranking, and sponsored relationships never influence editorial conclusions.",
    },
    {
      id: "contact",
      question: "How do I report something wrong on this profile?",
      answer:
        "Use the corrections form or contact the editorial team. We check the report against the source before changing anything, and the page records when it changed.",
    },
  ];

  const meta: { label: string; value: string; icon: IconName }[] = [
    { label: "Profile created", value: monthYear(person.createdAt), icon: "calendar" },
    { label: "Last reviewed", value: monthYear(person.updatedAt), icon: "shield" },
    { label: "Guides written", value: String(authoredGuides.length), icon: "pen" },
    { label: "Rankings reviewed", value: String(reviewedRankings.length), icon: "usercheck" },
    { label: "Credentials listed", value: String(person.credentials.length), icon: "award" },
    { label: "Editorial team", value: "TenBestFind home services desk", icon: "users" },
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
      <FaqJsonLd faqs={faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }))} />

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 48px" }}>
          <Crumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Experts", href: routes.expertsIndex() },
              { label: person.name },
            ]}
          />

          <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.32fr) minmax(0, 0.68fr)", gap: "44px", alignItems: "start" }}>
            <div style={{ display: "grid", gap: "18px" }}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  maxWidth: "240px",
                  aspectRatio: "1",
                  borderRadius: "24px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-md)",
                  fontSize: "54px",
                  fontWeight: "700",
                  letterSpacing: "var(--ls-tighter)",
                  color: "var(--blue-900)",
                  overflow: "hidden",
                }}
              >
                {person.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials(person.name)
                )}
              </span>

              {badges.length > 0 ? (
                <ul style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                  {badges.map((badge) => (
                    <li
                      key={badge.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "9px 14px",
                        borderRadius: "999px",
                        background: TONE[badge.tone].bg,
                        border: `1px solid ${TONE[badge.tone].border}`,
                        fontSize: "13px",
                        fontWeight: "700",
                        color: TONE[badge.tone].color,
                      }}
                    >
                      <Icon name={badge.icon} size={15} strokeWidth={2} />
                      {badge.label}
                    </li>
                  ))}
                </ul>
              ) : null}

              <span style={{ justifySelf: "start" }}>
                <InfoModal
                  label="What does verified expert mean?"
                  title="What verified expert means"
                  points={[
                    "Identity and current role are confirmed before the profile publishes",
                    "Listed credentials are checked against the body that issued them",
                    "Anything we could not confirm is labelled as reported",
                    "The badge describes verification, not endorsement of any company",
                  ]}
                  link={{ href: routes.howWeRank(), label: "How we rank" }}
                >
                  A badge on this page says how far a claim was checked, and nothing more.
                </InfoModal>
              </span>

              {links.length > 0 ? (
                <div style={{ paddingTop: "18px", borderTop: "1px solid var(--border-subtle)" }}>
                  <h2 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    Professional profiles
                  </h2>
                  <ul style={{ display: "grid", gap: "8px" }}>
                    {links.map((link) => (
                      <li key={link.url}>
                        <a
                          data-row=""
                          href={link.url}
                          rel="me noopener"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            margin: "0 -12px",
                            borderRadius: "10px",
                            fontSize: "15px",
                            color: "var(--text-primary)",
                            textDecoration: "none",
                          }}
                        >
                          <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", color: "var(--color-primary)" }}>
                            <Icon name="link" size={16} strokeWidth={1.9} />
                          </span>
                          {link.label}
                          <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                            <Chevron />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div>
              <Eyebrow heroIn="1" gap="14px">
                TenBestFind expert
              </Eyebrow>
              <h1 data-hero-in="2" style={{ fontSize: "clamp(34px, 4.4vw, 50px)", lineHeight: "1.06", letterSpacing: "-0.04em", fontWeight: "800" }}>
                {person.name}
              </h1>
              <p data-hero-in="3" style={{ marginTop: "12px", fontSize: "19px", fontWeight: "600", color: "var(--color-primary)" }}>
                {person.role}
              </p>
              {bioParagraphs[0] ? (
                <p style={{ marginTop: "16px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", maxWidth: "660px", textWrap: "pretty" }}>
                  {bioParagraphs[0]}
                </p>
              ) : null}

              {specializations.length > 0 ? (
                <div style={{ marginTop: "20px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  {specializations.map((item) => (
                    <span key={item} style={CHIP}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <dl style={{ marginTop: "28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                {glance.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "14px",
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <span aria-hidden="true" style={{ ...TILE, flex: "0 0 34px", width: "34px", height: "34px", borderRadius: "10px" }}>
                      <Icon name={item.icon} size={17} strokeWidth={1.8} />
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <dt style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "3px" }}>
                        {item.label}
                      </dt>
                      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", lineHeight: "1.4", color: "var(--blue-900)" }}>{item.value}</dd>
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ about */}
      {bioParagraphs.length > 0 || person.limits ? (
        <section id="about" aria-labelledby="about-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "48px", alignItems: "start" }}>
            <h2 id="about-h2" style={SPLIT_H2}>
              About {person.name}
            </h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {bioParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} style={{ fontSize: "17px", lineHeight: "1.8", color: "var(--text-primary)" }}>
                  {paragraph}
                </p>
              ))}
              {person.limits ? (
                <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{person.limits}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- expertise */}
      {specializations.length > 0 ? (
        <section id="expertise" aria-labelledby="exp-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <h2 id="exp-h2" style={{ ...SPLIT_H2, marginBottom: "26px" }}>
              Areas of expertise
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {specializations.map((item) => (
                <li key={item} data-card="" style={{ ...CARD, borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span aria-hidden="true" style={{ ...TILE, width: "42px", height: "42px", borderRadius: "12px" }}>
                    <Icon name="tools" size={20} strokeWidth={1.8} />
                  </span>
                  <h3 style={{ fontSize: "17px", fontWeight: "700" }}>{item}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- experience */}
      {person.experience.length > 0 || person.credentials.length > 0 ? (
        <section id="experience" aria-labelledby="xp-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}>
            <div>
              <h2 id="xp-h2" style={{ ...SECTION_H2, marginBottom: "24px" }}>
                Professional experience
              </h2>
              <ol style={{ display: "grid", gap: "0" }}>
                {person.experience.map((entry) => (
                  <li key={entry.id} style={{ display: "flex", gap: "18px", paddingBottom: "26px" }}>
                    <span aria-hidden="true" style={{ flex: "0 0 38px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <span style={{ ...TILE, width: "38px", height: "38px", flexShrink: 0 }}>
                        <Icon name="briefcase" size={18} strokeWidth={1.8} />
                      </span>
                      <span style={{ flex: "1", width: "2px", borderRadius: "2px", background: "var(--border-subtle)" }} />
                    </span>
                    <span style={{ display: "block", paddingTop: "2px" }}>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--color-primary)", marginBottom: "4px" }}>
                        {entry.startedAt ? shortMonthYear(entry.startedAt) : ""}
                        {entry.startedAt ? " to " : ""}
                        {entry.endedAt ? shortMonthYear(entry.endedAt) : "present"}
                      </span>
                      <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "5px" }}>
                        {entry.role}, {entry.org}
                      </h3>
                      {entry.summary ? (
                        <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{entry.summary}</p>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {person.credentials.length > 0 ? (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={PANEL}>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Credentials and qualifications</h2>
                    <InfoModal
                      label="Credential verification"
                      title="Credential verification"
                      points={[
                        "A credential is checked against the body that issued it",
                        "The date of that check is recorded on the profile",
                        "What we could not confirm is labelled as reported",
                        "An expired credential stays visible with its dates",
                      ]}
                      link={{ href: routes.howWeRank(), label: "How we rank" }}
                    >
                      Labels here say how far a claim was checked.
                    </InfoModal>
                  </div>
                  <ul style={{ display: "grid", gap: "14px" }}>
                    {person.credentials.map((credential) => {
                      const skin = STATUS_SKIN[credential.status] ?? STATUS_SKIN.SELF_REPORTED;
                      return (
                        <li
                          key={credential.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "14px",
                            paddingBottom: "14px",
                            borderBottom: "1px solid var(--border-subtle)",
                          }}
                        >
                          <span style={{ display: "block", minWidth: "0" }}>
                            <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)", marginBottom: "2px" }}>
                              {credential.label}
                            </span>
                            <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                              {[credential.issuer, credential.checkedAt ? `Checked ${monthYear(credential.checkedAt)}` : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              background: skin.bg,
                              border: `1px solid ${skin.border}`,
                              fontSize: "12px",
                              fontWeight: "700",
                              color: skin.color,
                            }}
                          >
                            <Icon name={skin.icon} size={12} strokeWidth={2.4} />
                            {skin.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- role */}
      <section id="role" aria-labelledby="role-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "48px", alignItems: "start" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "#E8B551", marginBottom: "14px" }}>
              Editorial role
            </p>
            <h2 id="role-h2" style={{ ...SPLIT_H2, color: "#fff", marginBottom: "16px" }}>
              Role at TenBestFind
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.82)", marginBottom: "20px" }}>
              {person.name} is responsible for {specializations.length > 0 ? specializations.join(", ").toLowerCase() : "their category"} coverage:
              writing hiring and cost guidance, reviewing local rankings before publication, and
              re-checking published research on a schedule.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
              <Link
                href={routes.howWeRank()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "48px",
                  padding: "0 22px",
                  borderRadius: "14px",
                  background: "#fff",
                  color: "var(--blue-900)",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                Read our methodology
              </Link>
              <InfoModal
                label="How expert review works"
                title="How expert review works"
                points={[
                  "A reviewer checks technical claims against their own trade experience",
                  "Review is recorded on the page with the reviewer named",
                  "Review does not imply endorsement of any company named",
                  "A reviewer never sets a ranking position",
                ]}
                link={{ href: routes.editorialTeam(), label: "Editorial team" }}
              >
                Reviewers check the work. Editors remain accountable for it.
              </InfoModal>
            </div>
          </div>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {DUTIES.map((duty) => (
              <li
                key={duty}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "16px",
                  padding: "20px 22px",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E8B551" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.88)" }}>{duty}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- written */}
      {authoredGuides.length > 0 ? (
        <section id="written" aria-labelledby="wr-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "24px" }}>
              <h2 id="wr-h2" style={SECTION_H2}>
                Guides written by {person.name}
              </h2>
              <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All guides →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
              {authoredGuides.map((guide) => (
                <li key={guide.id} data-card="" style={{ ...CARD, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span aria-hidden="true" style={{ ...TILE, width: "40px", height: "40px" }}>
                    <Icon name="book" size={19} strokeWidth={1.8} />
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    {guide.category?.serviceName ?? "Guides"}
                  </span>
                  <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700" }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  {guide.excerpt ? (
                    <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{guide.excerpt}</p>
                  ) : null}
                  <span style={{ marginTop: "auto", paddingTop: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    Updated {shortMonthYear(guide.reviewedAt ?? guide.publishedAt)} · {guide.readingMinutes} min read
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- reviewed */}
      {reviewedItems.length > 0 ? (
        <section id="reviewed" aria-labelledby="rv-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "24px" }}>
              <h2 id="rv-h2" style={SECTION_H2}>
                Content reviewed by {person.name}
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All rankings →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {reviewedItems.map((item) => (
                <li key={item.id} data-card="" style={{ ...CARD, display: "flex", gap: "16px" }}>
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
                      background: "var(--green-50)",
                      border: "1px solid var(--green-100)",
                      color: "#178054",
                    }}
                  >
                    <Icon name="shield" size={20} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block", minWidth: "0" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "#178054", marginBottom: "6px" }}>
                      {item.type}
                    </span>
                    <h3 style={{ fontSize: "17px", lineHeight: "1.3", fontWeight: "700", marginBottom: "6px" }}>
                      <Link href={item.href} style={{ color: "var(--blue-900)" }}>
                        {item.title}
                      </Link>
                    </h3>
                    <span style={{ display: "block", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>{item.meta}</span>
                    <Link href={item.href} style={{ fontSize: "14px", fontWeight: "600" }}>
                      {item.cta} →
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- contributions */}
      {recent.length > 0 ? (
        <section id="contributions" aria-labelledby="con-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "start" }}>
            <div>
              <h2 id="con-h2" style={{ ...SECTION_H2, marginBottom: "20px" }}>
                Recent contributions
              </h2>
              <ul style={{ borderTop: "1px solid var(--border-subtle)" }}>
                {recent.map((item) => (
                  <li key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <Link
                      data-row=""
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 14px",
                        margin: "0 -14px",
                        borderRadius: "12px",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        flexWrap: "wrap",
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
                          background: "var(--surface-page)",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Icon name={item.icon} size={16} strokeWidth={1.8} />
                      </span>
                      <span style={{ flex: "1", minWidth: "180px", fontSize: "16px", fontWeight: "600", color: "var(--blue-900)" }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{monthYear(item.at)}</span>
                      <Chevron size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {markets.length > 0 ? (
              <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
                <div style={{ ...CARD, borderRadius: "18px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    Markets covered
                  </h3>
                  <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {markets.map((market) => (
                      <li
                        key={market}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "7px 13px",
                          borderRadius: "999px",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "14px",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Icon name="pin" size={14} color="var(--color-primary)" strokeWidth={1.9} />
                        {market}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------- independence */}
      <section id="independence" aria-labelledby="ind-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "56px 24px" }}>
          <div
            data-split=""
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: "40px",
              alignItems: "center",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <div>
              <h2 id="ind-h2" style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "22px", fontWeight: "700", marginBottom: "12px" }}>
                <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "11px", background: "var(--green-50)", color: "#178054", flexShrink: 0 }}>
                  <Icon name="shield" size={20} strokeWidth={1.9} />
                </span>
                Editorial independence
              </h2>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
                TenBestFind experts and reviewers contribute under our published editorial standards.
                No contributor&rsquo;s compensation is tied to which businesses appear in a ranking, and
                sponsored relationships never influence editorial conclusions.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <Link
                href={routes.editorialTeam()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "48px",
                  padding: "0 22px",
                  borderRadius: "14px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                Read our editorial standards
              </Link>
              <InfoModal
                label="Editorial relationship"
                title="Editorial relationship"
                points={[
                  "Contributors are paid for their work, never for an outcome",
                  "No contributor holds a commercial interest in a ranked business",
                  "Any conflict is declared and the contributor steps back from that list",
                  "Sponsorship is handled by a separate team entirely",
                ]}
                link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
              >
                What a contributor is paid for, and what they are not.
              </InfoModal>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="faq-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}>
          <h2 id="faq-h2" style={SPLIT_H2}>
            About {person.name}
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------- transparency */}
      <section id="transparency" aria-labelledby="trans-h2">
        <div style={{ ...SHELL, padding: "56px 24px 72px" }}>
          <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "30px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
              <h2 id="trans-h2" style={{ fontSize: "21px", fontWeight: "700" }}>
                About this expert profile
              </h2>
              <InfoModal
                label="Professional disclosure"
                title="Professional disclosure"
                points={[
                  "Roles, dates and credentials are confirmed before the profile publishes",
                  "Anything reported and not confirmed carries a label saying so",
                  "The profile records when it was last reviewed",
                  "Corrections are made by a person and dated on the page",
                ]}
                link={{ href: routes.corrections(), label: "Corrections policy" }}
              >
                What is on this page, and how far each part of it was checked.
              </InfoModal>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px 32px", margin: "0" }}>
              {meta.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
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
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={item.icon} size={17} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block" }}>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>{item.label}</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{item.value}</dd>
                  </span>
                </div>
              ))}
            </dl>
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>Is something incorrect?</span>
              <Link
                href={routes.corrections()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "46px",
                  padding: "0 20px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border-strong)",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                }}
              >
                <Icon name="pencil" size={16} strokeWidth={2} />
                Suggest an update
              </Link>
              <Link href={routes.contact()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Contact the editorial team
              </Link>
            </div>
            <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Last reviewed {fullDate(person.updatedAt)}.
            </p>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
