import type { GuideBlock } from "./editorial";

export type SeedPage = {
  title: string;
  slug: string;
  template: "document" | "contact" | "sitemap";
  excerpt: string;
  printable?: boolean;
  noticeTitle?: string;
  noticeBody?: string;
  body: GuideBlock[];
  faqs?: { q: string; a: string }[];
};

const p = (text: string): GuideBlock => ({ kind: "paragraph", text });
const h = (text: string, id: string): GuideBlock => ({ kind: "heading", text, id });
const l = (items: string[]): GuideBlock => ({ kind: "list", items });

export const PAGES: SeedPage[] = [
  {
    title: "About TenBestFind",
    slug: "about",
    template: "document",
    excerpt:
      "Who writes the rankings, how the research works, and how the business makes money without selling positions on a list.",
    body: [
      h("What we do", "what-we-do"),
      p(
        "TenBestFind researches local service companies one city and one trade at a time, then publishes a shortlist of ten with the reasoning behind it. The point is to replace forty open browser tabs with one page you can act on.",
      ),
      p(
        "We are a small editorial team. Every list carries the name of the person who wrote it and, where the trade warrants it, the name of the expert who reviewed the criteria.",
      ),
      h("How we make money", "revenue"),
      p(
        "Two ways. Businesses can subscribe to manage their own profile, and businesses can buy clearly labelled sponsored placements. Neither buys a position on an editorial list, and the editorial team does not know which companies are subscribers when a ranking is finalized.",
      ),
      h("What we do not do", "limits"),
      l([
        "We do not accept payment for ranking positions",
        "We do not invent ratings, review counts or price figures",
        "We do not republish customer reviews as our own editorial judgement",
        "We do not claim to have verified something we could not verify",
      ]),
      h("Corrections", "corrections"),
      p(
        "If something on a page is wrong, tell us and we will check it against the primary source. When we change a page we note that it changed and when.",
      ),
    ],
  },
  {
    title: "Contact TenBestFind",
    slug: "contact",
    template: "contact",
    excerpt: "Reach the right team: general questions, corrections, business support or advertising.",
    body: [],
  },
  {
    title: "Privacy Policy",
    slug: "privacy",
    template: "document",
    printable: true,
    excerpt: "What we collect, why we collect it, and how to ask us to delete it.",
    noticeTitle: "Your rights",
    noticeBody:
      "You can ask for a copy of the personal information we hold about you, ask us to correct it, or ask us to delete it. Requests go through the contact form and we respond within thirty days.",
    body: [
      h("Information we collect", "collect"),
      p(
        "We collect the information you send us through forms, basic analytics about how pages are used, and account information when a business owner subscribes.",
      ),
      h("How we use it", "use"),
      l([
        "To answer questions and process corrections",
        "To operate business accounts and billing",
        "To understand which pages are useful and which are not",
        "To meet legal and accounting obligations",
      ]),
      h("Sharing", "sharing"),
      p(
        "We do not sell personal information. We share it with the service providers that run our payments, email and hosting, under contracts that limit what they can do with it.",
      ),
      h("Retention", "retention"),
      p("We keep account and billing records as long as the law requires, and form submissions for as long as they are useful for the matter raised."),
    ],
  },
  {
    title: "Terms of Use",
    slug: "terms",
    template: "document",
    printable: true,
    excerpt: "The terms that apply to using the site and to business subscriptions.",
    noticeTitle: "Rankings are editorial opinion",
    noticeBody:
      "Our rankings represent editorial judgement based on the criteria we publish. They are not a guarantee about any company's work, and hiring decisions remain yours.",
    body: [
      h("Using the site", "use"),
      p("You may read, link to and quote our pages with attribution. You may not scrape them at scale or republish them as your own."),
      h("Business subscriptions", "subscriptions"),
      p(
        "Subscriptions are billed monthly per location and can be cancelled at any time, effective at the end of the current period. A subscription covers profile management and listing maintenance. It never covers a ranking position.",
      ),
      h("Accuracy", "accuracy"),
      p(
        "We work from primary sources where we can and label everything else as reported. Business details change, and we cannot guarantee that every field is current at the moment you read it.",
      ),
    ],
  },
  {
    title: "Advertising & Sponsorship Disclosure",
    slug: "advertising-disclosure",
    template: "document",
    excerpt: "What sponsorship buys, what it never buys, and how labelled placements appear on the site.",
    noticeTitle: "The short version",
    noticeBody:
      "Sponsorship buys visibility in a labelled slot. It does not buy a position in an editorial ranking, and it never changes the order of one.",
    body: [
      h("What sponsors get", "what"),
      l([
        "A labelled Featured Partner box, visually separated from the ranked list",
        "Labelled placement beside the category being browsed",
        "Profile management tools through a business subscription",
      ]),
      h("What sponsors never get", "never"),
      l([
        "A position in the ten ranked companies",
        "Advance sight of a ranking before it publishes",
        "Influence over how criteria are set or applied",
        "Removal of a competitor from a list",
      ]),
      h("How placements are labelled", "labels"),
      p(
        "Every paid placement carries a Sponsored label and a disclosure explaining what it is. The label is plain text rather than a badge, because the point is that you can tell the difference, not that it should shout.",
      ),
    ],
  },
  {
    title: "How TenBestFind Sources Business Information",
    slug: "data-sources",
    template: "document",
    excerpt: "The four tiers of source behind every field on a business profile, and what each one means.",
    body: [
      h("Primary sources", "primary"),
      p(
        "Licensing registers, business registration databases, court and permit records. When we say a credential is verified, it means we found it in one of these and noted the date.",
      ),
      h("Secondary sources", "secondary"),
      p("Manufacturer certification directories, trade association membership lists, and insurer certificates provided directly by the insurer."),
      h("Reported information", "reported"),
      p(
        "Details the business gave us, and third-party data such as Google ratings and review counts. We show these with attribution and the date they were read, and we never blend them into a score of our own.",
      ),
      h("Editorial research", "editorial"),
      p(
        "Our own reading of estimates, warranty documents and public feedback. This is judgement rather than fact, and it is labelled as ours.",
      ),
    ],
  },
  {
    title: "Corrections & Content Updates",
    slug: "corrections",
    template: "document",
    excerpt: "How to report something that is wrong, and what happens after you do.",
    body: [
      h("Reporting an error", "report"),
      p("Send the page address and what is wrong through the contact form, choosing the corrections topic. Anyone can report an error; you do not have to own the business."),
      h("What we do with it", "process"),
      l([
        "We check the claim against the primary source",
        "We correct the page if the report is right",
        "We note on the page that it was updated, and when",
        "We reply to tell you what we found, including when we did not change anything",
      ]),
      h("Scheduled re-checks", "schedule"),
      p(
        "Separately from reports, every ranking is re-reviewed on a schedule, and sooner when something significant changes such as a licence lapsing or a company closing.",
      ),
    ],
  },
  {
    title: "Accessibility at TenBestFind",
    slug: "accessibility",
    template: "document",
    excerpt: "Our accessibility commitments, known gaps, and how to report a barrier.",
    body: [
      h("What we aim for", "aim"),
      p("We build to WCAG 2.2 AA: keyboard operability throughout, visible focus, text contrast that passes at every size we use, and content that does not rely on colour alone to carry meaning."),
      h("Known gaps", "gaps"),
      p("Some third-party embedded maps do not meet the same standard. Where that is true we provide the same information as text nearby."),
      h("Reporting a barrier", "report"),
      p("Tell us what you were trying to do and what stopped you. We treat accessibility reports as priority corrections."),
    ],
  },
  {
    title: "Cookie Policy",
    slug: "cookies",
    template: "document",
    excerpt: "The cookies this site sets and what each one does.",
    body: [
      h("Essential cookies", "essential"),
      p("A session cookie for signed-in business owners and admins. Without it, signing in does not work."),
      h("Analytics", "analytics"),
      p("First-party page analytics that count views and clicks. They do not follow you to other sites."),
    ],
  },
  {
    title: "TenBestFind Sitemap",
    slug: "sitemap",
    template: "sitemap",
    excerpt: "Every section of the site, grouped.",
    body: [],
  },
  {
    title: "Editorial Standards",
    slug: "editorial-standards",
    template: "document",
    excerpt: "How we research, who reviews what, and the line between fact and judgement.",
    body: [
      h("Separation of editorial and revenue", "separation"),
      p(
        "The people who write rankings do not sell advertising and are not told which companies are subscribers. That separation is the whole basis of the product.",
      ),
      h("Fact versus judgement", "judgement"),
      p(
        "A licence number is a fact and we cite where we checked it. Whether a company is the best choice for older homes is judgement, and we say so and explain the reasoning.",
      ),
      h("Expert review", "review"),
      p(
        "Trades with real technical depth get an expert reviewer who reads the criteria and the finished page. Reviewers do not set the order, and they are not shown one before reviewing the criteria.",
      ),
      h("Use of AI tools", "ai"),
      p(
        "We use software to help gather and organize public records. No ranking position is ever set by an automated system, and every published page is read by a named editor before it goes live.",
      ),
    ],
  },
  {
    title: "Editorial Team",
    slug: "editorial-team",
    template: "document",
    excerpt: "The people who research, write and review what gets published here.",
    body: [
      h("How the team works", "how"),
      p(
        "Editors own markets and trades. Expert reviewers read the criteria and the finished page in trades where technical depth matters. Every published page carries both names.",
      ),
    ],
  },
];

