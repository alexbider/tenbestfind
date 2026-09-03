import type { LinkRow } from "@/lib/json";

/* ------------------------------------------------------------------ people */

export type SeedPerson = {
  name: string;
  slug: string;
  role: string;
  bio: string;
  limits?: string;
  specializations: string[];
  links?: LinkRow[];
  markets?: string[];
  isAuthor?: boolean;
  isReviewer?: boolean;
  isExpert?: boolean;
  yearsExperience?: number;
  credentials?: {
    label: string;
    issuer?: string;
    status: "VERIFIED" | "SELF_REPORTED" | "EXPIRED";
  }[];
  experience?: { role: string; org: string; startedYear: number; endedYear?: number; summary?: string }[];
};

export const PEOPLE: SeedPerson[] = [
  {
    name: "Marcus Reed",
    slug: "marcus-reed",
    role: "Expert reviewer, exteriors and structure",
    bio: "Marcus spent nineteen years in residential roofing and exterior contracting before moving into editorial review. He reads every exteriors ranking and cost guide before it publishes, checking that the criteria match how the trade actually works and that nothing on the page overstates what we verified.",
    limits:
      "Marcus reviews roofing, siding, gutters, windows and foundation content. He does not review plumbing, electrical or HVAC work, and he does not set ranking positions. Editors do that, and Marcus is not shown a ranking order before he reviews the criteria.",
    specializations: ["Roofing systems", "Storm and hail damage", "Insurance claims", "Exterior envelope", "Metal roofing"],
    links: [
      { label: "Professional profile", url: "https://example.com/marcus-reed" },
      { label: "Trade association listing", url: "https://example.com/nrca/marcus-reed" },
    ],
    markets: ["Dallas-Fort Worth", "Houston", "Oklahoma City"],
    isAuthor: true,
    isReviewer: true,
    isExpert: true,
    yearsExperience: 19,
    credentials: [
      { label: "Haag Certified Inspector, residential roofs", issuer: "Haag Engineering", status: "VERIFIED" },
      { label: "GAF Master Elite trained", issuer: "GAF", status: "VERIFIED" },
      { label: "Texas general contractor registration", issuer: "State of Texas", status: "SELF_REPORTED" },
      { label: "OSHA 30-hour construction", issuer: "OSHA", status: "EXPIRED" },
    ],
    experience: [
      {
        role: "Expert reviewer",
        org: "TenBestFind",
        startedYear: 2024,
        summary: "Reviews exteriors rankings, cost guides and methodology changes.",
      },
      {
        role: "Owner and estimator",
        org: "Reed Exteriors",
        startedYear: 2012,
        endedYear: 2024,
        summary: "Ran a residential roofing company across North Texas, focused on storm and insurance work.",
      },
      {
        role: "Project manager",
        org: "Sunbelt Roofing Group",
        startedYear: 2007,
        endedYear: 2012,
      },
    ],
  },
  {
    name: "Dana Whitfield",
    slug: "dana-whitfield",
    role: "Senior editor, home services",
    bio: "Dana runs the editorial side of TenBestFind. She built the research process, decides which markets get covered next, and writes the plumbing and chimney rankings herself. Before this she spent eleven years as a consumer reporter covering contractor licensing and home improvement fraud.",
    limits:
      "Dana writes and edits. She does not sell advertising, has no contact with sponsors, and does not see which companies have bought placements before a ranking is finalized.",
    specializations: ["Contractor licensing", "Consumer protection", "Plumbing", "Chimney and fireplace", "Research methodology"],
    links: [{ label: "Professional profile", url: "https://example.com/dana-whitfield" }],
    markets: ["Miami", "Toronto", "Boston", "Chicago"],
    isAuthor: true,
    isReviewer: true,
    isExpert: false,
    yearsExperience: 11,
    credentials: [
      { label: "Investigative Reporters and Editors member", issuer: "IRE", status: "VERIFIED" },
      { label: "Consumer journalism award, state press association", status: "SELF_REPORTED" },
    ],
    experience: [
      { role: "Senior editor", org: "TenBestFind", startedYear: 2023 },
      { role: "Consumer reporter", org: "Regional news group", startedYear: 2012, endedYear: 2023 },
    ],
  },
  {
    name: "Priya Nathan",
    slug: "priya-nathan",
    role: "Staff writer, remodeling and moving",
    bio: "Priya writes the remodeling, moving and cost guides. She spends most of her time reading contracts and estimates, which is where the differences between two apparently identical quotes usually turn up.",
    specializations: ["Kitchen and bath remodeling", "Contracts and change orders", "Moving and storage", "Cost research"],
    markets: ["New York", "Los Angeles", "Vancouver"],
    isAuthor: true,
    isReviewer: false,
    isExpert: false,
    yearsExperience: 7,
    credentials: [{ label: "Journalism degree", issuer: "State university", status: "SELF_REPORTED" }],
    experience: [{ role: "Staff writer", org: "TenBestFind", startedYear: 2024 }],
  },
];

