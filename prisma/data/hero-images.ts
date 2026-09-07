/**
 * Source images for the empty hero slots on the core pages.
 *
 * Every `heroImage` on the site was null, so the country cards, the guide
 * cards and the location hubs were all drawing the grey placeholder. These
 * were generated to fill them.
 *
 * The URLs here are where an image is fetched from, once. They are not what
 * the site serves: `scripts/ingest-hero-images.ts` downloads each one into
 * MEDIA_DIR and stores the resulting `/uploads/...` path on the record, so
 * after the first run the pages are served entirely from our own domain and
 * nothing here is load-bearing. Re-running is a no-op for anything already
 * fetched.
 *
 * `key` is the record's own identifier: a country code, a `country/region`
 * pair, a `country/region/city` triple, or a guide slug.
 */

export type HeroImageKind = "country" | "region" | "city" | "guide";

export type HeroImageSource = {
  kind: HeroImageKind;
  key: string;
  url: string;
  /** What was asked for, kept so a later regeneration can match the set. */
  brief: string;
  /**
   * Bumped when an image is re-shot. The ingest puts it in the filename, so a
   * record still holding an earlier revision is replaced and its files swept,
   * while one already on this revision is left alone. Absent means 1.
   */
  revision?: number;
};

export const HERO_IMAGES: HeroImageSource[] = [
  {
    kind: "country",
    key: "us",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_fae1e027-4549-45a0-b5aa-d824d8d8df33.png",
    brief: "Suburban American residential street in late afternoon light, work van at the kerb",
  },
  {
    kind: "country",
    key: "ca",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_f280795b-0720-4c1d-85cb-a7f82683bbfe.png",
    brief: "Canadian residential street in early autumn, maples turning, steep pitched roofs",
  },
  {
    kind: "city",
    key: "us/fl/miami",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_b8ff1280-baf7-41b5-a9e5-97dfeafc3d68.png",
    brief: "Ocean Drive and the South Beach Art Deco hotels, Miami",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/on/toronto",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_1095ed76-1e27-4771-a4f6-4a5c29602e14.png",
    brief: "The CN Tower and the Toronto skyline from the Toronto Islands",
    revision: 2,
  },
  {
    kind: "guide",
    key: "compare-moving-quotes",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_6101844f-23d6-4adc-ba08-d863b5e06d40.png",
    brief: "Two movers carrying a wrapped sofa down the ramp of a box truck",
  },
  {
    kind: "guide",
    key: "hvac-replacement-cost",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_3fb90aa9-1b86-420f-96d2-71a7162f4111.png",
    brief: "HVAC technician beside a new outdoor condenser unit, gauges and line set visible",
  },
  {
    kind: "guide",
    key: "compare-contractor-quotes",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_af34acd1-f7d7-48f3-877d-afffb42c859c.png",
    brief: "Three printed estimates side by side on a kitchen table, hands comparing two",
  },
  {
    kind: "guide",
    key: "how-to-choose-a-roofing-contractor",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_7ffeb0f9-3931-4930-b9eb-e4f4bb812672.png",
    brief: "Roofing crew setting a course of asphalt shingles, harness line visible",
  },
  {
    kind: "guide",
    key: "questions-remodeling-contractor",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_08acb979-d8ce-44e9-a4c7-5eee5d00a168.png",
    brief: "Contractor and homeowner talking in a half-finished kitchen",
  },
  {
    kind: "guide",
    key: "roof-replacement-cost",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_e43fd7f3-ab46-474d-9d40-45fdab2c735f.png",
    brief: "Roof half stripped to bare decking, new underlayment on the other half",
  },
  {
    kind: "guide",
    key: "verify-a-license",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_409fe8a5-b2a4-4fe1-8b48-36e8be6a0486.png",
    brief: "A licence card held up against a laptop showing the issuing register",
  },
  {
    kind: "guide",
    key: "chimney-inspection-timing",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_a7ded465-61d3-4f46-ab4e-d7f523493040.png",
    brief: "Chimney sweep on a roof inspecting a brick chimney with a camera probe",
  },
  {
    kind: "city",
    key: "us/ga/atlanta",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_bb962759-bbe0-47b6-8bf8-060b09ebd6ad.png",
    brief: "Midtown Atlanta from the lawn of Piedmont Park",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/tx/austin",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_b77a5497-f3ab-4746-aece-de957a2f0f3c.png",
    brief: "The Austin skyline from the Congress Avenue Bridge over Lady Bird Lake",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/ma/boston",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053505_de8b63c5-af92-4b4d-8b4d-41142aaeed10.png",
    brief: "A cobblestone lane on Beacon Hill, Boston",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/ny/buffalo",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_9d2e5cbb-3ad4-4cee-899b-54d1a43b7bd8.png",
    brief: "Buffalo City Hall across Niagara Square",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/ab/calgary",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_b93c31e9-23fd-4fbf-a528-228bba767eb1.png",
    brief: "The Calgary Tower and downtown from the Bow River pathway",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/nc/charlotte",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_fec3b0f6-8e0c-47b5-9318-b0e034cb4567.png",
    brief: "Uptown Charlotte from Romare Bearden Park",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/pe/charlottetown",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_40188c83-4db2-46b3-b9c9-ad2916e65577.png",
    brief: "Great George Street and St Dunstan's Basilica, Charlottetown",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/il/chicago",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_bd17897e-7f87-42a5-9390-a863a33cad3d.png",
    brief: "The Wrigley Building and Tribune Tower from the DuSable Bridge, Chicago",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/oh/columbus",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_0a1bfa4f-a408-448f-8683-574b0532b3e7.png",
    brief: "The LeVeque Tower across the Scioto, Columbus",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/tx/dallas",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053152_cfabbccb-c1b2-470c-a13f-2e1d1dc68072.png",
    brief: "Reunion Tower and the Dallas skyline at dusk",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/co/denver",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_db6c343d-3420-49d1-b1cf-d3c92d241a6f.png",
    brief: "Denver Union Station at dusk",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/mi/detroit",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053220_818e1b6c-9a57-4eaf-af51-ee2c19644d38.png",
    brief: "The Renaissance Center from the Detroit Riverwalk",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/ab/edmonton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_d57d5d86-1afa-4ddf-a4cc-fc07dabf4783.png",
    brief: "The High Level Bridge and downtown Edmonton over the river valley",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/ns/halifax",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_5e246b61-0aa1-497e-ba11-5900e325d0e7.png",
    brief: "The Halifax waterfront boardwalk",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/on/hamilton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_387ae959-02c6-4aa0-bdbc-41ba2efd28cd.png",
    brief: "Hamilton from Sam Lawrence Park on the escarpment",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/tx/houston",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_f3355c06-612d-49f4-bd11-62c68a4539e1.png",
    brief: "The Houston skyline across Buffalo Bayou",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/nu/iqaluit",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_d447fa0f-d5f7-43ac-90f7-d1806a6aed22.png",
    brief: "St Jude's Anglican Cathedral in Iqaluit",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/ca/los-angeles",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_117acf4a-ec32-469a-b98b-2a66f3481164.png",
    brief: "Griffith Observatory above the Los Angeles basin",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/mn/minneapolis",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_96a9cf04-5907-472b-a5a4-d516e168ade1.png",
    brief: "The Stone Arch Bridge and the Minneapolis skyline",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/on/mississauga",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_dc15f8b6-b5ab-4ae1-addc-94840ac35039.png",
    brief: "The Absolute World towers in Mississauga",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/nb/moncton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_fc61bb98-39f5-4241-9c6e-53b1c39b36b7.png",
    brief: "Main Street in downtown Moncton",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/qc/montreal",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053219_067bd3a4-999c-4ca9-8154-d99390ef0582.png",
    brief: "Place Jacques-Cartier in Old Montreal",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/ny/new-york",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_026dea79-1cb0-4025-baf3-d334aeda8358.png",
    brief: "The Brooklyn Bridge and Lower Manhattan from Dumbo",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/nj/newark",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053245_24d30bab-7bf2-41ca-af6f-60147ee37941.png",
    brief: "Broad Street and the Prudential Tower, Newark",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/fl/orlando",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053245_3e951f21-413f-4ad7-af11-b94aca76c7ab.png",
    brief: "The fountain at Lake Eola with the Orlando skyline",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/on/ottawa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_f1f2c83d-aa39-4cf0-90f0-663bbffcbdb9.png",
    brief: "Parliament Hill from across the Ottawa River",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/pa/philadelphia",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053247_8c21f2a6-65a4-4934-906b-21e9cddb323e.png",
    brief: "Philadelphia City Hall from the Benjamin Franklin Parkway",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/az/phoenix",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053245_6be73c80-6223-426b-953d-aa714badcbb7.png",
    brief: "Downtown Phoenix below Camelback Mountain",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/tx/san-antonio",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053245_4fd35ae6-4eac-44e4-afc2-dac4a0fe6b6d.png",
    brief: "The San Antonio River Walk",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/ca/san-diego",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053245_b18ef991-bb79-4a27-a939-fbab26a87357.png",
    brief: "The San Diego skyline and the Coronado Bridge from Coronado",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/sk/saskatoon",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_22340bfd-b40c-4a98-997e-609c2f13e963.png",
    brief: "The Delta Bessborough and the Broadway Bridge, Saskatoon",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/wa/seattle",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_46e31faf-ed42-4582-a279-cf86782b053c.png",
    brief: "The Space Needle and Mount Rainier from Kerry Park",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/nl/st-johns",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_10a2d060-345a-4d40-84d0-14161589e6a8.png",
    brief: "Jellybean Row and Signal Hill, St. John's",
    revision: 2,
  },
  {
    kind: "city",
    key: "us/fl/tampa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053246_67902869-d9d9-4fbd-9c7b-7b10f21d74e7.png",
    brief: "The University of Tampa minarets across the Hillsborough River",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/bc/vancouver",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053259_50d19d16-7779-40c3-92d1-88643d415b10.png",
    brief: "Downtown Vancouver and Canada Place from the Stanley Park seawall",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/bc/victoria",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053259_300ec21a-1248-43e0-8f70-9bef9371dca3.png",
    brief: "The Parliament Buildings on Victoria's Inner Harbour",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/yt/whitehorse",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053259_3513d392-5734-4b37-89f9-68db22aa5e54.png",
    brief: "The SS Klondike on the Yukon River at Whitehorse",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/mb/winnipeg",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053259_bec26d48-1633-4871-8d03-31cf1249436d.png",
    brief: "The Esplanade Riel bridge at The Forks, Winnipeg",
    revision: 2,
  },
  {
    kind: "city",
    key: "ca/nt/yellowknife",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260907_053259_0c3b1d4a-f477-4f5d-833b-0d413632a087.png",
    brief: "Float planes at Old Town Yellowknife on Great Slave Lake",
    revision: 2,
  },
  {
    kind: "region",
    key: "ca/ab",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_56d47640-558d-4b48-b4ed-57b187f21d4d.png",
    brief: "Alberta foothills running to the Rockies",
  },
  {
    kind: "region",
    key: "us/az",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_308d36f2-71a4-4cdb-be3e-66d46adbb1b9.png",
    brief: "Arizona desert with saguaro and red rock",
  },
  {
    kind: "region",
    key: "ca/bc",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183554_faa238be-11bb-4ead-bfcb-2ece1a7afc77.png",
    brief: "Coastal British Columbia inlets and mountains",
  },
  {
    kind: "region",
    key: "us/ca",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_86225b0e-50b6-4b24-ba17-e04f6df3d01c.png",
    brief: "The California coast and golden hills",
  },
  {
    kind: "region",
    key: "us/co",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_901d03e6-434c-4d6c-882c-ef69280976b5.png",
    brief: "Colorado aspens below snow-dusted peaks",
  },
  {
    kind: "region",
    key: "us/fl",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_0775931f-43a9-4ef5-8ae5-4b28734c36c8.png",
    brief: "A Florida waterway under towering cumulus",
  },
  {
    kind: "region",
    key: "us/ga",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_baff3ae6-6ddb-4209-bbc1-990a16df62aa.png",
    brief: "A Georgia road under live oaks and Spanish moss",
  },
  {
    kind: "region",
    key: "us/il",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183554_6cff0092-b4ad-487c-b1d1-06976bda9a87.png",
    brief: "Illinois farmland with a red barn and silo",
  },
  {
    kind: "region",
    key: "ca/mb",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183756_64507505-90f0-4e8c-8a34-14b1653d85ef.png",
    brief: "The Manitoba prairie under an enormous sky",
  },
  {
    kind: "region",
    key: "us/ma",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_f5ed2386-a691-498b-99d5-61c2c36cdd05.png",
    brief: "A Massachusetts harbour and lighthouse",
  },
  {
    kind: "region",
    key: "us/mi",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_36904955-b5a2-44b5-8bd9-e1336c6df00d.png",
    brief: "Michigan dunes on the Great Lakes shore",
  },
  {
    kind: "region",
    key: "us/mn",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_b3336d2b-704a-4b3e-bc73-6cb68748576d.png",
    brief: "A Minnesota forest lake at dawn",
  },
  {
    kind: "region",
    key: "ca/nb",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_fc75c291-3107-4b53-b107-b881f7c07247.png",
    brief: "A New Brunswick tidal river in autumn",
  },
  {
    kind: "region",
    key: "us/nj",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_a079dc04-0da5-4c0a-ad52-8845b99f114f.png",
    brief: "The New Jersey shore boardwalk and dunes",
  },
  {
    kind: "region",
    key: "us/ny",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_52119760-d2fa-44af-bb73-3abf57c08d9c.png",
    brief: "The Hudson Valley in autumn",
  },
  {
    kind: "region",
    key: "ca/nl",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183755_4dd83026-f715-401b-ae06-d115aa75d350.png",
    brief: "Newfoundland sea cliffs and a harbour cove",
  },
  {
    kind: "region",
    key: "us/nc",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_30ede1d0-54eb-4519-bc8d-d9c36dc78a33.png",
    brief: "The Blue Ridge Mountains at sunrise",
  },
  {
    kind: "region",
    key: "ca/nt",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_ddd5dc6b-8c39-4c25-8027-172427a7eaca.png",
    brief: "Northwest Territories tundra and boreal spruce",
  },
  {
    kind: "region",
    key: "ca/ns",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_f44b491a-7715-4b30-a462-c9741c002a6c.png",
    brief: "A Nova Scotia lighthouse on granite headland",
  },
  {
    kind: "region",
    key: "ca/nu",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_a4d64731-ca7b-435b-9af3-9765a668fb7f.png",
    brief: "Nunavut tundra and sea ice",
  },
  {
    kind: "region",
    key: "us/oh",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183615_78190f8b-c065-4578-aa7b-2cef3f29c9eb.png",
    brief: "Ohio farmland with a white farmhouse",
  },
  {
    kind: "region",
    key: "ca/on",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183756_5bf1f797-c43b-48eb-a4b9-0baa21e1460f.png",
    brief: "Ontario lake country on the Canadian Shield",
  },
  {
    kind: "region",
    key: "us/pa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183630_a8399375-bc4c-4024-8bdf-fc014615976d.png",
    brief: "Pennsylvania farmland and Appalachian ridges",
  },
  {
    kind: "region",
    key: "ca/pe",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183630_2648d16d-05c7-4637-bedd-07694ce4eb79.png",
    brief: "Prince Edward Island red cliffs and farmland",
  },
  {
    kind: "region",
    key: "ca/qc",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183630_35d95b9c-8158-4e1d-aeb8-e0e090b68bf9.png",
    brief: "A Quebec village among maple woods",
  },
  {
    kind: "region",
    key: "ca/sk",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183631_99d29011-aedf-4d59-80ab-94505a03895e.png",
    brief: "Saskatchewan wheat under prairie cloud",
  },
  {
    kind: "region",
    key: "us/tx",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183631_aa23a755-8baf-4b00-a959-d72b82c1b22b.png",
    brief: "Texas hill country with live oaks",
  },
  {
    kind: "region",
    key: "us/wa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183630_f0a102bb-6cc0-40e7-82d0-ecdd653b971c.png",
    brief: "Washington evergreens below a volcanic peak",
  },
  {
    kind: "region",
    key: "ca/yt",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183631_a0522aeb-6e25-48d5-848b-0b6f5923ffc5.png",
    brief: "A Yukon river valley through boreal forest",
  },
];
