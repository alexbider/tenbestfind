import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Crumbs,
  Eyebrow,
  FaqItem,
  GRID_BACKDROP,
  SHELL,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { fullDate, monthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "How we rank — the full methodology",
  description:
    "The criteria behind every TenBestFind ranking, what we verify and what we cannot, how sponsorship works, and why a high rating does not automatically rank higher.",
  alternates: { canonical: "/how-we-rank/" },
};

/* ------------------------------------------------------------ the content */

const VERSION = "1.2";
const PUBLISHED = "February 2026";
const UPDATED = "2026-08-14";

const TOC = [
  { name: "Process", href: "#process" },
  { name: "What we look at", href: "#factors" },
  { name: "By category", href: "#category" },
  { name: "Google reviews", href: "#reviews" },
  { name: "Verification", href: "#verification" },
  { name: "Local relevance", href: "#local" },
  { name: "Qualification", href: "#qualify" },
  { name: "Ranking order", href: "#order" },
  { name: "Sponsorship", href: "#sponsorship" },
  { name: "Updates", href: "#updates" },
  { name: "Human review", href: "#human" },
  { name: "Example", href: "#example" },
  { name: "FAQs", href: "#faqs" },
];

const STEPS: { n: string; title: string; text: string; icon: IconName }[] = [
  { n: "01", title: "Discover", text: "Identify established businesses that genuinely serve the location being ranked.", icon: "search" },
  { n: "02", title: "Verify", text: "Check business information, services, coverage and credentials against available records.", icon: "shield" },
  { n: "03", title: "Evaluate", text: "Compare reputation, experience, service range and customer feedback against category criteria.", icon: "scale" },
  { n: "04", title: "Rank", text: "Order the businesses that perform strongest across the full evaluation, not one metric.", icon: "chart" },
  { n: "05", title: "Review", text: "An editor checks the list, its rationale and every sponsorship label before publication.", icon: "usercheck" },
  { n: "06", title: "Update", text: "Revisit the ranking as business information and market conditions change.", icon: "refresh" },
];

type Weight = "high" | "moderate" | "supporting";

const FACTORS: { title: string; text: string; icon: IconName; weight: Weight }[] = [
  { title: "Local presence", text: "Whether the company genuinely operates in or serves the target market.", icon: "pin", weight: "high" },
  { title: "Reputation", text: "Review volume, consistency over time, complaint patterns and how issues are handled.", icon: "star", weight: "high" },
  { title: "Credentials", text: "Licensing, certifications and insurance where the trade requires them.", icon: "award", weight: "high" },
  { title: "Experience", text: "Years operating and relevant recent project experience in this category.", icon: "briefcase", weight: "moderate" },
  { title: "Services", text: "Breadth and relevance of what the company actually takes on in this category.", icon: "tools", weight: "moderate" },
  { title: "Responsiveness", text: "How quickly and how consistently a homeowner gets an answer.", icon: "clock", weight: "moderate" },
  { title: "Transparency", text: "How clearly pricing, scope and warranty terms are set out before work starts.", icon: "eye", weight: "moderate" },
  { title: "Warranty terms", text: "What is covered, for how long, and whether it is in writing.", icon: "doc", weight: "supporting" },
  { title: "Business stability", text: "Signs the company will still be there when a warranty claim arrives.", icon: "store", weight: "supporting" },
];

const WEIGHT_SKIN: Record<Weight, { label: string; bg: string; border: string; color: string }> = {
  high: { label: "High importance", bg: "var(--amber-50)", border: "#EBCE95", color: "#8A5F0B" },
  moderate: { label: "Moderate", bg: "var(--blue-50)", border: "var(--blue-100)", color: "var(--blue-800)" },
  supporting: { label: "Supporting", bg: "var(--surface-page)", border: "var(--border-strong)", color: "var(--text-secondary)" },
};

const CATEGORY_CRITERIA: { title: string; icon: IconName; items: string[] }[] = [
  {
    title: "Roofing",
    icon: "house",
    items: [
      "Insurance and registration status",
      "Manufacturer certifications",
      "Storm and hail experience",
      "Written warranty terms",
      "Documented local project history",
    ],
  },
  {
    title: "Moving",
    icon: "truck",
    items: [
      "Operating authority and licensing",
      "Cargo and liability insurance",
      "Service area and interstate scope",
      "Damage claim handling",
      "Estimate transparency, binding or not",
    ],
  },
  {
    title: "HVAC",
    icon: "wind",
    items: [
      "Technician qualifications",
      "Emergency availability",
      "Equipment and brand expertise",
      "System sizing practice",
      "Labour and equipment warranties",
    ],
  },
];

const FEEDBACK = [
  "Consistency of feedback over several years, not a recent burst",
  "Recency, so an old reputation does not carry a current ranking",
  "Repeated positive themes such as cleanup, scheduling or communication",
  "Repeated complaints, especially about billing or unfinished work",
  "How the business responds to criticism where responses are public",
  "Unusual patterns that suggest review activity is not organic",
];