/* ---------------------------------------------------------------- rankings */

export type SeedRanking = {
  title: string;
  slug: string;
  categorySlug: string;
  citySlug: string;
  regionSlug: string;
  countryCode: string;
  summary: string;
  intro?: string;
  companiesReviewed: number;
  authorSlug: string;
  reviewerSlug: string;
  publishedMonthsAgo: number;
  reviewedMonthsAgo: number;
  companySlugs: string[];
  criteria?: { title: string; body: string; importance: "HIGH" | "MODERATE" | "SUPPORTING"; iconKey?: string }[];
  costs?: { label: string; low?: number; high?: number; typical?: number; unit?: string; note?: string }[];
  faqs?: { q: string; a: string }[];
  sources?: { label: string; publisher?: string; url?: string; tier?: "PRIMARY" | "SECONDARY" | "REPORTED" | "EDITORIAL" }[];
};

export const DALLAS_ROOFING_CRITERIA = [
  {
    title: "Licensing and registration",
    body: "Texas does not license roofers, so we check business registration with the Secretary of State, general liability insurance, and any manufacturer certification the company claims.",
    importance: "HIGH" as const,
    iconKey: "badge",
  },
  {
    title: "Documented local work",
    body: "We look for completed projects in the metro within the last year, not stock photography or work from another market.",
    importance: "HIGH" as const,
    iconKey: "pin",
  },
  {
    title: "Written warranty terms",
    body: "Workmanship warranty length, what it excludes, and whether it survives a change of ownership. Verbal assurances do not count.",
    importance: "HIGH" as const,
    iconKey: "doc",
  },
  {
    title: "Storm and claim handling",
    body: "In a hail market, how a company documents damage and works with adjusters affects the outcome as much as the install itself.",
    importance: "HIGH" as const,
    iconKey: "cloud",
  },
  {
    title: "Service range",
    body: "Whether the company genuinely covers repair, replacement and inspection, or lists services it rarely performs.",
    importance: "MODERATE" as const,
    iconKey: "layers",
  },
  {
    title: "Coverage area",
    body: "Real service coverage across Dallas County, checked against where its recent projects actually are.",
    importance: "MODERATE" as const,
    iconKey: "map",
  },
  {
    title: "Customer feedback patterns",
    body: "Recurring themes across public reviews, read as a pattern rather than reacting to any single review.",
    importance: "MODERATE" as const,
    iconKey: "chat",
  },
  {
    title: "Estimate transparency",
    body: "Whether proposals itemize tear-off, decking, ventilation and disposal, which is what makes two bids comparable.",
    importance: "SUPPORTING" as const,
    iconKey: "list",
  },
];

// Sourced 2026 Dallas-Fort Worth figures. Rows without a figure render as
// "Quoted per project" rather than showing an invented number.
export const DALLAS_ROOFING_COSTS = [
  {
    label: "Full asphalt shingle replacement",
    low: 8500,
    high: 25000,
    typical: 13750,
    note: "Most single-family homes land around $12,500 to $15,000.",
  },
  {
    label: "2,000 sq ft architectural shingle roof",
    low: 9000,
    high: 14000,
    note: "Class 4 impact-resistant shingles add roughly $1,000 to $2,500.",
  },
  {
    label: "Standing seam metal or synthetic slate",
    low: 20000,
    high: 45000,
    note: "Premium systems; the upper end is open-ended on complex roofs.",
  },
  {
    label: "Flat roof replacement",
    low: 5,
    high: 12,
    unit: "sq_ft",
    note: "Demolition of the existing system adds $1 to $3 per square foot.",
  },
  {
    label: "Roof permit",
    low: 100,
    high: 500,
    note: "Varies by municipality; around $195 in Dallas County.",
  },
  {
    label: "Emergency tarping",
    note: "Priced per visit and roof size, usually rolled into the claim.",
  },
];

