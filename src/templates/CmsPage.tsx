import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../prisma/data/editorial";
import { GuideBody } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/ContactForm";
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

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 40px" }}>
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
              <Icon name={pageIcon(page.template, page.slug)} size={26} strokeWidth={1.8} />
            </span>
            <div style={{ flex: "1", minWidth: "280px", maxWidth: "760px" }}>
              <Eyebrow heroIn="1" gap="10px">
                {page.template === "contact" ? "Contact" : page.template === "sitemap" ? "Sitemap" : "Trust and transparency"}
              </Eyebrow>
              <h1
                data-hero-in="2"
                style={{ fontSize: "clamp(30px, 3.8vw, 44px)", lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
              >
                {page.title}
              </h1>
              {page.excerpt ? (
                <p data-hero-in="3" style={{ marginTop: "16px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
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

      {/* ---------------------------------------------------------- contact */}
      {page.template === "contact" ? (
        <section style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: "40px", alignItems: "start" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Choose the right route</h2>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "20px" }}>
                Each of these goes to a different team, so picking the closest match gets you a faster
                answer.
              </p>
              <ul style={{ display: "grid", gap: "12px" }}>
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
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "40px",
                          height: "40px",
                          borderRadius: "11px",
                          background: "var(--blue-50)",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Icon name={intent.icon} size={19} strokeWidth={1.8} />
                      </span>
                      <span style={{ display: "block", minWidth: "0" }}>
                        <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "3px" }}>
                          {intent.title}
                        </span>
                        <span style={{ display: "block", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                          {intent.text}
                        </span>
                      </span>
                      <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                        <Chevron />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", boxShadow: "var(--shadow-sm)", padding: "26px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>Send us a message</h2>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
              {[
                {
                  title: "Home services",
                  icon: "tools" as IconName,
                  links: categories.slice(0, 8).map((category) => ({ name: category.name, href: routes.category(category.slug) })),
                  more: "All services",
                  moreHref: routes.servicesIndex(),
                },
                {
                  title: "Locations",
                  icon: "pin" as IconName,
                  links: countries.flatMap((country) => [
                    { name: country.name, href: routes.country(country.code) },
                    ...country.regions.slice(0, 4).map((region) => ({
                      name: region.name,
                      href: routes.region(country.code, region.slug),
                    })),
                  ]),
                  more: "All locations",
                  moreHref: routes.locationsIndex(),
                },
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
                  <h2 style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "17px", fontWeight: "700", paddingBottom: "12px", marginBottom: "6px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <Icon name={group.icon} size={18} color="var(--color-primary)" strokeWidth={1.8} />
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
                      <Link href={group.moreHref!} style={{ fontSize: "14px", fontWeight: "600" }}>
                        {group.more} →
                      </Link>
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
                  <h2 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    On this page
                  </h2>
                  <ul style={{ display: "grid", gap: "2px" }}>
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          style={{ display: "block", padding: "8px 10px", margin: "0 -10px", borderRadius: "9px", fontSize: "14px", lineHeight: "1.45", color: "var(--text-primary)" }}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "20px" }}>
                <h2 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  Related
                </h2>
                <ul style={{ display: "grid", gap: "8px" }}>
                  {related.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-link)" }}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
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
                  <Icon name="info" size={20} color="var(--color-primary)" strokeWidth={1.9} />
                  <span style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: "15px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "4px" }}>
                      {page.noticeTitle}
                    </span>
                    <span style={{ display: "block", fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)" }}>{page.noticeBody}</span>
                  </span>
                </aside>
              ) : null}

              <div style={{ display: "grid", gap: "40px" }}>
                <GuideBody blocks={blocks} />

                {team.length > 0 ? (
                  <section id="experts" aria-labelledby="experts-h2">
                    <h2 id="experts-h2" style={{ fontSize: "26px", fontWeight: "700", marginBottom: "14px" }}>
                      Our editorial team
                    </h2>
                    <ul style={{ display: "grid", gap: "14px" }}>
                      {team.map((person) => (
                        <li key={person.id} style={{ ...CARD, display: "flex", gap: "16px" }}>
                          <span
                            aria-hidden="true"
                            style={{
                              flex: "0 0 52px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "52px",
                              height: "52px",
                              borderRadius: "50%",
                              background: "var(--blue-50)",
                              border: "1px solid var(--blue-100)",
                              fontSize: "16px",
                              fontWeight: "700",
                              color: "var(--blue-900)",
                            }}
                          >
                            {initials(person.name)}
                          </span>
                          <div>
                            <h3 style={{ fontSize: "17px", marginBottom: "3px", fontWeight: "700" }}>
                              <Link href={routes.expert(person.slug)} style={{ color: "var(--blue-900)" }}>
                                {person.name}
                              </Link>
                            </h3>
                            <p style={{ fontSize: "14px", color: "var(--color-primary)", fontWeight: "600", marginBottom: "8px" }}>
                              {person.role}
                            </p>
                            {person.bio ? (
                              <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>
                                {person.bio.split(". ").slice(0, 2).join(". ")}.
                              </p>
                            ) : null}
                          </div>
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
                <h2 id="help-h2" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
                  Still need a person?
                </h2>
                <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "16px" }}>
                  If this page does not answer it, the editorial team will. Corrections are checked
                  against the source before anything changes.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <Link
                    href={routes.contact()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: "46px",
                      padding: "0 20px",
                      borderRadius: "12px",
                      background: "var(--color-primary)",
                      color: "#fff",
                      fontSize: "15px",
                      fontWeight: "600",
                    }}
                  >
                    Contact the editorial team
                  </Link>
                  <Link href={routes.corrections()} style={{ fontSize: "15px", fontWeight: "600" }}>
                    Suggest a correction →
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      {faqs.length > 0 ? (
        <section aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SHELL, padding: "64px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}>
            <h2 id="faq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
              Common questions
            </h2>
            <ul style={{ display: "grid", gap: "12px" }}>
              {faqs.map((faq) => (
                <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- related pages */}
      <section data-noprint="">
        <div style={{ ...SHELL, padding: "56px 24px 72px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "18px" }}>Related trust pages</h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" }}>
            {TRUST_PAGES.filter((item) => item.href !== routes.page(page.slug)).map((item) => (
              <li key={item.href}>
                <Link
                  data-card=""
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "20px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    boxShadow: "var(--shadow-xs)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 40px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      borderRadius: "11px",
                      background: "var(--blue-50)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={item.icon} size={19} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>{item.label}</span>
                    <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>{item.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </SiteChrome>
  );
}
