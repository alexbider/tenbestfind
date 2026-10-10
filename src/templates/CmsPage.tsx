import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../prisma/data/editorial";
import { GuideBody } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/ContactForm";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Chevron, Crumbs, SHELL, initials } from "@/components/site/page-parts";
import {
  ArrowLink,
  FaqRow,
  HeroBackdrop,
  Kicker,
  PageProgress,
  Tile,
  autoGrid,
} from "@/components/site/trust/parts";
import { accentTail } from "@/components/ui/Accent";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, routes } from "@/lib/urls";

const TRUST_PAGES: { label: string; meta: string; href: string; icon: IconName }[] = [
  { label: "How we rank", meta: "The full methodology", href: routes.howWeRank(), icon: "scale" },
  { label: "Editorial team", meta: "Who writes and reviews", href: routes.editorialTeam(), icon: "users" },
  { label: "Advertising disclosure", meta: "How sponsorship is handled", href: routes.advertisingDisclosure(), icon: "megaphone" },
  { label: "Corrections", meta: "How we fix mistakes", href: routes.corrections(), icon: "pencil" },
  { label: "Contact", meta: "Reach the right team", href: routes.contact(), icon: "mail" },
  { label: "About", meta: "Who we are", href: routes.page("about"), icon: "info" },
];

const SECTION = { ...SHELL, padding: "48px 24px 64px" };
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  padding: "22px",
};
const DOC_H2 = { fontSize: "26px", lineHeight: "1.25", fontWeight: "700", marginBottom: "14px" };
const ASIDE_H2 = {
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  marginBottom: "12px",
};

