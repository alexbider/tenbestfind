import type { ConditionRow, LicensingRow } from "@/lib/json";

export type SeedCity = {
  name: string;
  slug: string;
  county?: string;
  population?: number;
  topMetro?: boolean;
  blurb?: string;
  conditions?: ConditionRow[];
  neighborhoods?: string[];
};

export type SeedRegion = {
  code: string;
  name: string;
  slug: string;
  groupName: string;
  blurb?: string;
  licensing?: LicensingRow[];
  cities: SeedCity[];
};

export type SeedCountry = {
  code: string;
  name: string;
  slug: string;
  demonym: string;
  currency: string;
  regionLabel: string;
  blurb: string;
  regions: SeedRegion[];
};

const TEXAS_LICENSING: LicensingRow[] = [
  {
    trade: "Plumbing",
    authority: "Texas State Board of Plumbing Examiners",
    licensed: true,
    note: "Master and journeyman licences are issued at state level and searchable online.",
  },
  {
    trade: "Electrical",
    authority: "Texas Department of Licensing and Regulation",
    licensed: true,
    note: "TDLR licenses both electricians and electrical contractors.",
  },
  {
    trade: "HVAC",
    authority: "Texas Department of Licensing and Regulation",
    licensed: true,
    note: "Air conditioning and refrigeration contractors hold a TDLR licence with a class A or B endorsement.",
  },
  {
    trade: "Roofing",
    authority: "None at state level",
    licensed: false,
    note: "Texas does not license roofers. Check general liability insurance and manufacturer certifications instead.",
  },
  {
    trade: "Mold remediation",
    authority: "Texas Department of Licensing and Regulation",
    licensed: true,
    note: "Remediation contractors and consultants are licensed separately.",
  },
];

const FLORIDA_LICENSING: LicensingRow[] = [
  {
    trade: "Plumbing",
    authority: "Florida DBPR, Construction Industry Licensing Board",
    licensed: true,
    note: "Certified plumbing contractors can work statewide; registered contractors are limited to their local jurisdiction.",
  },
  {
    trade: "Electrical",
    authority: "Florida Electrical Contractors Licensing Board",
    licensed: true,
  },
  {
    trade: "HVAC",
    authority: "Florida DBPR",
    licensed: true,
    note: "Class A and Class B air conditioning licences differ by the tonnage the holder may install.",
  },
  {
    trade: "Roofing",
    authority: "Florida DBPR",
    licensed: true,
    note: "Florida is one of the states that does license roofers, which makes verification straightforward.",
  },
];

const ONTARIO_LICENSING: LicensingRow[] = [
  {
    trade: "Electrical",
    authority: "Electrical Safety Authority",
    licensed: true,
    note: "Every electrical contractor needs an ECRA/ESA licence number, and it belongs on the estimate.",
  },
  {
    trade: "Gas and heating",
    authority: "Technical Standards and Safety Authority",
    licensed: true,
    note: "TSSA certification covers gas fitters and the contractors employing them.",
  },
  {
    trade: "Plumbing",
    authority: "Ontario College of Trades / municipal permits",
    licensed: true,
    note: "Plumbing is a compulsory trade; permits are pulled through the municipality.",
  },
  {
    trade: "Roofing",
    authority: "None at provincial level",
    licensed: false,
    note: "Confirm WSIB coverage and liability insurance, since the trade itself is not licensed.",
  },
];

const BC_LICENSING: LicensingRow[] = [
  {
    trade: "Electrical",
    authority: "Technical Safety BC",
    licensed: true,
  },
  {
    trade: "Gas and heating",
    authority: "Technical Safety BC",
    licensed: true,
  },
  {
    trade: "New home construction",
    authority: "BC Housing Licensing and Consumer Services",
    licensed: true,
    note: "Residential builders must be licensed and provide third-party home warranty insurance.",
  },
];