/* ------------------------------------------------------------------- plans */

export const PLANS = [
  {
    key: "claim",
    name: "Claim & Manage",
    description:
      "Claim an existing listing and keep its details current. Verification is included, and the charge is refunded if ownership cannot be verified.",
    priceCents: 2900,
    interval: "month",
    unitLabel: "per location",
    features: [
      "Verified ownership of your listing",
      "Edit services, hours, contact details and service area",
      "Respond to profile update requests",
      "Listing performance dashboard",
      "Cancel any time",
    ],
    editorial: false,
    sortOrder: 1,
  },
  {
    key: "listing",
    name: "Directory Listing",
    description:
      "Add a business that is not yet in the directory. The card is held and first charged only on the day the listing publishes, never if it is declined.",
    priceCents: 2900,
    interval: "month",
    unitLabel: "per published location",
    features: [
      "Submit a new business for editorial review",
      "Nothing charged until the listing publishes",
      "Full profile management once live",
      "Listing performance dashboard",
      "Cancel any time",
    ],
    editorial: false,
    sortOrder: 2,
  },
  {
    key: "top10",
    name: "Top 10 Listing",
    description:
      "A labelled featured placement on one city and trade page. This sits outside the ten ranked positions, which stay editorial.",
    priceCents: 19900,
    interval: "month",
    unitLabel: "per city and trade",
    features: [
      "Featured Partner box on one ranking page",
      "Labelled Sponsored, with a disclosure explaining what it is",
      "Placement beside the exact service being compared",
      "Impression and click reporting",
      "Never affects the ten ranked positions",
    ],
    editorial: true,
    sortOrder: 3,
  },
  {
    key: "advertising",
    name: "Advertising",
    description: "Multi-market and category-level placements, quoted against coverage and inventory.",
    priceCents: 0,
    interval: "quote",
    unitLabel: "custom quote",
    features: [
      "Multi-city and multi-trade placements",
      "Category and location hub placements",
      "Campaign reporting",
      "Eligibility review before any placement runs",
    ],
    editorial: true,
    sortOrder: 4,
  },
];

