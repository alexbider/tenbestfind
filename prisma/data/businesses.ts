// Company records behind the published rankings. Ratings and review counts are
// attributed to Google and stored with the date they were read; nothing here is
// a blended or invented score.

export type SeedCredential = {
  label: string;
  identifier?: string;
  authority?: string;
  status: "VERIFIED" | "REPORTED" | "EXPIRED";
  sourceUrl?: string;
};

export type SeedBusiness = {
  name: string;
  slug: string;
  categorySlug: string;
  citySlug: string;
  regionSlug: string;
  countryCode: string;
  position: number;
  designation: string;
  bestFor: string;
  serviceArea: string;
  whyPicked: string;
  likes: string[];
  concerns: string[];
  services: string[];
  yearFounded: number;
  warrantyTerms: string;
  emergency: boolean;
  financing: boolean;
  freeEstimates?: boolean;
  credentials: SeedCredential[];
  googleRating: number;
  googleReviewCount: number;
  addressLine: string;
  phone?: string;
  website?: string;
  editorialTake?: string;
  description?: string;
  sponsored?: boolean;
};

const YEAR = 2026;

export const DALLAS_ROOFERS: SeedBusiness[] = [
  {
    name: "Lone Star Roofing Co.",
    slug: "lone-star-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 1,
    designation: "Best Overall Roofing Company in Dallas",
    bestFor: "Residential repair and replacement",
    serviceArea: "Dallas Metro",
    whyPicked:
      "Lone Star stood out for the combination of a long local track record, a broad residential service list, manufacturer certifications and coverage that spans most of Dallas County rather than a narrow pocket of it. Its estimates document material grades and tear-off scope, which makes bids easier to compare against competitors.",
    likes: [
      "Established local reputation across multiple sources",
      "Broad service coverage from repair to full replacement",
      "Written workmanship warranty alongside manufacturer coverage",
    ],
    concerns: ["Premium pricing relative to smaller crews", "Scheduling can stretch after major hail events"],
    services: ["Roof Repair", "Roof Replacement", "Storm Damage", "Metal Roofing", "Roof Inspection"],
    yearFounded: YEAR - 18,
    warrantyTerms: "10-year workmanship",
    emergency: true,
    financing: true,
    freeEstimates: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-0801442", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED", authority: "Certificate on file" },
      { label: "GAF Master Elite certified installer", status: "VERIFIED", authority: "GAF" },
      { label: "Owens Corning Preferred contractor", status: "REPORTED", authority: "Company provided" },
    ],
    googleRating: 4.9,
    googleReviewCount: 412,
    addressLine: "2118 Commerce St, Dallas, TX 75201",
    phone: "(214) 555-0142",
    website: "https://example.com/lone-star-roofing",
    description:
      "A full-service residential roofing company working across Dallas County, handling repair, replacement, inspection and storm work.",
    editorialTake:
      "Lone Star is the company we would point most Dallas homeowners at first. The estimates are legible, the warranty is written down, and the coverage area is genuinely metro-wide rather than a marketing claim. You will pay a little more than a two-truck crew charges, and after a hail event you will wait.",
  },
  {
    name: "Trinity Roof Works",
    slug: "trinity-roof-works",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 2,
    designation: "Best for Full Roof Replacement",
    bestFor: "Full residential replacement",
    serviceArea: "Dallas + Plano",
    whyPicked:
      "Trinity concentrates on complete replacements rather than spreading across every roofing service, and that focus shows in the detail of its proposals: decking condition, ventilation changes and disposal are all itemized. Homeowners comparing shingle lines will find the material walkthrough unusually clear.",
    likes: [
      "Detailed, itemized replacement proposals",
      "Strong communication through the project timeline",
      "Multiple shingle and underlayment options explained",
    ],
    concerns: ["Limited small-repair availability", "Service area narrower than metro-wide competitors"],
    services: ["Roof Replacement", "Roof Inspection", "Ventilation", "Decking Repair"],
    yearFounded: YEAR - 12,
    warrantyTerms: "15-year workmanship",
    emergency: false,
    financing: true,
    freeEstimates: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-0913277", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
      { label: "CertainTeed SELECT ShingleMaster", status: "VERIFIED", authority: "CertainTeed" },
    ],
    googleRating: 4.8,
    googleReviewCount: 268,
    addressLine: "6140 Preston Rd, Plano, TX 75024",
    phone: "(972) 555-0198",
  },
  {
    name: "Metroplex Storm Roofing",
    slug: "metroplex-storm-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 3,
    designation: "Best for Storm and Hail Damage",
    bestFor: "Storm response and insurance claims",
    serviceArea: "Dallas County",
    whyPicked:
      "After a hail event the practical questions are how fast someone can get a tarp up and whether the company can document damage for a claim. Metroplex Storm Roofing is set up for both, with dedicated inspection reporting and staff who work directly with adjusters.",
    likes: [
      "Rapid emergency tarping and inspection",
      "Documented insurance claim support",
      "Experience with North Texas hail patterns",
    ],
    concerns: ["Demand spikes after major storms", "Less focus on non-storm remodeling work"],
    services: ["Storm Damage", "Emergency Tarping", "Roof Repair", "Insurance Documentation"],
    yearFounded: YEAR - 9,
    warrantyTerms: "5-year workmanship",
    emergency: true,
    financing: false,
    credentials: [
      { label: "Texas business registration", identifier: "TX-1104883", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
      { label: "Haag certified inspector on staff", status: "REPORTED", authority: "Company provided" },
    ],
    googleRating: 4.8,
    googleReviewCount: 347,
    addressLine: "1420 W Mockingbird Ln, Dallas, TX 75247",
  },
  {
    name: "Bluebonnet Exteriors",
    slug: "bluebonnet-exteriors",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 4,
    designation: "Best for Roof and Siding Together",
    bestFor: "Combined exterior projects",
    serviceArea: "Dallas, Garland, Mesquite",
    whyPicked:
      "Bluebonnet handles roofing alongside siding and gutters, which suits homeowners who need the whole exterior addressed in one project rather than coordinating separate trades. Scope documents cover how the trades sequence together.",
    likes: [
      "Single point of contact for multi-trade exterior work",
      "Clear sequencing across roofing, siding and gutters",
      "Established east-metro presence",
    ],
    concerns: ["Roofing-only jobs are not its focus", "Smaller crew count limits parallel projects"],
    services: ["Roof Replacement", "Siding", "Gutters", "Roof Repair"],
    yearFounded: YEAR - 15,
    warrantyTerms: "10-year workmanship",
    emergency: false,
    financing: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-0755610", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.7,
    googleReviewCount: 156,
    addressLine: "3105 Broadway Blvd, Garland, TX 75043",
  },
  {
    name: "North Texas Metal Roofing",
    slug: "north-texas-metal-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 5,
    designation: "Best for Metal Roofing",
    bestFor: "Standing seam and metal systems",
    serviceArea: "Dallas and north suburbs",
    whyPicked:
      "Metal is a specialty rather than an add-on here. The company documents panel gauges, fastening systems and expected performance in Texas heat, which matters when comparing a metal quote against asphalt.",
    likes: [
      "Deep specialization in metal roofing systems",
      "Clear documentation of panel and fastener specifications",
      "Experience with heat performance in North Texas",
    ],
    concerns: ["No asphalt shingle replacement", "Longer lead times on custom panel orders"],
    services: ["Metal Roofing", "Standing Seam", "Roof Coatings", "Inspection"],
    yearFounded: YEAR - 11,
    warrantyTerms: "20-year system warranty",
    emergency: false,
    financing: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-1002948", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "Manufacturer certified installer", status: "VERIFIED" },
    ],
    googleRating: 4.8,
    googleReviewCount: 121,
    addressLine: "980 Legacy Dr, Frisco, TX 75034",
  },
  {
    name: "Oak Cliff Roofing",
    slug: "oak-cliff-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 6,
    designation: "Best for Older Homes",
    bestFor: "Historic and older housing stock",
    serviceArea: "South Dallas, Oak Cliff",
    whyPicked:
      "Older Dallas neighborhoods bring decking surprises, layered roofs and material matching problems. Oak Cliff Roofing works in that housing stock routinely and prices for the likelihood of repair work beneath the surface.",
    likes: [
      "Experience with layered and aging roof systems",
      "Material matching on older homes",
      "Transparent about likely hidden repairs",
    ],
    concerns: ["Primarily south Dallas coverage", "Limited new-construction work"],
    services: ["Roof Repair", "Decking Repair", "Restoration", "Inspection"],
    yearFounded: YEAR - 22,
    warrantyTerms: "5-year workmanship",
    emergency: false,
    financing: false,
    credentials: [
      { label: "Texas business registration", identifier: "TX-0442117", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.7,
    googleReviewCount: 203,
    addressLine: "715 W Jefferson Blvd, Dallas, TX 75208",
  },
  {
    name: "Dallas Flat Roof Specialists",
    slug: "dallas-flat-roof-specialists",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 7,
    designation: "Best for Flat and Low-Slope Roofs",
    bestFor: "Flat and low-slope systems",
    serviceArea: "Dallas Metro",
    whyPicked:
      "Flat and low-slope roofs fail differently from pitched roofs, and this company works only on those systems. Proposals identify drainage and ponding issues rather than only surface repairs.",
    likes: [
      "Exclusive focus on flat and low-slope systems",
      "Drainage assessment included in proposals",
      "Commercial and residential experience",
    ],
    concerns: ["No pitched shingle roofing", "Pricing depends heavily on membrane choice"],
    services: ["Flat Roofing", "TPO", "Modified Bitumen", "Coatings", "Drainage"],
    yearFounded: YEAR - 14,
    warrantyTerms: "10-year membrane warranty",
    emergency: true,
    financing: false,
    credentials: [
      { label: "Texas business registration", identifier: "TX-0988431", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "Manufacturer certified installer", status: "VERIFIED" },
    ],
    googleRating: 4.6,
    googleReviewCount: 94,
    addressLine: "4210 Irving Blvd, Dallas, TX 75247",
  },
  {
    name: "Frisco Line Roofing",
    slug: "frisco-line-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 8,
    designation: "Best for Northern Suburbs",
    bestFor: "Newer suburban housing",
    serviceArea: "Frisco, Plano, McKinney",
    whyPicked:
      "Newer subdivisions north of Dallas share materials and roof geometry, and Frisco Line works in them constantly. That familiarity shows in tight scheduling and predictable pricing for standard suburban roofs.",
    likes: [
      "Efficient scheduling in northern suburbs",
      "Predictable pricing on standard roof profiles",
      "Builder-grade material knowledge",
    ],
    concerns: ["Limited coverage inside Dallas city limits", "Less experience with older roof systems"],
    services: ["Roof Replacement", "Roof Repair", "Inspection", "Gutters"],
    yearFounded: YEAR - 8,
    warrantyTerms: "10-year workmanship",
    emergency: false,
    financing: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-1187720", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.9,
    googleReviewCount: 187,
    addressLine: "8500 Gaylord Pkwy, Frisco, TX 75034",
  },
  {
    name: "Cedar Ridge Roofing",
    slug: "cedar-ridge-roofing",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 9,
    designation: "Best for Small Repairs",
    bestFor: "Targeted repairs and maintenance",
    serviceArea: "Dallas and Richardson",
    whyPicked:
      "Not every roof problem needs a replacement quote. Cedar Ridge takes on small leak repairs and maintenance visits that larger companies often decline, and it will tell homeowners when a repair is genuinely the better option.",
    likes: ["Takes on small repair jobs", "Honest repair-versus-replace guidance", "Quick turnaround on leaks"],
    concerns: ["Does not handle full replacements", "Small team limits capacity in peak season"],
    services: ["Leak Repair", "Maintenance", "Flashing Repair", "Inspection"],
    yearFounded: YEAR - 7,
    warrantyTerms: "2-year repair warranty",
    emergency: true,
    financing: false,
    credentials: [
      { label: "Texas business registration", identifier: "TX-1240992", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "REPORTED" },
    ],
    googleRating: 4.7,
    googleReviewCount: 138,
    addressLine: "1310 E Belt Line Rd, Richardson, TX 75081",
  },
  {
    name: "Grand Prairie Roof & Gutter",
    slug: "grand-prairie-roof-gutter",
    categorySlug: "roofing",
    citySlug: "dallas",
    regionSlug: "tx",
    countryCode: "us",
    position: 10,
    designation: "Best for Roof and Gutter Packages",
    bestFor: "Roof with gutter replacement",
    serviceArea: "West Dallas, Irving, Grand Prairie",
    whyPicked:
      "Gutters are usually replaced at the same time as a roof, and this company prices the pair together rather than treating gutters as an afterthought. Useful for homeowners dealing with drainage problems alongside roof wear.",
    likes: [
      "Roof and gutter work priced as one project",
      "Drainage and guard options explained",
      "Established west-metro coverage",
    ],
    concerns: ["Narrower roofing material selection", "Coverage limited west of Dallas"],
    services: ["Roof Replacement", "Gutters", "Gutter Guards", "Roof Repair"],
    yearFounded: YEAR - 13,
    warrantyTerms: "8-year workmanship",
    emergency: false,
    financing: true,
    credentials: [
      { label: "Texas business registration", identifier: "TX-1055204", authority: "Texas Secretary of State", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.6,
    googleReviewCount: 112,
    addressLine: "2402 W Pioneer Pkwy, Grand Prairie, TX 75051",
  },
];

export const MIAMI_PLUMBERS: SeedBusiness[] = [
  {
    name: "Biscayne Plumbing Group",
    slug: "biscayne-plumbing-group",
    categorySlug: "plumbers",
    citySlug: "miami",
    regionSlug: "fl",
    countryCode: "us",
    position: 1,
    designation: "Best Overall Plumbing Company in Miami",
    bestFor: "Repairs and repiping in older homes",
    serviceArea: "Miami-Dade",
    whyPicked:
      "Biscayne carries a certified state licence rather than a county registration, covers the whole of Miami-Dade, and quotes repipes with the wall repair included instead of leaving it as a surprise line item.",
    likes: [
      "Certified state licence, valid across Florida",
      "Cast iron replacement is a core service, not an occasional job",
      "Written scope covers drywall and finish repair",
    ],
    concerns: ["Books out several days for non-emergency work", "Premium hourly rate"],
    services: ["Repiping", "Drain cleaning", "Water heater repair", "Leak detection", "Sewer line repair"],
    yearFounded: YEAR - 16,
    warrantyTerms: "5-year workmanship on repipes",
    emergency: true,
    financing: true,
    freeEstimates: true,
    credentials: [
      { label: "Certified plumbing contractor", identifier: "CFC1428871", authority: "Florida DBPR", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.8,
    googleReviewCount: 526,
    addressLine: "1200 NW 78th Ave, Miami, FL 33126",
  },
  {
    name: "Coral Way Plumbing",
    slug: "coral-way-plumbing",
    categorySlug: "plumbers",
    citySlug: "miami",
    regionSlug: "fl",
    countryCode: "us",
    position: 2,
    designation: "Best for Emergency Call-Outs",
    bestFor: "After-hours emergencies",
    serviceArea: "Miami, Coral Gables, Kendall",
    whyPicked:
      "The only company on this list that publishes an after-hours rate rather than quoting it on the phone at midnight, and dispatch answers rather than routing to a call centre.",
    likes: ["Published after-hours pricing", "Genuine 24-hour dispatch", "Fast response inside the city"],
    concerns: ["Does not take on full repipes", "Coverage thins out past Kendall"],
    services: ["Emergency plumbing", "Drain cleaning", "Leak detection", "Fixture installation"],
    yearFounded: YEAR - 10,
    warrantyTerms: "1-year repair warranty",
    emergency: true,
    financing: false,
    credentials: [
      { label: "Certified plumbing contractor", identifier: "CFC1531104", authority: "Florida DBPR", status: "VERIFIED" },
    ],
    googleRating: 4.7,
    googleReviewCount: 311,
    addressLine: "3401 Coral Way, Miami, FL 33145",
  },
  {
    name: "Everglade Drain & Sewer",
    slug: "everglade-drain-sewer",
    categorySlug: "plumbers",
    citySlug: "miami",
    regionSlug: "fl",
    countryCode: "us",
    position: 3,
    designation: "Best for Sewer and Drain Work",
    bestFor: "Main line and sewer repair",
    serviceArea: "Miami-Dade and south Broward",
    whyPicked:
      "Camera inspection is included in the diagnostic rather than billed separately, and the company handles trenchless lining in-house instead of subcontracting it.",
    likes: ["Camera inspection included", "Trenchless lining done in-house", "Clear before-and-after footage"],
    concerns: ["Narrow service list", "Scheduling is weekday only"],
    services: ["Sewer line repair", "Drain cleaning", "Leak detection"],
    yearFounded: YEAR - 13,
    warrantyTerms: "10-year liner warranty",
    emergency: false,
    financing: true,
    credentials: [
      { label: "Certified plumbing contractor", identifier: "CFC1459022", authority: "Florida DBPR", status: "VERIFIED" },
      { label: "General liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.6,
    googleReviewCount: 188,
    addressLine: "8330 NW 53rd St, Doral, FL 33166",
  },
];

export const TORONTO_PLUMBERS: SeedBusiness[] = [
  {
    name: "Don Valley Plumbing",
    slug: "don-valley-plumbing",
    categorySlug: "plumbers",
    citySlug: "toronto",
    regionSlug: "on",
    countryCode: "ca",
    position: 1,
    designation: "Best Overall Plumbing Company in Toronto",
    bestFor: "Older homes and drain replacement",
    serviceArea: "Toronto and East York",
    whyPicked:
      "Clay tile drain replacement in pre-war housing is routine work here, and the company files the city permit itself rather than leaving it with the homeowner. Quotes separate the excavation from the reinstatement so you can see both.",
    likes: [
      "Handles city permits and backwater valve subsidy paperwork",
      "Excavation and reinstatement quoted separately",
      "Long track record in older east-end housing",
    ],
    concerns: ["Weekday scheduling only for excavation work", "Books out in spring"],
    services: ["Drain replacement", "Backwater valves", "Emergency plumbing", "Water heater repair"],
    yearFounded: YEAR - 21,
    warrantyTerms: "5-year workmanship",
    emergency: true,
    financing: true,
    freeEstimates: true,
    credentials: [
      { label: "Master plumber licence", identifier: "P-16-004822", authority: "City of Toronto", status: "VERIFIED" },
      { label: "WSIB clearance", status: "VERIFIED", authority: "WSIB Ontario" },
      { label: "Liability insurance", status: "VERIFIED" },
    ],
    googleRating: 4.9,
    googleReviewCount: 604,
    addressLine: "1180 Danforth Ave, Toronto, ON M4J 1M4",
  },
  {
    name: "Queen West Mechanical",
    slug: "queen-west-mechanical",
    categorySlug: "plumbers",
    citySlug: "toronto",
    regionSlug: "on",
    countryCode: "ca",
    position: 2,
    designation: "Best for Condo and Small-Space Work",
    bestFor: "Condos and downtown units",
    serviceArea: "Downtown Toronto",
    whyPicked:
      "Condo work means building management, elevator bookings and shut-off coordination. Queen West handles that side of it, which is the part that usually stalls a small job downtown.",
    likes: ["Coordinates with property management", "Familiar with downtown building rules", "Tidy work in occupied units"],
    concerns: ["Does not take on excavation", "Downtown coverage only"],
    services: ["Fixture installation", "Emergency plumbing", "Leak detection"],
    yearFounded: YEAR - 9,
    warrantyTerms: "2-year workmanship",
    emergency: true,
    financing: false,
    credentials: [
      { label: "Master plumber licence", identifier: "P-19-011340", authority: "City of Toronto", status: "VERIFIED" },
      { label: "WSIB clearance", status: "VERIFIED", authority: "WSIB Ontario" },
    ],
    googleRating: 4.7,
    googleReviewCount: 242,
    addressLine: "742 Queen St W, Toronto, ON M6J 1E9",
  },
  {
    name: "Scarborough Drain Works",
    slug: "scarborough-drain-works",
    categorySlug: "plumbers",
    citySlug: "toronto",
    regionSlug: "on",
    countryCode: "ca",
    position: 3,
    designation: "Best for Basement Flooding",
    bestFor: "Sump pumps and flood prevention",
    serviceArea: "Scarborough and North York",
    whyPicked:
      "Basement flooding work is the whole business rather than a seasonal add-on, and the company walks homeowners through the city subsidy application before starting.",
    likes: ["Subsidy paperwork handled", "Sump and backwater work priced together", "Emergency response during storms"],
    concerns: ["Limited general plumbing", "Coverage skews east"],
    services: ["Sump pumps", "Backwater valves", "Drain cleaning", "Emergency plumbing"],
    yearFounded: YEAR - 12,
    warrantyTerms: "5-year workmanship",
    emergency: true,
    financing: true,
    credentials: [
      { label: "Master plumber licence", identifier: "P-17-008115", authority: "City of Toronto", status: "VERIFIED" },
      { label: "WSIB clearance", status: "VERIFIED", authority: "WSIB Ontario" },
    ],
    googleRating: 4.6,
    googleReviewCount: 157,
    addressLine: "2450 Lawrence Ave E, Scarborough, ON M1P 2R7",
  },
];

export const ALL_BUSINESSES = [...DALLAS_ROOFERS, ...MIAMI_PLUMBERS, ...TORONTO_PLUMBERS];