export const RANKINGS: SeedRanking[] = [
  {
    title: "10 Best Roofing Companies in Dallas, TX",
    slug: "roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    summary:
      "Lone Star Roofing Co. is the strongest all-round choice for most Dallas homeowners, with Metroplex Storm Roofing the one to call after hail and Cedar Ridge the one that will still take a small leak repair. All ten hold current liability insurance and put warranty terms in writing.",
    intro:
      "Dallas roofing work is shaped by hail. A large share of replacements here run through an insurance claim, which means how a company documents damage matters nearly as much as how it installs shingles. Texas does not license roofers at all, so this list leans on business registration, insurance certificates, manufacturer certifications and documented local projects instead.",
    companiesReviewed: 36,
    authorSlug: "dana-whitfield",
    reviewerSlug: "marcus-reed",
    publishedMonthsAgo: 5,
    reviewedMonthsAgo: 0,
    companySlugs: [
      "lone-star-roofing",
      "trinity-roof-works",
      "metroplex-storm-roofing",
      "bluebonnet-exteriors",
      "north-texas-metal-roofing",
      "oak-cliff-roofing",
      "dallas-flat-roof-specialists",
      "frisco-line-roofing",
      "cedar-ridge-roofing",
      "grand-prairie-roof-gutter",
    ],
    criteria: DALLAS_ROOFING_CRITERIA,
    costs: DALLAS_ROOFING_COSTS,
    faqs: [
      {
        q: "How do I know if a roofing company is reputable?",
        a: "Look for a verifiable local address, current insurance, state registration, a written warranty and a pattern of consistent customer feedback rather than a handful of recent reviews. Companies that document their scope in writing and answer questions about subcontracting are usually the safer choice.",
      },
      {
        q: "Do roofers need a licence in Texas?",
        a: "No. Texas does not license roofing contractors at state level, which is unusual. That makes insurance certificates, business registration and manufacturer certifications the practical checks, and it is why we verify those for every company on this list.",
      },
      {
        q: "Should I file an insurance claim for hail damage?",
        a: "That depends on your deductible and the extent of the damage, and it is a decision for you and your insurer rather than the contractor. A reputable company will document what it finds and let you decide. Be wary of anyone offering to cover your deductible, which is illegal in Texas.",
      },
      {
        q: "How long does a roof replacement take in Dallas?",
        a: "A standard single-family asphalt shingle roof is usually a one to two day job once materials are on site. Scheduling is the longer part, especially in the weeks after a spring hail event when every company in the metro is booked out.",
      },
      {
        q: "Are impact-resistant shingles worth it here?",
        a: "In a hail corridor they often are, and many Texas insurers offer a premium discount for Class 4 products. The upgrade typically adds $1,000 to $2,500 to a replacement. Ask your insurer what discount applies before deciding.",
      },
      {
        q: "What warranty should a roofing company offer?",
        a: "There are two separate warranties: the manufacturer covers the materials, and the contractor covers the workmanship. Workmanship coverage on this list runs from two to twenty years. Get both in writing, and check whether the workmanship warranty transfers if you sell.",
      },
    ],
    sources: [
      { label: "Texas Secretary of State business registration search", publisher: "State of Texas", tier: "PRIMARY" },
      { label: "Texas Department of Insurance, hail and windstorm guidance", publisher: "TDI", tier: "PRIMARY" },
      { label: "City of Dallas permit fee schedule", publisher: "City of Dallas", tier: "PRIMARY" },
      { label: "Manufacturer certified contractor directories", publisher: "GAF, CertainTeed, Owens Corning", tier: "SECONDARY" },
      { label: "Google Business Profile ratings and review counts", publisher: "Google", tier: "REPORTED" },
      { label: "Editorial review of company estimates and warranty documents", tier: "EDITORIAL" },
    ],
  },
  {
    title: "10 Best Plumbers in Miami, FL",
    slug: "plumbers",
    categorySlug: "plumbers",
    citySlug: "miami",
    regionSlug: "fl",
    countryCode: "us",
    summary:
      "Licensed plumbing companies working across Miami-Dade, compared on what they actually take on, how fast they answer an emergency, and how long they have worked in the county.",
    intro:
      "Florida licenses plumbing contractors at state level, and the DBPR register makes verification straightforward. The distinction that matters here is certified versus registered: a certified contractor can work anywhere in Florida, while a registered one is limited to the jurisdiction that approved them.",
    companiesReviewed: 28,
    authorSlug: "dana-whitfield",
    reviewerSlug: "dana-whitfield",
    publishedMonthsAgo: 1,
    reviewedMonthsAgo: 0,
    companySlugs: ["biscayne-plumbing-group", "coral-way-plumbing", "everglade-drain-sewer"],
    faqs: [
      {
        q: "How do I check a Florida plumbing licence?",
        a: "Search the licensee by name or licence number on the Florida DBPR site. A certified plumbing contractor licence starts with CFC and is valid statewide. Confirm the licence is active and that the name matches the company you are hiring, not a related entity.",
      },
      {
        q: "Why is cast iron replacement so common in Miami?",
        a: "Homes built before the late 1970s were plumbed with cast iron drain lines, and those lines are now at the end of their service life. Corrosion and root intrusion are the usual failures, and replacement is a wall-and-slab job rather than a patch.",
      },
    ],
  },
  {
    title: "10 Best Plumbers in Toronto, ON",
    slug: "plumbers-toronto",
    categorySlug: "plumbers",
    citySlug: "toronto",
    regionSlug: "on",
    countryCode: "ca",
    summary:
      "Licensed shops compared on after-hours response, how they quote, and whether they handle city permits and the basement flooding subsidy paperwork themselves.",
    intro:
      "Plumbing is a compulsory trade in Ontario, and Toronto issues its own master plumber licences. The practical differentiators in this market are drain replacement in older housing, backwater valve work under the city subsidy, and who actually files the permit.",
    companiesReviewed: 24,
    authorSlug: "dana-whitfield",
    reviewerSlug: "dana-whitfield",
    publishedMonthsAgo: 0,
    reviewedMonthsAgo: 0,
    companySlugs: ["don-valley-plumbing", "queen-west-mechanical", "scarborough-drain-works"],
    faqs: [
      {
        q: "Does Toronto help pay for basement flooding protection?",
        a: "The city runs a subsidy programme covering part of the cost of backwater valves, sump pumps and severance of foundation drains, up to a set maximum per property. Applications go through the city, and several companies on this list will prepare the paperwork with you.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ guides */

export type SeedGuide = {
  title: string;
  slug: string;
  type: "EDITORIAL" | "COST";
  categorySlug?: string;
  excerpt: string;
  shortAnswer: string;
  keyTakeaways: string[];
  body: GuideBlock[];
  authorSlug: string;
  reviewerSlug?: string;
  readingMinutes: number;
  publishedMonthsAgo: number;
  typicalLow?: number;
  typicalHigh?: number;
  unitLow?: number;
  unitHigh?: number;
  unitLabel?: string;
  costs?: { label: string; low?: number; high?: number; typical?: number; unit?: string; note?: string }[];
  faqs?: { q: string; a: string }[];
  sources?: { label: string; publisher?: string; url?: string; tier?: "PRIMARY" | "SECONDARY" | "REPORTED" | "EDITORIAL" }[];
};

export type GuideBlock =
  | { kind: "heading"; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: { title: string; body: string }[] }
  | { kind: "callout"; tone: "note" | "alert" | "brand"; title: string; body: string }
  | { kind: "quote"; text: string; attribution: string }
  // What to look for: a titled point with a short explanation, one per thing.
  | { kind: "criteria"; items: { title: string; body: string; iconKey?: string }[] }
  // A tick-box list the reader can work through before hiring.
  | { kind: "checklist"; title: string; items: string[] }
  // Factor / what to check / why it matters, for comparing two quotes.
  | { kind: "compare"; title: string; intro?: string; rows: { factor: string; check: string; why: string }[] }
  // The things that should end a conversation.
  | { kind: "flags"; title: string; items: string[] };

export const GUIDES: SeedGuide[] = [
  {
    title: "How to choose a roofing contractor",
    slug: "how-to-choose-a-roofing-contractor",
    type: "EDITORIAL",
    categorySlug: "roofing",
    excerpt:
      "What a licence actually covers, how quoting should work, and the questions worth asking before anyone gets on your roof.",
    shortAnswer:
      "Verify insurance and business registration first, get three itemized quotes that each specify tear-off, decking and ventilation, and insist on written workmanship warranty terms before you sign. In states that do not license roofers, manufacturer certification and documented local projects do most of the work that a licence would do elsewhere.",
    keyTakeaways: [
      "Insurance certificates matter more than a licence in states that do not license roofers",
      "Three quotes only help if all three cover the same scope of work",
      "Manufacturer certification is verifiable; a logo on a truck is not",
      "Workmanship and material warranties are separate, and both should be in writing",
      "Anyone offering to cover your insurance deductible is proposing something illegal",
    ],
    readingMinutes: 11,
    publishedMonthsAgo: 2,
    authorSlug: "marcus-reed",
    reviewerSlug: "dana-whitfield",
    body: [
      { kind: "heading", text: "Start with insurance, not the estimate", id: "insurance" },
      {
        kind: "paragraph",
        text: "Ask for a certificate of insurance sent directly from the insurer rather than a PDF from the contractor. You are looking for general liability and, if crews are involved, workers compensation. A homeowner whose roofer is uninsured can end up carrying an injury claim.",
      },
      {
        kind: "paragraph",
        text: "Licensing varies more than most people expect. Florida licenses roofers through the DBPR and the register is public. Texas does not license the trade at all. Ontario leaves it to insurance and WSIB coverage. Find out what applies where you are before you assume a licence number means anything.",
      },
      { kind: "heading", text: "Make the quotes comparable", id: "quotes" },
      {
        kind: "paragraph",
        text: "Two roofing quotes for the same house routinely differ by thousands, and usually the reason is scope rather than margin. One includes a full tear-off, the other lays over the existing shingles. One replaces rotten decking at a stated per-sheet rate, the other leaves it open.",
      },
      {
        kind: "list",
        items: [
          "Tear-off of existing layers, and how many layers are there now",
          "Decking replacement rate per sheet, and who decides what needs replacing",
          "Underlayment type, and ice and water shield at the valleys and eaves",
          "Ventilation changes, which affect both the warranty and the attic temperature",
          "Flashing replacement rather than reuse",
          "Disposal, permits and final cleanup including magnetic nail sweep",
        ],
      },
      { kind: "heading", text: "The seven checks before you hire", id: "checks" },
      {
        kind: "steps",
        items: [
          {
            title: "Confirm the business is real and local",
            body: "A verifiable street address in the metro, a registration you can look up, and a phone number that reaches the company rather than a call centre.",
          },
          {
            title: "Verify insurance directly with the insurer",
            body: "Ask for the certificate to come from the agent. Check the coverage dates cover your project window.",
          },
          {
            title: "Check manufacturer certification",
            body: "GAF Master Elite, CertainTeed SELECT and Owens Corning Preferred all publish contractor directories. If the certification is claimed, it is checkable.",
          },
          {
            title: "Ask for three recent local addresses",
            body: "Comparable roofs completed nearby within the last year. Drive past one.",
          },
          {
            title: "Read the warranty before the price",
            body: "How long is the workmanship coverage, what voids it, and does it transfer when you sell?",
          },
          {
            title: "Settle the payment schedule",
            body: "A deposit plus payment on completion is normal. A demand for the full amount up front is not.",
          },
          {
            title: "Get the change order process in writing",
            body: "Decking surprises are common. Agree in advance how they are priced and approved.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "alert",
        title: "Red flags worth walking away from",
        body: "Storm-chasing crews with out-of-state plates and no local address, offers to waive or absorb your insurance deductible, pressure to sign at the kitchen table, and any refusal to put the warranty in writing.",
      },
      {
        kind: "quote",
        text: "The bid that looks cheapest is usually the one that left something out. Line them up item by item and the gap almost always explains itself.",
        attribution: "Marcus Reed, expert reviewer",
      },
    ],
    faqs: [
      {
        q: "How many quotes should I get?",
        a: "Three is the usual advice and it holds up, as long as all three cover the same scope. Two carefully compared quotes tell you more than five that each describe a different job.",
      },
      {
        q: "Should I pay a deposit?",
        a: "A deposit is normal, typically a portion of the material cost. Paying the full amount before work starts is not, and neither is paying cash with no written contract.",
      },
      {
        q: "What if I find damage after the crew leaves?",
        a: "Report it in writing immediately, with photographs and the date. This is what the workmanship warranty is for, and a reputable company will come back.",
      },
    ],
    sources: [
      { label: "Florida DBPR licensee search", publisher: "Florida DBPR", tier: "PRIMARY" },
      { label: "Texas Department of Insurance consumer guidance on hail claims", publisher: "TDI", tier: "PRIMARY" },
      { label: "Manufacturer certified contractor directories", publisher: "GAF, CertainTeed, Owens Corning", tier: "SECONDARY" },
    ],
  },
  {
    title: "How much does a roof replacement cost?",
    slug: "roof-replacement-cost",
    type: "COST",
    categorySlug: "roofing",
    excerpt:
      "What drives the number on a roofing quote, what a fair range looks like in 2026, and which line items people forget to budget for.",
    shortAnswer:
      "Most single-family asphalt shingle replacements run $8,000 to $16,000, or roughly $4 to $6 per square foot installed. Roof size, pitch, the number of existing layers and the material chosen account for nearly all of the variation. Metal and synthetic slate systems start where asphalt ends.",
    keyTakeaways: [
      "Roofers price by the square, which is 100 square feet, not by the square foot",
      "Steep and complex roofs cost more because of labour and safety, not materials",
      "Decking replacement is the most common surprise line item",
      "Permit costs are small but real, and vary by municipality",
      "A second layer to tear off adds meaningfully to disposal cost",
    ],
    readingMinutes: 13,
    publishedMonthsAgo: 1,
    authorSlug: "priya-nathan",
    reviewerSlug: "marcus-reed",
    typicalLow: 8000,
    typicalHigh: 16000,
    unitLow: 4,
    unitHigh: 6,
    unitLabel: "per square foot installed",
    body: [
      { kind: "heading", text: "How roofers price the job", id: "pricing" },
      {
        kind: "paragraph",
        text: "Roofing is quoted by the square, which is one hundred square feet of roof surface. A typical 2,000 square foot single-storey home has considerably more than 2,000 square feet of roof once pitch is accounted for, which is the first reason quotes surprise people.",
      },
      { kind: "heading", text: "What moves the number", id: "factors" },
      {
        kind: "list",
        items: [
          "Roof size in squares, which is not the same as your home's floor area",
          "Pitch, since anything above 7:12 needs staging and slows the crew down",
          "Existing layers, because two layers double the tear-off and disposal",
          "Decking condition, priced per sheet and only known once the roof is open",
          "Material, from three-tab asphalt at the bottom to standing seam metal at the top",
          "Penetrations, valleys and dormers, each of which is a flashing detail",
          "Access, since a tight lot with no truck space adds labour",
          "Season, because peak demand after a storm moves prices as much as materials do",
        ],
      },
      {
        kind: "callout",
        tone: "note",
        title: "How to read these ranges",
        body: "These are installed prices including materials, labour, tear-off and disposal, drawn from 2026 contractor pricing in the markets we cover. They exclude structural repair, and they will sit at the high end in dense urban markets and the low end in smaller ones.",
      },
      { kind: "heading", text: "Where the money goes", id: "breakdown" },
      {
        kind: "paragraph",
        text: "Materials and labour dominate, in roughly comparable measure on an asphalt job. Tear-off and disposal, permits, flashing and ventilation each take a smaller share. We do not publish precise percentage splits because they move considerably between markets and materials, and a made-up split would be worse than none.",
      },
    ],
    costs: [
      { label: "1,500 sq ft roof, architectural shingle", low: 7000, high: 11000 },
      { label: "2,000 sq ft roof, architectural shingle", low: 9000, high: 14000 },
      { label: "2,500 sq ft roof, architectural shingle", low: 11500, high: 17500 },
      { label: "3,000 sq ft roof, architectural shingle", low: 13500, high: 21000 },
      { label: "Three-tab asphalt shingle", low: 3, high: 5, unit: "sq_ft", note: "Entry-level material, shorter rated life." },
      { label: "Architectural asphalt shingle", low: 4, high: 7, unit: "sq_ft", note: "The default choice on most replacements." },
      { label: "Standing seam metal", low: 10, high: 18, unit: "sq_ft" },
      { label: "Synthetic slate", low: 12, high: 22, unit: "sq_ft" },
      { label: "Natural slate", note: "Quoted per project; too variable to publish a range." },
      { label: "Clay or concrete tile", note: "Quoted per project, and structural capacity has to be checked first." },
      { label: "Decking replacement", low: 70, high: 140, unit: "project", note: "Per 4x8 sheet, including labour." },
      { label: "Permit", low: 100, high: 500, note: "Set by the municipality." },
    ],
    faqs: [
      {
        q: "Is it cheaper to lay new shingles over the old ones?",
        a: "Cheaper up front, yes, and it is allowed in many jurisdictions up to two layers. It also hides decking problems, shortens the life of the new roof, adds weight and can void a manufacturer warranty. Most of the contractors we speak to recommend against it.",
      },
      {
        q: "Does a new roof pay for itself at sale?",
        a: "Not fully. It typically returns a substantial portion of its cost in resale value and removes a common obstacle in a home inspection, but treat it as a repair rather than an investment.",
      },
      {
        q: "When is the cheapest time of year to replace a roof?",
        a: "Late winter and early spring, before the storm season fills every schedule. Prices in the weeks after a major hail event are the highest you will see.",
      },
    ],
    sources: [
      { label: "2026 contractor pricing collected across covered markets", tier: "EDITORIAL" },
      { label: "City of Dallas permit fee schedule", publisher: "City of Dallas", tier: "PRIMARY" },
      { label: "Manufacturer published material specifications", publisher: "GAF, CertainTeed", tier: "SECONDARY" },
    ],
  },
  {
    title: "How to compare moving quotes",
    slug: "compare-moving-quotes",
    type: "EDITORIAL",
    categorySlug: "moving-companies",
    excerpt: "Binding versus non-binding estimates, and what a legitimate mover puts in writing before moving day.",
    shortAnswer:
      "Get a binding or not-to-exceed estimate in writing after an in-home or video survey. A quote given over the phone without seeing your belongings is a guess, and it is the single most common source of moving day disputes.",
    keyTakeaways: [
      "Binding, non-binding and not-to-exceed estimates are three different contracts",
      "Interstate movers must be registered with a USDOT number you can look up",
      "Valuation is not insurance, and the default coverage is very low",
      "A large deposit demand is the clearest warning sign in this trade",
    ],
    readingMinutes: 9,
    publishedMonthsAgo: 4,
    authorSlug: "priya-nathan",
    body: [
      { kind: "heading", text: "The three kinds of estimate", id: "estimates" },
      {
        kind: "paragraph",
        text: "A non-binding estimate can go up on the day. A binding estimate cannot. A binding not-to-exceed estimate can only go down. Movers are not always clear about which one they have handed you, so read the heading on the document.",
      },
      { kind: "heading", text: "Check the registration", id: "registration" },
      {
        kind: "paragraph",
        text: "Interstate movers in the United States must hold a USDOT number, and it is searchable. In Canada, check provincial registration and confirm WSIB or equivalent coverage. A mover unwilling to give you a number is telling you something.",
      },
    ],
    faqs: [
      {
        q: "How much should I put down as a deposit?",
        a: "Little or nothing. Reputable movers generally take payment on delivery. A demand for a large cash deposit weeks in advance is the most reliable warning sign in this trade.",
      },
    ],
  },
  {
    title: "When should you have your chimney inspected?",
    slug: "chimney-inspection-timing",
    type: "EDITORIAL",
    categorySlug: "chimney-services",
    excerpt: "The three inspection levels, seasonal timing, and the signs that should not wait for autumn.",
    shortAnswer:
      "Have a level one inspection annually before the heating season if you use the fireplace regularly and nothing has changed. Move up to level two after a chimney fire, a severe storm, an earthquake, or when you buy or sell the house.",
    keyTakeaways: [
      "Level one is visual, level two adds video and accessible spaces, level three opens up structure",
      "Book in late summer, because sweeps are booked solid from October",
      "A chimney fire requires a level two inspection before the next use",
      "Creosote build-up is the risk that annual sweeping actually addresses",
    ],
    readingMinutes: 7,
    publishedMonthsAgo: 0,
    authorSlug: "dana-whitfield",
    body: [
      { kind: "heading", text: "The three levels", id: "levels" },
      {
        kind: "paragraph",
        text: "The inspection levels are defined in NFPA 211 and every certified sweep works to them. Level one covers readily accessible portions and is what an annual check normally means. Level two adds video scanning of the flue and covers accessible attic and crawl spaces. Level three involves removing parts of the structure and is reserved for suspected serious hazards.",
      },
    ],
  },
  {
    title: "How much does HVAC replacement cost?",
    slug: "hvac-replacement-cost",
    type: "COST",
    categorySlug: "hvac",
    excerpt: "What drives the number, and why sizing matters more than the brand on the box.",
    shortAnswer:
      "A full system replacement typically runs $5,500 to $13,800 installed, with heat pumps at the upper end and straight AC replacements at the lower. Correct load sizing affects both comfort and equipment life more than brand choice does.",
    keyTakeaways: [
      "A Manual J load calculation should come before any quote",
      "Oversized equipment short-cycles and dehumidifies poorly",
      "Ductwork condition often matters more than the equipment",
      "Efficiency ratings pay back differently depending on your climate zone",
    ],
    readingMinutes: 10,
    publishedMonthsAgo: 3,
    authorSlug: "priya-nathan",
    reviewerSlug: "marcus-reed",
    typicalLow: 5500,
    typicalHigh: 13800,
    body: [
      { kind: "heading", text: "Sizing comes first", id: "sizing" },
      {
        kind: "paragraph",
        text: "The single most common installation fault is equipment sized by rule of thumb rather than by a load calculation. Oversized systems cool quickly, shut off, and never run long enough to pull humidity out of the air.",
      },
    ],
    costs: [
      { label: "AC replacement, existing ductwork", low: 5500, high: 9500 },
      { label: "Heat pump replacement", low: 7500, high: 13800 },
      { label: "Furnace replacement", low: 3500, high: 7500 },
      { label: "Repair call", low: 150, high: 600 },
      { label: "Diagnostic fee", low: 75, high: 180 },
      { label: "Full duct replacement", note: "Quoted per project after inspection." },
    ],
  },
  {
    title: "Questions to ask a remodeling contractor",
    slug: "questions-remodeling-contractor",
    type: "EDITORIAL",
    categorySlug: "home-remodeling",
    excerpt: "Settle payment schedule, timeline and change orders before anyone signs.",
    shortAnswer:
      "Ask who is on site daily, how change orders are priced and approved, what the payment schedule is tied to, and what happens if the timeline slips. The answers to those four questions predict most of how a remodel will go.",
    keyTakeaways: [
      "Payment should track completed milestones, not the calendar",
      "Change orders need a written price before work proceeds",
      "Ask who the site supervisor is and how often they attend",
      "Confirm which trades are subcontracted and who holds their insurance",
    ],
    readingMinutes: 8,
    publishedMonthsAgo: 2,
    authorSlug: "priya-nathan",
    body: [
      { kind: "heading", text: "Four questions that matter most", id: "questions" },
      {
        kind: "steps",
        items: [
          { title: "Who is here every day?", body: "A named site supervisor and how often they actually attend." },
          { title: "How are change orders priced?", body: "In writing, with a price agreed before the work proceeds." },
          { title: "What is the payment schedule tied to?", body: "Completed milestones, inspected and agreed, rather than dates." },
          { title: "What happens if we run late?", body: "Whether the contract carries any remedy, and what counts as an excusable delay." },
        ],
      },
    ],
  },
  {
    title: "How to verify a contractor's licence",
    slug: "verify-a-license",
    type: "EDITORIAL",
    excerpt: "Where to look, state by state and province by province, and what to check for once you find the record.",
    shortAnswer:
      "Go to the issuing authority's own register rather than a directory. Confirm the licence is active, that the name matches the company on your estimate, that the classification covers your work, and that there are no open disciplinary actions.",
    keyTakeaways: [
      "Directories copy licence data; the issuing board is the source",
      "The licence holder and the trading company are often different entities",
      "Classification matters: a licence can be real and still not cover your job",
      "Some trades are not licensed anywhere, which changes what you check instead",
    ],
    readingMinutes: 9,
    publishedMonthsAgo: 1,
    authorSlug: "dana-whitfield",
    body: [
      { kind: "heading", text: "Go to the source", id: "source" },
      {
        kind: "paragraph",
        text: "Every licensing authority we work with publishes a searchable register: the CSLB in California, the DBPR in Florida, TDLR in Texas, the ESA and TSSA in Ontario, Technical Safety BC. Those are the records. A licence number printed on a website is a claim until you check it.",
      },
    ],
  },
  {
    title: "How to compare three contractor quotes",
    slug: "compare-contractor-quotes",
    type: "EDITORIAL",
    excerpt: "Scope, materials and warranty terms rarely match. Here is how to line them up.",
    shortAnswer:
      "Build a single line-item sheet and transfer each quote onto it. Differences in price nearly always turn out to be differences in scope, material grade or warranty length, and the sheet makes that visible in a few minutes.",
    keyTakeaways: [
      "Compare scope before price",
      "Material grade is where quotes quietly diverge",
      "A longer warranty can justify a higher price",
      "Exclusions are as informative as inclusions",
    ],
    readingMinutes: 8,
    publishedMonthsAgo: 3,
    authorSlug: "marcus-reed",
    reviewerSlug: "dana-whitfield",
    body: [
      { kind: "heading", text: "Put them on one sheet", id: "sheet" },
      {
        kind: "paragraph",
        text: "List every line item any of the three quotes mentions down the left, then fill in what each company includes. The gaps are the story. A quote missing four rows the others include is not cheaper, it is smaller.",
      },
    ],
  },
];

/* ------------------------------------------------------------- global FAQs */

export const HOME_FAQS = [
  {
    q: "How does TenBestFind pick the ten businesses on a list?",
    a: "We start with every company that genuinely serves the area, then check licensing, years in business, the range of work they take on, and public feedback. The strongest ten go on the page along with the criteria we used. Full detail is on the How We Rank page.",
  },
  {
    q: "Can a business pay to be ranked?",
    a: "No. Editorial lists are not for sale. Businesses can buy a sponsored placement, which appears with a Sponsored label and sits outside the ranked list. Nobody at a sponsoring company sees a ranking before it publishes.",
  },
  {
    q: "How often do you update a ranking?",
    a: "Each list is re-checked on a schedule, and sooner if something significant changes, like a licence lapsing or a company closing. The date on every page is the last time an editor actually reviewed it, not the day the page was created.",
  },
  {
    q: "What if my city is not covered yet?",
    a: "We add cities every month, working outward from the largest metros. If your city is not live, the state or province page will show the nearest covered areas, and you can tell us where to look next through the contact form.",
  },
  {
    q: "Something on a list is wrong. How do I report it?",
    a: "Send us the page and what is out of date through the corrections form. We check reports against primary sources such as licence registries, and we note the change on the page when we make it.",
  },
  {
    q: "I own a business. How do I get considered?",
    a: "Submit your business and we will add it to the research pool for your city and trade. Submitting does not buy a place on a list, but it does make sure we have your licensing, service area and coverage right when we next review that category.",
  },
];

/* ------------------------------------------------- global ranking criteria */

export const GLOBAL_CRITERIA = [
  {
    title: "Reputation",
    body: "Customer feedback and reputation patterns across sources we can verify, read as a pattern rather than a reaction to any single review.",
    importance: "HIGH" as const,
    iconKey: "star",
  },
  {
    title: "Experience",
    body: "Relevant trade experience and time working in the local market, weighted toward the exact type of work rather than the trade in general.",
    importance: "HIGH" as const,
    iconKey: "history",
  },
  {
    title: "Credentials",
    body: "Licensing, certifications and insurance where they apply to the trade, checked against the issuing authority rather than the company website.",
    importance: "HIGH" as const,
    iconKey: "badge",
  },
  {
    title: "Services",
    body: "Range and relevance of the services actually offered, rather than a list of everything the company might take on.",
    importance: "MODERATE" as const,
    iconKey: "layers",
  },
  {
    title: "Local presence",
    body: "Genuine service coverage and relevance to the market being ranked, checked against where recent projects actually are.",
    importance: "MODERATE" as const,
    iconKey: "pin",
  },
  {
    title: "Transparency",
    body: "Clear business information, service details and contact paths, including whether estimates itemize scope.",
    importance: "MODERATE" as const,
    iconKey: "eye",
  },
  {
    title: "Availability",
    body: "Response and scheduling, which matters most in trades where emergencies are common.",
    importance: "SUPPORTING" as const,
    iconKey: "clock",
  },
  {
    title: "Warranty terms",
    body: "Length and scope of workmanship coverage, and whether the terms are provided in writing.",
    importance: "SUPPORTING" as const,
    iconKey: "shield",
  },
  {
    title: "Pricing clarity",
    body: "Whether pricing structure is explained before work begins. We do not rank on price itself.",
    importance: "SUPPORTING" as const,
    iconKey: "coin",
  },
];