/** Which icon sits beside the title, by the kind of page this is. */
function pageIcon(template: string, slug: string): IconName {
  if (template === "contact") return "mail";
  if (template === "sitemap") return "sitemap";
  if (slug.includes("privacy") || slug.includes("terms")) return "lock";
  if (slug.includes("advertis") || slug.includes("disclosure")) return "megaphone";
  if (slug.includes("correction")) return "pencil";
  if (slug.includes("team") || slug.includes("about")) return "users";
  return "doc";
}

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

  const related = TRUST_PAGES.filter((item) => item.href !== routes.page(page.slug)).slice(0, 4);

  return (
    <SiteChrome active="trust" skin>
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

      <div className="tr2 ut2">
        {/* ------------------------------------------------------------- hero */}
        <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <HeroBackdrop />
          <div style={{ ...SHELL, position: "relative", padding: "20px 24px 40px" }}>
            <div data-noprint="">
              <Crumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--blue-100)",
                  color: "var(--color-primary)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <Icon name={pageIcon(page.template, page.slug)} size={27} strokeWidth={1.7} />
              </span>
              <div style={{ flex: "1", minWidth: "280px", maxWidth: "760px" }}>
                <Kicker hero="1" gap="10px">
                  {page.template === "contact" ? "Contact" : page.template === "sitemap" ? "Sitemap" : "Trust and transparency"}
                </Kicker>
                <h1
                  data-in="2"
                  style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
                >
                  {page.title}
                </h1>
                {page.excerpt ? (
                  <p data-in="3" style={{ marginTop: "16px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
                    {page.excerpt}
                  </p>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: "22px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 24px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <Icon name="refresh" size={16} color="#2D74D7" strokeWidth={1.9} />
                Last updated {fullDate(page.updatedAt)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <Icon name="users" size={16} color="#2D74D7" strokeWidth={1.9} />
                Maintained by the TenBestFind editorial team
              </span>
            </div>
          </div>
        </section>
        <PageProgress />

        {/* ---------------------------------------------------------- contact */}
        {page.template === "contact" ? (
          <section style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: "40px", alignItems: "start" }}>
              <div>
                <h2 data-reveal="" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
                  {accentTail("Choose the right route", 2)}
                </h2>
                <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Each of these goes to a different team, so picking the closest match gets you a faster
                  answer.
                </p>
                <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
                  {[
                    {
                      title: "Correct something on a page",
                      text: "Wrong details, a closed business, an out-of-date credential or a duplicate entry.",
                      href: routes.corrections(),
                      icon: "pencil" as IconName,
                    },
                    {
                      title: "Claim your business",
                      text: "Owners can claim a profile to correct and maintain factual information.",
                      href: routes.claim(),
                      icon: "store" as IconName,
                    },
                    {
                      title: "Submit a business",
                      text: "Suggest a company for consideration. It does not guarantee publication.",
                      href: routes.addBusiness(),
                      icon: "plus" as IconName,
                    },
                    {
                      title: "Advertise with us",
                      text: "Labelled placements, sold separately from editorial research.",
                      href: routes.advertise(),
                      icon: "megaphone" as IconName,
                    },
                    {
                      title: "Ask about our methodology",
                      text: "How we research, what we verify and where the limits are.",
                      href: routes.howWeRank(),
                      icon: "scale" as IconName,
                    },
                  ].map((intent) => (
                    <li key={intent.href}>
                      <Link
                        data-row=""
                        href={intent.href}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "14px",
                          padding: "18px 20px",
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "16px",
                          textDecoration: "none",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Tile icon={intent.icon} size={40} iconSize={19} flex />
                        <span style={{ display: "block", minWidth: "0" }}>
                          <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "3px" }}>
                            {intent.title}
                          </span>
                          <span style={{ display: "block", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                            {intent.text}
                          </span>
                        </span>
                        <span style={{ marginLeft: "auto", display: "inline-flex", marginTop: "12px" }}>
                          <Chevron />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", boxShadow: "var(--shadow-sm)", padding: "26px" }}>
                <h2 data-reveal="" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                  {accentTail("Send us a message", 2)}
                </h2>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  We reply by email, usually within two business days.
                </p>
                <div style={{ marginBottom: "14px" }}>
                  <InfoModal
                    label="How we use contact information"
                    title="How we use contact information"
                    points={[
                      "We use what you send only to answer you",
                      "Nothing you send is sold or passed to an advertiser",
                      "A correction is checked against the source before anything changes",
                      "Ask us to delete your message and we will",
                    ]}
                    link={{ href: routes.page("privacy"), label: "Privacy policy" }}
                  >
                    One address, one purpose: replying to you.
                  </InfoModal>
                </div>
                <ContactForm />
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- sitemap */}
        {page.template === "sitemap" ? (
          <section style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={SECTION}>
              <div data-stagger="" data-ag="auto" style={autoGrid(260, "20px")}>
                {[
                  {
                    title: "Home services",
                    icon: "tools" as IconName,
                    links: categories.slice(0, 8).map((category) => ({ name: category.name, href: routes.category(category.slug) })),
                    more: "All services",
                    moreHref: routes.servicesIndex(),
                  },
                  // One card per country rather than one "Locations" card with
                  // every country's name sitting as a sibling of every other
                  // country's regions: read down that list and "Canada" was
                  // just another entry between two American states.
                  ...countries.map((country) => ({
                    title: country.name,
                    icon: "pin" as IconName,
                    links: country.regions.slice(0, 6).map((region) => ({
                      name: region.name,
                      href: routes.region(country.code, region.slug),
                    })),
                    more: `All ${country.name} ${country.regionLabel}`,
                    moreHref: routes.country(country.code),
                  })),
                  {
                    title: "Editorial",
                    icon: "book" as IconName,
                    links: [
                      { name: "All rankings", href: routes.rankingsIndex() },
                      { name: "All guides", href: routes.guidesIndex() },
                      { name: "Editorial team", href: routes.editorialTeam() },
                      { name: "Search", href: routes.search() },
                    ],
                  },
                  {
                    title: "Trust and policies",
                    icon: "shield" as IconName,
                    links: TRUST_PAGES.map((item) => ({ name: item.label, href: item.href })),
                  },
                ].map((group) => (
                  <div key={group.title} style={CARD}>
                    <h2 data-reveal="" style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "17px", fontWeight: "700", paddingBottom: "12px", marginBottom: "6px", borderBottom: "1px solid var(--border-subtle)" }}>
                      <Icon name={group.icon} size={17} color="#2D74D7" strokeWidth={1.85} />
                      {group.title}
                    </h2>
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} style={{ display: "block", padding: "9px 0", fontSize: "15px", color: "var(--text-primary)" }}>
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {group.more ? (
                      <p style={{ marginTop: "8px", paddingTop: "10px", borderTop: "1px solid var(--border-subtle)" }}>
                        <ArrowLink href={group.moreHref!} style={{ fontSize: "14px", fontWeight: "600" }}>
                          {group.more}
                        </ArrowLink>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: "20px", fontSize: "15px", color: "var(--text-secondary)" }}>
                This sitemap is for people. Search engines use our{" "}
                <a href="/sitemap.xml">XML sitemap</a>, which covers every published ranking, profile and
                guide.
              </p>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------------- document */}
        {page.template === "document" || blocks.length > 0 ? (
          <section style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              data-doc-grid=""
              style={{ ...SHELL, padding: "44px 24px 64px", display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: "44px", alignItems: "start" }}
            >
              <aside data-aside="" aria-label="On this page" style={{ position: "sticky", top: "150px", display: "grid", gap: "16px" }}>
                {headings.length > 1 ? (
                  <nav data-toc="" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "20px" }}>
                    <h2 data-reveal="" style={ASIDE_H2}>
                      {accentTail("On this page", 1)}
                    </h2>
                    <ul data-stagger="" style={{ display: "grid", gap: "2px" }}>
                      {headings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            data-on="0"
                            style={{ display: "block", padding: "8px 10px", margin: "0 -10px", borderRadius: "9px", fontSize: "14px", lineHeight: "1.45", color: "var(--text-primary)" }}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
                {/* An empty box under a heading that says Related is worse than
                    no box: it reads as something that failed to load. */}
                {related.length > 0 ? (
                  <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "20px" }}>
                    <h2 data-reveal="" style={ASIDE_H2}>
                      Related
                    </h2>
                    <ul data-stagger="" style={{ display: "grid", gap: "8px" }}>
                      {related.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-link)" }}>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </aside>

              <div style={{ maxWidth: "780px" }}>
                {headings.length > 1 ? (
                  <details
                    data-jump=""
                    style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "4px 20px", marginBottom: "28px" }}
                  >
                    <summary
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 0", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}
                    >
                      Jump to section
                      <span
                        data-fq-ico=""
                        aria-hidden="true"
                        style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "50%", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </span>
                    </summary>
                    <ul style={{ padding: "0 0 16px" }}>
                      {headings.map((heading) => (
                        <li key={heading.id}>
                          <a href={`#${heading.id}`} style={{ display: "block", padding: "9px 0", fontSize: "15px", color: "var(--text-primary)" }}>
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {page.noticeTitle ? (
                  <aside style={{ display: "flex", gap: "14px", background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: "18px", padding: "20px 22px", marginBottom: "32px" }}>
                    <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", marginTop: "2px" }}>
                      <Icon name="info" size={20} color="#2D74D7" strokeWidth={1.9} />
                    </span>
                    <span style={{ display: "block" }}>
                      <span style={{ display: "block", fontSize: "15px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "4px" }}>
                        {page.noticeTitle}
                      </span>
                      <span style={{ display: "block", fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)" }}>{page.noticeBody}</span>
                    </span>
                  </aside>
                ) : null}

                <div style={{ display: "grid", gap: "40px" }}>
                  <div data-doc-body="" style={{ display: "grid", gap: "14px" }}>
                    <GuideBody blocks={blocks} />
                  </div>

                  {team.length > 0 ? (
                    <section id="experts" aria-labelledby="experts-h2">
                      <h2 data-reveal="" id="experts-h2" style={DOC_H2}>
                        {accentTail("Our editorial team", 1)}
                      </h2>
                      <ul data-stagger="" data-ag="auto" style={autoGrid(230, "14px")}>
                        {team.map((person) => (
                          <li key={person.id} data-card="" style={{ ...CARD, borderRadius: "16px", boxShadow: "var(--shadow-xs)", padding: "20px" }}>
                            <span
                              aria-hidden="true"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "46px",
                                height: "46px",
                                borderRadius: "50%",
                                background: "var(--blue-50)",
                                border: "1px solid var(--blue-100)",
                                fontSize: "15px",
                                fontWeight: "700",
                                color: "var(--blue-900)",
                                marginBottom: "12px",
                              }}
                            >
                              {initials(person.name)}
                            </span>
                            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
                              <Link href={routes.expert(person.slug)} style={{ color: "var(--blue-900)" }}>
                                {person.name}
                              </Link>
                            </h3>
                            <p style={{ fontSize: "14px", color: "var(--color-primary)", fontWeight: "600", margin: "2px 0 8px" }}>
                              {person.role}
                            </p>
                            {person.bio ? (
                              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                                {person.bio.split(". ").slice(0, 2).join(". ")}.
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>

                <section
                  aria-labelledby="help-h2"
                  style={{ marginTop: "40px", background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}
                >
                  <h2 data-reveal="" id="help-h2" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
                    {accentTail("Still need a person?", 2)}
                  </h2>
                  <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "18px" }}>
                    If this page does not answer it, the editorial team will. Corrections are checked
                    against the source before anything changes.
                  </p>
                  <div data-stack="" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <Link
                      data-btn=""
                      href={routes.contact()}
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
                      }}
                    >
                      Contact the editorial team
                    </Link>
                    <ArrowLink href={routes.corrections()} style={{ fontSize: "15px", fontWeight: "600" }}>
                      Suggest a correction
                    </ArrowLink>
                  </div>
                </section>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------- faqs */}
        {faqs.length > 0 ? (
          <section aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div data-split="" style={{ ...SHELL, padding: "56px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "44px", alignItems: "start" }}>
              <h2
                data-reveal=""
                id="faq-h2"
                style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.06", fontWeight: "800", letterSpacing: "-0.04em" }}
              >
                {accentTail("Common questions", 1)}
              </h2>
              <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
                {faqs.map((faq) => (
                  <FaqRow key={faq.id} question={faq.question} answer={faq.answer} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------- related pages */}
        <section data-noprint="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "48px 24px" }}>
            <h2 data-reveal="" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "18px" }}>
              {accentTail("Related trust pages", 1)}
            </h2>
            <ul data-stagger="" data-ag="auto" style={autoGrid(220, "12px")}>
              {TRUST_PAGES.filter((item) => item.href !== routes.page(page.slug)).map((item) => (
                <li key={item.href}>
                  <Link
                    data-row=""
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px 18px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "14px",
                      textDecoration: "none",
                      color: "var(--blue-900)",
                    }}
                  >
                    <Tile icon={item.icon} size={36} iconSize={17} flex />
                    <span style={{ display: "block", minWidth: "0" }}>
                      <span style={{ display: "block", fontSize: "15px", fontWeight: "600" }}>{item.label}</span>
                      <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>{item.meta}</span>
                    </span>
                    <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                      <Chevron />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