/* ---------------------------------------------------------------- settings */

export const SETTINGS: { key: string; value: unknown; groupName: string; label: string }[] = [
  { key: "site.name", value: "TenBestFind", groupName: "general", label: "Site name" },
  {
    key: "site.tagline",
    value: "The ten best local businesses, researched",
    groupName: "general",
    label: "Tagline",
  },
  { key: "site.url", value: "https://tenbestfind.com", groupName: "general", label: "Site URL" },
  { key: "site.contactEmail", value: "hello@tenbestfind.com", groupName: "general", label: "Contact email" },
  { key: "seo.titleSeparator", value: "|", groupName: "seo", label: "Title separator" },
  {
    key: "seo.defaultTitleTemplate",
    value: "%title% %sep% %sitename%",
    groupName: "seo",
    label: "Default title template",
  },
  { key: "seo.noindexPaginated", value: true, groupName: "seo", label: "Noindex paginated archives" },
  { key: "seo.noindexSearch", value: true, groupName: "seo", label: "Noindex search results" },
  { key: "seo.organizationType", value: "Organization", groupName: "seo", label: "Organization schema type" },
  { key: "seo.sitemapEnabled", value: true, groupName: "seo", label: "Generate XML sitemap" },
  { key: "seo.sitemapPerPage", value: 200, groupName: "seo", label: "Sitemap entries per page" },
  { key: "rankings.methodologyVersion", value: "1.2", groupName: "editorial", label: "Methodology version" },
  { key: "rankings.reviewCadenceMonths", value: 6, groupName: "editorial", label: "Review cadence (months)" },
  { key: "rankings.entriesPerRanking", value: 10, groupName: "editorial", label: "Companies per ranking" },
  { key: "billing.currency", value: "USD", groupName: "billing", label: "Billing currency" },
  { key: "billing.trialDays", value: 0, groupName: "billing", label: "Trial days" },
  { key: "billing.invoicePrefix", value: "TBF", groupName: "billing", label: "Invoice number prefix" },
  { key: "analytics.retentionDays", value: 400, groupName: "analytics", label: "Event retention (days)" },
  { key: "analytics.rollupHour", value: 3, groupName: "analytics", label: "Nightly rollup hour (UTC)" },
];