const STATUSES: { label: string; text: string; tone: "green" | "amber" | "blue" | "plain"; icon: IconName }[] = [
  { label: "Verified", text: "Checked against the issuing body, with the date recorded.", tone: "green", icon: "check" },
  { label: "Reported by business", text: "Provided by the company and not independently confirmed.", tone: "amber", icon: "alert" },
  { label: "Pending verification", text: "Submitted and in our queue for checking.", tone: "blue", icon: "clock" },
  { label: "Unable to verify", text: "No public record found; shown as unconfirmed rather than removed.", tone: "plain", icon: "alert" },
  { label: "Expired", text: "Was valid previously and has lapsed, with the date range shown.", tone: "plain", icon: "clock" },
];

const TONE: Record<"green" | "amber" | "blue" | "plain", { bg: string; border: string; color: string }> = {
  green: { bg: "var(--green-50)", border: "var(--green-100)", color: "#178054" },
  amber: { bg: "var(--amber-50)", border: "#EBCE95", color: "#8A5F0B" },
  blue: { bg: "var(--blue-50)", border: "var(--blue-100)", color: "var(--blue-800)" },
  plain: { bg: "var(--surface-page)", border: "var(--border-strong)", color: "var(--text-secondary)" },
};

const CHECKS = [
  "Business name",
  "Address",
  "Service area",
  "Website",
  "Phone",
  "Category",
  "Years in business",
  "Ownership",
  "Hours",
  "Services offered",
];

const DISCOVERY = [
  "Search and local market research",
  "Google Business Profiles",
  "Industry directories",
  "Professional associations",
  "Licensing databases",
  "User recommendations",
  "Business submissions",
  "Editorial discovery",
];

const MINIMUMS = [
  "Actively trading at the time of research",
  "Genuinely serves the location being ranked",
  "Offers services relevant to the category",
  "Business information can be verified from at least one primary source",
  "Enough reputation data exists to evaluate meaningfully",
  "No unresolved trust concerns surfaced during research",
];

const EXCLUSIONS = [
  "Does not meaningfully serve the target market",
  "Insufficient information to evaluate",
  "Business appears inactive or closed",
  "Licensing status we could not confirm where the trade requires it",
  "Business information that conflicts across sources",
  "Significant unresolved reputation concerns",
  "Duplicate entity already represented in the list",
  "Category relevance too thin for the ranking",
];

const LABELS = [
  { label: "Best Overall", text: "Strongest across the full evaluation for that market." },
  { label: "Best for Replacement", text: "Depth of experience and documentation in that specific type of work." },
  { label: "Best for Emergency", text: "Verified after-hours coverage and consistent response feedback." },
  { label: "Best for Value", text: "Pricing transparency and scope relative to the local median, never lowest price alone." },
];

const BADGES: { label: string; text: string; icon: IconName; tone: "green" | "amber" | "blue" | "plain" }[] = [
  {
    label: "Top 10 Winner",
    text: "Editorial ranking status. The company currently holds a position in a published TenBestFind list.",
    icon: "award",
    tone: "amber",
  },
  {
    label: "TenBestFind Reviewed",
    text: "Editorial research status. Our team has researched and reviewed this business.",
    icon: "search",
    tone: "blue",
  },
  {
    label: "Verified Business",
    text: "Verification status. Key business information or ownership was confirmed against a primary source.",
    icon: "shield",
    tone: "green",
  },
  {
    label: "Featured Partner",
    text: "Commercial relationship only. It carries no editorial weight and never earns a ranking position.",
    icon: "megaphone",
    tone: "plain",
  },
];

const TRIGGERS = [
  "Business information changes, such as ownership or service area",
  "Review volume or rating moves materially",
  "Credentials lapse, renew or change status",
  "A ranked business closes or merges",
  "New qualifying competitors enter the market",
  "The methodology itself is updated",
  "A significant new reputation issue surfaces",
];

const FRESHNESS: { label: string; tone: "green" | "amber" | "blue"; icon: IconName }[] = [
  { label: "Current", tone: "green", icon: "check" },
  { label: "Review due", tone: "amber", icon: "clock" },
  { label: "Under review", tone: "blue", icon: "refresh" },
];

const VERSIONS = [
  {
    version: "v1.2",
    date: "August 2026",
    text: "Updated review-recency weighting, formalised credential status labels and added freshness labels to ranking pages.",
  },
  {
    version: "v1.1",
    date: "July 2026",
    text: "Added explicit separation between sponsored placements and editorial lists, and defined the four badge types.",
  },
  {
    version: "v1.0",
    date: "February 2026",
    text: "First published methodology covering discovery, verification, evaluation, ranking and review.",
  },
];