const DALLAS_CONDITIONS: ConditionRow[] = [
  {
    title: "Hail Alley",
    body: "North Texas sits in one of the most active hail corridors in the country. Impact-resistant shingles and insurance-funded replacement are routine conversations here, not upsells.",
    iconKey: "cloud",
  },
  {
    title: "Zone 3A heat",
    body: "Cooling runs most of the year, so equipment sizing and duct sealing matter more than the brand on the box. Systems fail in July, when every company is already booked.",
    iconKey: "sun",
  },
  {
    title: "Expansive clay soils",
    body: "Blackland Prairie clay swells and shrinks with moisture, which is why foundation work and slab plumbing leaks come up so often in this market.",
    iconKey: "foundation",
  },
  {
    title: "Insurance-driven work",
    body: "A large share of roofing and restoration jobs run through a claim. Ask how a company handles supplements and whether it will work with your adjuster.",
    iconKey: "shield",
  },
  {
    title: "City permits",
    body: "Dallas pulls permits through its own building inspection department, and fees differ from Plano, Irving and Arlington. Confirm who is filing.",
    iconKey: "doc",
  },
  {
    title: "Seasonal backlogs",
    body: "After a spring storm, lead times stretch for weeks. Companies that answer quickly in April are not always the ones with capacity in May.",
    iconKey: "clock",
  },
];

const MIAMI_CONDITIONS: ConditionRow[] = [
  {
    title: "High Velocity Hurricane Zone",
    body: "Miami-Dade and Broward have their own product approval regime. Roofing and window products must carry a Notice of Acceptance, not just a Florida approval.",
    iconKey: "waves",
  },
  {
    title: "Salt air corrosion",
    body: "Coastal exposure shortens the life of fasteners, condenser coils and metal trim. Materials rated for coastal use cost more and last considerably longer.",
    iconKey: "waves",
  },
  {
    title: "Year-round humidity",
    body: "Moisture drives mold work and makes drainage and ventilation details more important than they are further north.",
    iconKey: "droplet",
  },
  {
    title: "Older housing stock",
    body: "Cast iron drain lines and aging electrical panels are common in pre-1980 homes, which is why repiping and panel upgrades come up so often.",
    iconKey: "house",
  },
];

const TORONTO_CONDITIONS: ConditionRow[] = [
  {
    title: "Freeze-thaw cycles",
    body: "Repeated freezing splits masonry, lifts flashing and cracks driveways. Work scheduled for late autumn often has to wait for spring.",
    iconKey: "snow",
  },
  {
    title: "Older downtown housing",
    body: "Knob-and-tube wiring and clay drain tile still turn up in pre-war homes, which shapes both the price and the permit path.",
    iconKey: "house",
  },
  {
    title: "Basement flooding",
    body: "The city runs a basement flooding protection subsidy, so backwater valve and sump pump work is common and partly funded.",
    iconKey: "droplet",
  },
  {
    title: "Permit timelines",
    body: "Toronto Building reviews can take weeks in peak season. Ask who is applying and when they expect approval.",
    iconKey: "doc",
  },
];

export const COUNTRIES: SeedCountry[] = [
  {
    code: "us",
    name: "United States",
    slug: "united-states",
    demonym: "American",
    currency: "USD",
    regionLabel: "states",
    blurb:
      "City lists across all 50 states, from the big metros down to regional markets. Licensing is set state by state, so every list is checked against the board that actually issues the licence.",
    regions: [
      {
        code: "ny",
        name: "New York",
        slug: "ny",
        groupName: "Northeast",
        blurb: "Dense older housing stock, strict local permitting and a wide gap between city and upstate pricing.",
        cities: [
          { name: "New York", slug: "new-york", county: "New York County", population: 8336817, topMetro: true },
          { name: "Buffalo", slug: "buffalo", county: "Erie County", population: 278349 },
        ],
      },
      {
        code: "nj",
        name: "New Jersey",
        slug: "nj",
        groupName: "Northeast",
        cities: [{ name: "Newark", slug: "newark", county: "Essex County", population: 311549 }],
      },
      {
        code: "pa",
        name: "Pennsylvania",
        slug: "pa",
        groupName: "Northeast",
        cities: [{ name: "Philadelphia", slug: "philadelphia", county: "Philadelphia County", population: 1603797 }],
      },
      {
        code: "ma",
        name: "Massachusetts",
        slug: "ma",
        groupName: "Northeast",
        cities: [
          {
            name: "Boston",
            slug: "boston",
            county: "Suffolk County",
            population: 675647,
            blurb: "Old masonry chimneys, tight urban access and a short exterior work season.",
          },
        ],
      },
      {
        code: "fl",
        name: "Florida",
        slug: "fl",
        groupName: "South",
        blurb:
          "Florida licenses more trades than most states, including roofing, which makes credential checks unusually straightforward here.",
        licensing: FLORIDA_LICENSING,
        cities: [
          {
            name: "Miami",
            slug: "miami",
            county: "Miami-Dade County",
            population: 442241,
            topMetro: true,
            blurb:
              "Miami work is shaped by the High Velocity Hurricane Zone, salt air and a large stock of pre-1980 homes.",
            conditions: MIAMI_CONDITIONS,
            neighborhoods: ["Brickell", "Coral Gables", "Coconut Grove", "Little Havana", "Wynwood", "Kendall"],
          },
          { name: "Tampa", slug: "tampa", county: "Hillsborough County", population: 384959 },
          { name: "Orlando", slug: "orlando", county: "Orange County", population: 307573 },
        ],
      },
      {
        code: "tx",
        name: "Texas",
        slug: "tx",
        groupName: "South",
        blurb:
          "Texas licenses plumbing, electrical, HVAC and mold work at state level but does not license roofers at all, which changes how you verify a contractor by trade.",
        licensing: TEXAS_LICENSING,
        cities: [
          {
            name: "Dallas",
            slug: "dallas",
            county: "Dallas County",
            population: 1304379,
            topMetro: true,
            blurb:
              "Hail, heat and expansive clay soil drive most of the home service work in Dallas. Roofing and foundation jobs dominate, and insurance is often involved.",
            conditions: DALLAS_CONDITIONS,
            neighborhoods: [
              "Lakewood",
              "Oak Cliff",
              "Preston Hollow",
              "Deep Ellum",
              "Bishop Arts",
              "Uptown",
              "Lake Highlands",
              "Casa Linda",
            ],
          },
          { name: "Houston", slug: "houston", county: "Harris County", population: 2304580 },
          { name: "Austin", slug: "austin", county: "Travis County", population: 961855 },
          { name: "San Antonio", slug: "san-antonio", county: "Bexar County", population: 1434625 },
        ],
      },
      {
        code: "ga",
        name: "Georgia",
        slug: "ga",
        groupName: "South",
        cities: [{ name: "Atlanta", slug: "atlanta", county: "Fulton County", population: 498715, topMetro: true }],
      },
      {
        code: "nc",
        name: "North Carolina",
        slug: "nc",
        groupName: "South",
        cities: [{ name: "Charlotte", slug: "charlotte", county: "Mecklenburg County", population: 874579 }],
      },
      {
        code: "il",
        name: "Illinois",
        slug: "il",
        groupName: "Midwest",
        cities: [{ name: "Chicago", slug: "chicago", county: "Cook County", population: 2746388, topMetro: true }],
      },
      {
        code: "oh",
        name: "Ohio",
        slug: "oh",
        groupName: "Midwest",
        cities: [{ name: "Columbus", slug: "columbus", county: "Franklin County", population: 905748 }],
      },
      {
        code: "mi",
        name: "Michigan",
        slug: "mi",
        groupName: "Midwest",
        cities: [{ name: "Detroit", slug: "detroit", county: "Wayne County", population: 639111 }],
      },
      {
        code: "mn",
        name: "Minnesota",
        slug: "mn",
        groupName: "Midwest",
        cities: [{ name: "Minneapolis", slug: "minneapolis", county: "Hennepin County", population: 429954 }],
      },
      {
        code: "ca",
        name: "California",
        slug: "ca",
        groupName: "West",
        blurb:
          "The Contractors State License Board licenses nearly every trade in California, and its lookup tool is the fastest credential check in the country.",
        cities: [
          { name: "Los Angeles", slug: "los-angeles", county: "Los Angeles County", population: 3898747, topMetro: true },
          { name: "San Diego", slug: "san-diego", county: "San Diego County", population: 1386932 },
        ],
      },
      {
        code: "az",
        name: "Arizona",
        slug: "az",
        groupName: "West",
        cities: [
          {
            name: "Phoenix",
            slug: "phoenix",
            county: "Maricopa County",
            population: 1608139,
            topMetro: true,
            blurb: "Extreme cooling loads, termite pressure and monsoon storm damage shape the work here.",
          },
        ],
      },
      {
        code: "wa",
        name: "Washington",
        slug: "wa",
        groupName: "West",
        cities: [{ name: "Seattle", slug: "seattle", county: "King County", population: 737015, topMetro: true }],
      },
      {
        code: "co",
        name: "Colorado",
        slug: "co",
        groupName: "West",
        cities: [{ name: "Denver", slug: "denver", county: "Denver County", population: 715522 }],
      },
    ],
  },
  {
    code: "ca",
    name: "Canada",
    slug: "canada",
    demonym: "Canadian",
    currency: "CAD",
    regionLabel: "provinces",
    blurb:
      "City lists across every province, with provincial licensing checked separately. Electrical and gas work carries its own provincial authority, and workers compensation coverage is a separate check again.",
    regions: [
      {
        code: "on",
        name: "Ontario",
        slug: "on",
        groupName: "Central",
        blurb:
          "Electrical work runs through the ESA and gas work through the TSSA. Both licence numbers are public, and both belong on a written estimate.",
        licensing: ONTARIO_LICENSING,
        cities: [
          {
            name: "Toronto",
            slug: "toronto",
            county: "Toronto Division",
            population: 2794356,
            topMetro: true,
            blurb:
              "Freeze-thaw damage, older downtown housing and basement flooding drive much of the residential work in Toronto.",
            conditions: TORONTO_CONDITIONS,
            neighborhoods: ["The Beaches", "Leslieville", "High Park", "North York", "Scarborough", "Etobicoke"],
          },
          { name: "Ottawa", slug: "ottawa", county: "Ottawa Division", population: 1017449, topMetro: true },
          { name: "Mississauga", slug: "mississauga", county: "Peel Region", population: 717961 },
          { name: "Hamilton", slug: "hamilton", county: "Hamilton Division", population: 569353 },
        ],
      },
      {
        code: "qc",
        name: "Quebec",
        slug: "qc",
        groupName: "Central",
        blurb:
          "The Régie du bâtiment du Québec licenses contractors, and its register is the place to confirm a licence class before signing.",
        cities: [{ name: "Montreal", slug: "montreal", county: "Montréal", population: 1762949, topMetro: true }],
      },
      {
        code: "bc",
        name: "British Columbia",
        slug: "bc",
        groupName: "Western",
        blurb:
          "Technical Safety BC handles electrical and gas permits, and residential builders are licensed separately through BC Housing.",
        licensing: BC_LICENSING,
        cities: [
          {
            name: "Vancouver",
            slug: "vancouver",
            county: "Metro Vancouver",
            population: 662248,
            topMetro: true,
            blurb: "A wet climate makes roofing detail, drainage and building envelope work the dominant categories.",
          },
          { name: "Victoria", slug: "victoria", county: "Capital Regional District", population: 91867 },
        ],
      },
      {
        code: "ab",
        name: "Alberta",
        slug: "ab",
        groupName: "Western",
        cities: [
          {
            name: "Calgary",
            slug: "calgary",
            county: "Calgary Division",
            population: 1306784,
            topMetro: true,
            blurb: "Hail exposure and a long heating season put roofing and furnace work at the top of the list.",
          },
          { name: "Edmonton", slug: "edmonton", county: "Edmonton Division", population: 1010899, topMetro: true },
        ],
      },
      {
        code: "sk",
        name: "Saskatchewan",
        slug: "sk",
        groupName: "Western",
        cities: [{ name: "Saskatoon", slug: "saskatoon", population: 266141 }],
      },
      {
        code: "mb",
        name: "Manitoba",
        slug: "mb",
        groupName: "Western",
        cities: [{ name: "Winnipeg", slug: "winnipeg", population: 749607, topMetro: true }],
      },
      {
        code: "ns",
        name: "Nova Scotia",
        slug: "ns",
        groupName: "Atlantic",
        cities: [{ name: "Halifax", slug: "halifax", population: 439819, topMetro: true }],
      },
      {
        code: "nb",
        name: "New Brunswick",
        slug: "nb",
        groupName: "Atlantic",
        cities: [{ name: "Moncton", slug: "moncton", population: 79470 }],
      },
      {
        code: "nl",
        name: "Newfoundland and Labrador",
        slug: "nl",
        groupName: "Atlantic",
        cities: [{ name: "St. John's", slug: "st-johns", population: 110525 }],
      },
      {
        code: "pe",
        name: "Prince Edward Island",
        slug: "pe",
        groupName: "Atlantic",
        cities: [{ name: "Charlottetown", slug: "charlottetown", population: 38809 }],
      },
      {
        code: "yt",
        name: "Yukon",
        slug: "yt",
        groupName: "Northern",
        cities: [{ name: "Whitehorse", slug: "whitehorse", population: 28201 }],
      },
      {
        code: "nt",
        name: "Northwest Territories",
        slug: "nt",
        groupName: "Northern",
        cities: [{ name: "Yellowknife", slug: "yellowknife", population: 20340 }],
      },
      {
        code: "nu",
        name: "Nunavut",
        slug: "nu",
        groupName: "Northern",
        cities: [{ name: "Iqaluit", slug: "iqaluit", population: 7429 }],
      },
    ],
  },
];