const EDITOR_CHECKS = [
  "Business identity and that entries are not duplicates",
  "Service relevance to the category being ranked",
  "Local coverage claims against evidence",
  "Key credentials and their status labels",
  "Reputation signals and any contradictions",
  "The written rationale for each position",
  "Every sponsorship label on the page",
  "Factual consistency with linked profiles and guides",
];

const WALKTHROUGH = [
  { factor: "Local coverage", finding: "Verified work across the county and northern suburbs, not a mailing address alone.", verdict: "Confirmed" },
  { factor: "Reputation", finding: "Consistent feedback over several years, no recurring billing complaints.", verdict: "Confirmed" },
  { factor: "Experience", finding: "18 years operating, with recent comparable replacements.", verdict: "Confirmed" },
  { factor: "Insurance", finding: "Current liability certificate on file, expiry recorded.", verdict: "Verified" },
  { factor: "Service breadth", finding: "Repair through full replacement, plus storm response.", verdict: "Confirmed" },
  { factor: "Warranty", finding: "Written ten-year workmanship terms, separate from the material warranty.", verdict: "Confirmed" },
  { factor: "Pricing", finding: "Quotes above the local median, itemised and consistent.", verdict: "Noted" },
  { factor: "Scheduling", finding: "Slower response in storm season, acknowledged by the company.", verdict: "Noted" },
];

const PARTICIPATE: { title: string; text: string; cta: string; href: string; icon: IconName }[] = [
  {
    title: "Claim a business profile",
    text: "Owners can claim a profile to correct and maintain factual information. Claiming does not affect ranking position.",
    cta: "Learn about claiming",
    href: routes.claim(),
    icon: "store",
  },
  {
    title: "Submit a business",
    text: "Anyone can suggest a business for consideration. Submission does not guarantee publication, verification or a position.",
    cta: "Submit a business",
    href: routes.addBusiness(),
    icon: "pencil",
  },
  {
    title: "Report an error",
    text: "Tell us about incorrect details, closed businesses, changed services, outdated credentials or duplicate entries.",
    cta: "Suggest a correction",
    href: routes.corrections(),
    icon: "flag",
  },
  {
    title: "Removal requests",
    text: "A business may be removed after closure, loss of eligibility, material change or a verification issue we cannot resolve.",
    cta: "Contact the editorial team",
    href: routes.contact(),
    icon: "doc",
  },
];

const TRUST_LINKS: { name: string; meta: string; href: string; icon: IconName }[] = [
  { name: "Editorial standards", meta: "How we write and review", href: routes.editorialTeam(), icon: "clipboard" },
  { name: "Advertising disclosure", meta: "How sponsorship is handled", href: routes.advertisingDisclosure(), icon: "megaphone" },
  { name: "Corrections policy", meta: "How we fix what we get wrong", href: routes.corrections(), icon: "pencil" },
  { name: "Expert review", meta: "Who reviews our research", href: routes.expertsIndex(), icon: "usercheck" },
  { name: "About TenBestFind", meta: "Who we are", href: routes.page("about"), icon: "users" },
];

const FAQS = [
  {
    id: "pay",
    question: "Can a business pay to rank number one?",
    answer:
      "No. Editorial positions are not for sale. Sponsored placements are labelled and sit outside the ranked list, and payment cannot create or improve a position.",
  },
  {
    id: "google",
    question: "Does the company with the highest Google rating always rank first?",
    answer:
      "No. Google data is one reputation signal weighed alongside credentials, experience, service range, local relevance and transparency. A slightly lower rating can still rank higher on the full evaluation.",
  },
  {
    id: "often",
    question: "How often are rankings updated?",
    answer:
      "Every ranking carries its own last-reviewed date and is revisited on a schedule, more often in storm-driven categories. Material changes to a listed business can trigger an earlier review.",
  },
  {
    id: "removal",
    question: "Can businesses request removal?",
    answer:
      "Yes. Owners can contact the editorial team, and we remove listings after closure, loss of eligibility or a verification issue we cannot resolve. We also remove entries we can no longer support with evidence.",
  },
  {
    id: "verify",
    question: "How does TenBestFind verify credentials?",
    answer:
      "Against the issuing body or an official public record wherever one exists. Where no register exists, or where we could not confirm a claim, the page says so rather than implying a licence.",
  },
  {
    id: "ai",
    question: "Is any of this decided by a machine?",
    answer:
      "No ranking position is set by an automated system without editorial review. Tools help organise public data and flag inconsistencies; an editor decides and is named on the page.",
  },
];

/* ------------------------------------------------------------- the layout */

const SECTION = { ...SHELL, padding: "64px 24px" };
const SECTION_H2 = { fontSize: "clamp(26px, 3vw, 36px)", fontWeight: "700" };
const SPLIT_H2 = { fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" };
const LEAD = { fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)" };
const PANEL = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "20px",
  padding: "26px",
};
const TILE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "var(--blue-50)",
  color: "var(--color-primary)",
};
const TICK_ITEM = { display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" };

function Tick({ color = "#178054" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Pill({
  tone,
  icon,
  children,
  minWidth,
}: {
  tone: "green" | "amber" | "blue" | "plain";
  icon?: IconName;
  children: React.ReactNode;
  minWidth?: string;
}) {
  const skin = TONE[tone];
  return (
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
        minWidth,
      }}
    >
      {icon ? <Icon name={icon} size={12} strokeWidth={2.4} /> : null}
      {children}
    </span>
  );
}

export default async function HowWeRankPage() {
  const [rankingCount, reviewerCount] = await Promise.all([
    db.ranking.count({ where: { status: "PUBLISHED" } }),
    db.person.count({ where: { published: true, isReviewer: true } }),
  ]);

  const meta = [
    { icon: "doc" as IconName, label: "Current version", value: VERSION },
    { icon: "calendar" as IconName, label: "Originally published", value: PUBLISHED },
    { icon: "shield" as IconName, label: "Last reviewed", value: monthYear(UPDATED) },
    { icon: "refresh" as IconName, label: "Last updated", value: fullDate(UPDATED) },
    { icon: "users" as IconName, label: "Reviewed by", value: "TenBestFind editorial team" },
    {
      icon: "usercheck" as IconName,
      label: "Expert contributors",
      value: `${reviewerCount} category ${reviewerCount === 1 ? "reviewer" : "reviewers"}`,
    },
  ];

  return (
    <SiteChrome active="trust">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "How we rank",
          url: absoluteUrl(routes.howWeRank()),
          dateModified: new Date(UPDATED).toISOString(),
        }}
      />
      <FaqJsonLd faqs={FAQS.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }))} />

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 44px" }}>
          <Crumbs items={[{ label: "Home", href: "/" }, { label: "How we rank" }]} />
          <div style={{ maxWidth: "840px" }}>
            <Eyebrow heroIn="1" gap="16px">
              Ranking methodology
            </Eyebrow>
            <h1
              data-hero-in="2"
              style={{
                fontSize: "clamp(32px, 4.2vw, 50px)",
                lineHeight: "1.08",
                letterSpacing: "-0.04em",
                fontWeight: "800",
                textWrap: "balance",
              }}
            >
              How we rank local businesses, and why nobody can buy a spot
            </h1>
            <p data-hero-in="3" style={{ marginTop: "20px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              We research local businesses using reputation, service quality, experience, credentials,
              local relevance, customer feedback and editorial evaluation. Rankings are reviewed by an
              editor before publication and revisited on a schedule. Businesses cannot buy an
              editorial position, and sponsored placements are labelled and kept separate from ranked
              lists.
            </p>
          </div>
          <div style={{ marginTop: "24px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 24px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
              <Icon name="calendar" size={16} color="#2D74D7" strokeWidth={1.9} />
              Last updated {fullDate(UPDATED)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
              <Icon name="doc" size={16} color="#2D74D7" strokeWidth={1.9} />
              Methodology version {VERSION}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
              <Icon name="shield" size={16} color="#1F9D6B" strokeWidth={1.9} />
              Applied to {rankingCount} published {rankingCount === 1 ? "ranking" : "rankings"}
            </span>
            <InfoModal
              label="Editorial independence"
              title="Editorial independence"
              points={[
                "Editorial positions are never sold, and payment cannot change one",
                "Sponsorship is sold by a separate team and always labelled",
                "An editor is named on every ranking and is accountable for it",
                "We publish what we could not confirm rather than filling the gap",
              ]}
              link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
            >
              Nothing on a ranked list is placed, paid for or approved by the companies on it.
            </InfoModal>
          </div>
        </div>
      </section>

      <nav
        aria-label="On this page"
        data-toc=""
        style={{
          position: "sticky",
          top: "76px",
          zIndex: 150,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ ...SHELL, padding: "0 24px", display: "flex", alignItems: "center", gap: "16px", overflowX: "auto" }}>
          <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: "700", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            On this page
          </span>
          <ul style={{ display: "flex", alignItems: "center", gap: "4px", padding: "10px 0" }}>
            {TOC.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  style={{ display: "block", padding: "8px 12px", borderRadius: "999px", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ---------------------------------------------------------- process */}
      <section id="process" aria-labelledby="pr-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="pr-h2" style={{ ...SECTION_H2, marginBottom: "12px" }}>
            Our ranking process at a glance
          </h2>
          <p style={{ ...LEAD, maxWidth: "760px", marginBottom: "32px" }}>
            Every ranked list follows the same six stages. The criteria applied inside them are written
            per category.
          </p>
          <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
            {STEPS.map((step) => (
              <li
                key={step.n}
                data-card=""
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", boxShadow: "var(--shadow-xs)", padding: "24px 22px" }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
                  <span aria-hidden="true" style={{ ...TILE, width: "42px", height: "42px" }}>
                    <Icon name={step.icon} size={20} strokeWidth={1.8} />
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#8A5F0B" }}>{step.n}</span>
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>{step.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- factors */}
      <section id="factors" aria-labelledby="fa-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "12px" }}>
            <h2 id="fa-h2" style={SECTION_H2}>
              What we look at
            </h2>
            <InfoModal
              label="Ranking methodology details"
              title="How the factors are applied"
              points={[
                "Factors are not weighted equally, and the emphasis shifts by category",
                "We publish importance labels rather than invented percentages",
                "A single strong metric never carries a position on its own",
                "Where a factor cannot be assessed, the page says so",
              ]}
              link={{ href: routes.editorialTeam(), label: "Editorial team" }}
            >
              The framework below is shared. The criteria that sit inside it are written per trade.
            </InfoModal>
          </div>
          <p style={{ ...LEAD, maxWidth: "760px", marginBottom: "32px" }}>
            These factors are not weighted equally, and their importance shifts by category. We use
            qualitative importance labels rather than publishing invented percentages.
          </p>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {FACTORS.map((factor) => (
              <li
                key={factor.title}
                data-card=""
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", boxShadow: "var(--shadow-xs)", padding: "22px" }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                  <span aria-hidden="true" style={{ ...TILE, width: "38px", height: "38px", borderRadius: "11px" }}>
                    <Icon name={factor.icon} size={18} strokeWidth={1.8} />
                  </span>
                  <Pill tone={factor.weight === "high" ? "amber" : factor.weight === "moderate" ? "blue" : "plain"} icon="check">
                    {WEIGHT_SKIN[factor.weight].label}
                  </Pill>
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "5px" }}>{factor.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{factor.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- category */}
      <section id="category" aria-labelledby="ca-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="ca-h2" style={{ ...SECTION_H2, marginBottom: "12px" }}>
            Rankings are category-specific
          </h2>
          <p style={{ ...LEAD, maxWidth: "760px", marginBottom: "32px" }}>
            A chimney company should not be judged with the same checklist as a moving company. Each
            category has its own criteria document, and the emphasis below shows how differently they
            read.
          </p>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {CATEGORY_CRITERIA.map((entry) => (
              <li key={entry.title} style={{ ...PANEL, borderRadius: "18px", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
                <span aria-hidden="true" style={{ ...TILE, width: "44px", height: "44px", marginBottom: "14px" }}>
                  <Icon name={entry.icon} size={21} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", paddingBottom: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                  {entry.title}
                </h3>
                <ul style={{ display: "grid", gap: "9px" }}>
                  {entry.items.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "9px", fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                      <Tick color="#2D74D7" />
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- reviews */}
      <section id="reviews" aria-labelledby="re-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
          <div>
            <h2 id="re-h2" style={{ ...SPLIT_H2, marginBottom: "16px" }}>
              How we use Google reviews
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Google review data is one reputation signal among several. We read the rating alongside
              review volume, recency, consistency over time, recurring themes and unusual patterns.
            </p>
            <p
              style={{
                fontSize: "17px",
                lineHeight: "1.75",
                color: "var(--blue-900)",
                fontWeight: "600",
                padding: "16px 18px",
                background: "var(--blue-50)",
                border: "1px solid var(--blue-100)",
                borderRadius: "14px",
              }}
            >
              A high Google rating does not automatically produce a higher TenBestFind ranking, and a
              lower rating does not automatically exclude a business.
            </p>
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
              <InfoModal
                label="Google review data"
                title="Google review data"
                points={[
                  "Ratings and counts are read from Google at the time of the last check",
                  "They move between checks, so the page carries the date they were true",
                  "We do not filter, weight or edit the review text itself",
                  "A rating is one signal, never the ranking on its own",
                ]}
                link={{ href: routes.corrections(), label: "Report an issue" }}
              >
                Where a rating appears it comes from Google, unedited.
              </InfoModal>
              <InfoModal
                label="AI-assisted review analysis"
                title="AI-assisted review analysis"
                points={[
                  "Tools group recurring themes across large numbers of reviews",
                  "They surface patterns for an editor to check, and decide nothing",
                  "Every claim drawn from them is verified before it publishes",
                  "A named editor remains accountable for the conclusion",
                ]}
                link={{ href: routes.editorialTeam(), label: "Editorial team" }}
              >
                Automation helps read at volume. People decide what it means.
              </InfoModal>
            </div>
          </div>
          <div style={PANEL}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>How customer feedback is evaluated</h3>
            <ul style={{ display: "grid", gap: "11px" }}>
              {FEEDBACK.map((item) => (
                <li key={item} style={TICK_ITEM}>
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- verification */}
      <section id="verification" aria-labelledby="ve-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="ve-h2" style={{ ...SECTION_H2, marginBottom: "12px" }}>
            How we verify credentials and business information
          </h2>
          <p style={{ ...LEAD, maxWidth: "780px", marginBottom: "28px" }}>
            We check against the issuing body or an official record wherever one exists, then label
            everything we could not confirm. Verification uses licensing databases, municipal records,
            professional organisations, certification bodies, insurer documentation where available
            and company records.
          </p>
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={PANEL}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Credential status labels</h3>
                <InfoModal
                  label="Credential verification"
                  title="Credential verification"
                  points={[
                    "A licence number is checked against the register that issued it",
                    "The date of that check is recorded and published",
                    "Where no register exists we say so rather than implying a licence",
                    "An expired credential stays visible with its date range",
                  ]}
                  link={{ href: routes.corrections(), label: "Report an issue" }}
                >
                  Five labels, so you can see how far a claim was actually checked.
                </InfoModal>
              </div>
              <ul style={{ display: "grid", gap: "12px" }}>
                {STATUSES.map((status) => (
                  <li key={status.label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <Pill tone={status.tone} icon={status.icon} minWidth="132px">
                      {status.label}
                    </Pill>
                    <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{status.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={PANEL}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Business details we check</h3>
                <InfoModal
                  label="Data sources"
                  title="Where our data comes from"
                  points={[
                    "Licensing bodies and official records come first",
                    "Company documentation ranks above directories and review platforms",
                    "Business-provided information is labelled as reported",
                    "Every figure on a page traces back to something we can name",
                  ]}
                  link={{ href: routes.howWeRank(), label: "This methodology" }}
                >
                  Primary sources take priority over anything aggregated.
                </InfoModal>
              </div>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "9px 18px" }}>
                {CHECKS.map((item) => (
                  <li key={item} style={{ display: "flex", gap: "9px", fontSize: "15px", color: "var(--text-secondary)" }}>
                    <Tick color="#2D74D7" />
                    {item}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: "16px", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                Primary sources take priority: licensing bodies, official records and the company&rsquo;s
                own documentation rank above directories and review platforms. Business-provided
                information is labelled as such.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ local */}
      <section id="local" aria-labelledby="lo-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "44px", alignItems: "start" }}>
          <div>
            <p style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "#E8B551", marginBottom: "14px" }}>
              <Icon name="pin" size={16} strokeWidth={2} />
              Local relevance
            </p>
            <h2 id="lo-h2" style={{ ...SPLIT_H2, color: "#fff", marginBottom: "16px" }}>
              Why a business has to genuinely serve the market
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.82)" }}>
              A roofing company ranked in a city should show meaningful coverage of that area, not
              simply mention it on its website. We look at physical presence, stated service area,
              recent local work, local customer feedback, familiarity with local conditions and any
              location-specific licensing.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "rgba(232,237,245,0.6)", marginBottom: "14px" }}>
              How businesses enter our research pool
            </h3>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px 20px", marginBottom: "20px" }}>
              {DISCOVERY.map((item) => (
                <li key={item} style={{ display: "flex", gap: "9px", fontSize: "15px", color: "rgba(232,237,245,0.88)" }}>
                  <Tick color="#E8B551" />
                  {item}
                </li>
              ))}
            </ul>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#fff",
                padding: "16px 18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "14px",
              }}
            >
              Businesses never need to pay TenBestFind to be considered for an editorial ranking.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- qualify */}
      <section id="qualify" aria-labelledby="qu-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          <div style={{ ...PANEL, border: "1px solid var(--green-100)" }}>
            <h2 id="qu-h2" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
              <Icon name="check" size={20} color="#178054" strokeWidth={2.2} />
              Minimum qualification standards
            </h2>
            <ul style={{ display: "grid", gap: "10px" }}>
              {MINIMUMS.map((item) => (
                <li key={item} style={{ ...TICK_ITEM, color: "var(--text-primary)" }}>
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--text-secondary)" }}>
              Thresholds vary by industry. Where a market lacks enough qualifying businesses or source
              data, we do not publish a ranking for it.
            </p>
          </div>
          <div style={{ ...PANEL, border: "1px solid #F0DDB4" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
              <Icon name="alert" size={20} color="#8A5F0B" strokeWidth={2.2} />
              Why a business may be excluded or removed
            </h2>
            <ul style={{ display: "grid", gap: "10px" }}>
              {EXCLUSIONS.map((item) => (
                <li key={item} style={{ ...TICK_ITEM, color: "var(--text-primary)" }}>
                  <Tick color="#8A5F0B" />
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--text-secondary)" }}>
              Exclusion is a research outcome, not an accusation. We describe what we could or could
              not confirm rather than making claims about a business.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ order */}
      <section id="order" aria-labelledby="or-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "44px", alignItems: "start" }}>
          <div>
            <h2 id="or-h2" style={{ ...SPLIT_H2, marginBottom: "16px" }}>
              How we determine ranking order
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Position reflects overall strength across the whole evaluation rather than any single
              metric. Where two companies are close, the tiebreakers are local relevance, breadth of
              relevant service and how transparently the business documents its work.
            </p>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
              Ranking position and customer rating are different things and are never merged into one
              score. A company can rank first with a slightly lower rating than a competitor if the
              rest of the evaluation is stronger.
            </p>
          </div>
          <div style={PANEL}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
              <Icon name="tag" size={19} color="#2D74D7" strokeWidth={1.9} />
              What &ldquo;best for&rdquo; labels mean
            </h3>
            <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Designations such as Best Overall, Best for Replacement or Best for Emergency are
              editorial distinctions based on the evidence we gathered for that market. They are never
              sold.
            </p>
            <ul style={{ display: "grid", gap: "10px" }}>
              {LABELS.map((entry) => (
                <li key={entry.label} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Pill tone="amber">{entry.label}</Pill>
                  <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{entry.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ sponsorship */}
      <section id="sponsorship" aria-labelledby="sp-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "12px" }}>
            <h2 id="sp-h2" style={SECTION_H2}>
              How sponsorship works
            </h2>
            <InfoModal
              label="Sponsored placements"
              title="Sponsored placements"
              points={[
                "Sponsorship is sold separately from editorial research",
                "Every paid placement carries a label wherever it appears",
                "A sponsored slot sits outside the ranked list and never enters it",
                "Ending a sponsorship never changes an editorial position",
              ]}
              link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
            >
              Paid visibility exists. It is labelled, and it buys nothing on a ranked list.
            </InfoModal>
          </div>
          <p style={{ ...LEAD, maxWidth: "800px", marginBottom: "28px" }}>
            TenBestFind accepts advertising and sponsorship. Sponsored placements are labelled wherever
            they appear, sit outside the editorial list, and never create or improve a ranking
            position. Paid partners may receive additional visibility in clearly marked slots, and
            nothing more.
          </p>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            {BADGES.map((badge) => (
              <li
                key={badge.label}
                style={{ background: "var(--surface-card)", border: `1px solid ${TONE[badge.tone].border}`, borderRadius: "18px", padding: "24px" }}
              >
                <span style={{ display: "inline-block", marginBottom: "14px" }}>
                  <Pill tone={badge.tone} icon={badge.icon}>
                    {badge.label}
                  </Pill>
                </span>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{badge.text}</p>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "18px", fontSize: "15px", color: "var(--text-secondary)" }}>
            These four marks mean different things and are never visually or semantically combined.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- updates */}
      <section id="updates" aria-labelledby="up-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "44px", alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
              <h2 id="up-h2" style={SPLIT_H2}>
                How often we review rankings
              </h2>
              <InfoModal
                label="Update policy"
                title="Update policy"
                points={[
                  "Every ranking carries its own last-reviewed date",
                  "Storm-driven categories are revisited more often than stable ones",
                  "Material changes to a listed business trigger an earlier review",
                  "A list we can no longer support is unpublished rather than left up",
                ]}
                link={{ href: routes.corrections(), label: "Report an issue" }}
              >
                Freshness is published on the page, not implied.
              </InfoModal>
            </div>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "18px" }}>
              Each ranking carries its own last-reviewed date. Storm-driven categories are revisited
              more often than stable ones, and any of the following can trigger an earlier review.
            </p>
            <ul style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
              {TRIGGERS.map((item) => (
                <li key={item} style={TICK_ITEM}>
                  <Tick color="#2D74D7" />
                  {item}
                </li>
              ))}
            </ul>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {FRESHNESS.map((item) => (
                <li key={item.label}>
                  <Pill tone={item.tone} icon={item.icon}>
                    {item.label}
                  </Pill>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--text-secondary)" }}>
              Freshness labels appear on ranking pages so you can see whether a list is current or due
              for review.
            </p>
          </div>
          <div style={PANEL}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "18px" }}>Methodology version history</h3>
            <ol style={{ display: "grid", gap: "0" }}>
              {VERSIONS.map((entry) => (
                <li key={entry.version} style={{ display: "flex", gap: "16px", paddingBottom: "20px" }}>
                  <span aria-hidden="true" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "46px",
                        height: "30px",
                        padding: "0 10px",
                        borderRadius: "9px",
                        background: "var(--blue-50)",
                        color: "var(--blue-800)",
                        fontSize: "13px",
                        fontWeight: "700",
                      }}
                    >
                      {entry.version}
                    </span>
                    <span style={{ flex: "1", width: "2px", borderRadius: "2px", background: "var(--border-subtle)" }} />
                  </span>
                  <span style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      {entry.date}
                    </span>
                    <span style={{ display: "block", fontSize: "15px", lineHeight: "1.6", color: "var(--text-primary)" }}>{entry.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ human */}
      <section id="human" aria-labelledby="hu-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "44px", alignItems: "start" }}>
          <div>
            <h2 id="hu-h2" style={{ ...SPLIT_H2, marginBottom: "16px" }}>
              Human editorial review and AI assistance
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Automated tools help us organise public data, group review themes, summarise research and
              flag inconsistencies. They do not decide rankings. An editor checks every list before it
              publishes, and subject-matter reviewers check technical claims where a category requires
              it.
            </p>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--blue-900)",
                padding: "16px 18px",
                background: "var(--blue-50)",
                border: "1px solid var(--blue-100)",
                borderRadius: "14px",
                marginBottom: "8px",
              }}
            >
              No ranking position is ever set by an automated system without editorial review.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
              <InfoModal
                label="AI-assisted research"
                title="AI-assisted research"
                points={[
                  "Tools help gather and organise public information at volume",
                  "Every published fact is checked by a person against a named source",
                  "A named editor is accountable for what appears on the page",
                  "Corrections are made by people, and the page records when",
                ]}
                link={{ href: routes.editorialTeam(), label: "Editorial team" }}
              >
                We use tools to help draft, and people to decide what is true.
              </InfoModal>
              <Link href={routes.expertsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Meet our experts and reviewers →
              </Link>
            </div>
          </div>
          <div style={PANEL}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
              <Icon name="clipboard" size={19} color="#2D74D7" strokeWidth={1.9} />
              What an editor checks before publishing
            </h3>
            <ul style={{ display: "grid", gap: "10px" }}>
              {EDITOR_CHECKS.map((item) => (
                <li key={item} style={TICK_ITEM}>
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- example */}
      <section id="example" aria-labelledby="ex-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="ex-h2" style={{ ...SECTION_H2, marginBottom: "12px" }}>
            Example: evaluating a roofer
          </h2>
          <p style={{ ...LEAD, maxWidth: "780px", marginBottom: "28px" }}>
            A simplified walkthrough of the framework in practice. This is an illustrative evaluation,
            not a published ranking.
          </p>
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "20px", overflow: "hidden", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}>
            <ul>
              {WALKTHROUGH.map((row) => (
                <li
                  key={row.factor}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.4fr) auto",
                    gap: "16px",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--blue-900)" }}>{row.factor}</span>
                  <span style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{row.finding}</span>
                  <span style={{ justifySelf: "end" }}>
                    <Pill tone={row.verdict === "Noted" ? "blue" : "green"}>{row.verdict}</Pill>
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ padding: "22px 24px", background: "var(--blue-50)" }}>
              <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--blue-800)", marginBottom: "8px" }}>
                Editorial conclusion
              </p>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--blue-900)" }}>
                Strong across local coverage, credentials and warranty documentation, with pricing
                above the local median and slower scheduling in storm season. Suited to a top position
                with a <strong style={{ fontWeight: "700" }}>Best Overall</strong> designation, and not
                designated Best for Value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ participate */}
      <section id="participate" aria-labelledby="pa-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="pa-h2" style={{ ...SECTION_H2, marginBottom: "28px" }}>
            Claiming, submissions and corrections
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {PARTICIPATE.map((entry) => (
              <li
                key={entry.title}
                data-card=""
                style={{ ...PANEL, borderRadius: "18px", padding: "24px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <span aria-hidden="true" style={{ ...TILE, width: "44px", height: "44px" }}>
                  <Icon name={entry.icon} size={21} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>{entry.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{entry.text}</p>
                <Link href={entry.href} style={{ marginTop: "auto", paddingTop: "8px", fontSize: "15px", fontWeight: "600" }}>
                  {entry.cta} →
                </Link>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "20px", fontSize: "15px", color: "var(--text-secondary)" }}>
            Claiming a profile or submitting a business lets you correct factual information. Neither
            guarantees inclusion in a ranking, and neither affects position.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="fq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}>
          <h2 id="fq-h2" style={SPLIT_H2}>
            Ranking methodology FAQs
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {FAQS.map((faq) => (
              <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ trust */}
      <section id="trust" aria-labelledby="tr-h2">
        <div style={{ ...SHELL, padding: "64px 24px 72px" }}>
          <h2 id="tr-h2" style={{ ...SPLIT_H2, marginBottom: "24px" }}>
            Learn more about our editorial process
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px", marginBottom: "44px" }}>
            {TRUST_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  data-card=""
                  href={link.href}
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
                  <span aria-hidden="true" style={{ ...TILE, flex: "0 0 40px", width: "40px", height: "40px", borderRadius: "11px" }}>
                    <Icon name={link.icon} size={19} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>{link.name}</span>
                    <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>{link.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "30px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "21px", fontWeight: "700" }}>About this methodology</h2>
              <InfoModal
                label="Corrections policy"
                title="Corrections policy"
                points={[
                  "Anyone can report something that is wrong or out of date",
                  "We check the report against the source before changing anything",
                  "Corrections are made by a person and dated on the page",
                  "Where a claim can no longer be supported, we remove it",
                ]}
                link={{ href: routes.corrections(), label: "Report an issue" }}
              >
                Getting something wrong is not the problem. Leaving it wrong is.
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
                <Icon name="pencil" size={17} strokeWidth={2} />
                Report an issue with a ranking
              </Link>
              <Link href={routes.editorialTeam()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Editorial standards
              </Link>
              <Link href={routes.advertisingDisclosure()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Advertising disclosure
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
