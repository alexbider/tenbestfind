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
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_6798a00a-9d65-436e-9a34-1d838a54db80.png",
    brief: "Miami skyline at golden hour across Biscayne Bay",
  },
  {
    kind: "city",
    key: "ca/on/toronto",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_182720_e719547a-7b7f-41a3-b0dc-0eb09b0f7ff7.png",
    brief: "Toronto skyline at dusk from the Lake Ontario shoreline",
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
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_32ad4555-7176-463d-85b5-0aec17f29675.png",
    brief: "Atlanta skyline above the tree canopy",
  },
  {
    kind: "city",
    key: "us/tx/austin",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_013f5f52-6eeb-4aae-b434-0eb9fd69a796.png",
    brief: "Austin skyline across Lady Bird Lake",
  },
  {
    kind: "city",
    key: "us/ma/boston",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_970b40a9-908f-4b8d-9dfe-3d0f03529715.png",
    brief: "Back Bay brownstones in Boston",
  },
  {
    kind: "city",
    key: "us/ny/buffalo",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_600ec274-0e8a-4d58-ab1e-0f9f27d76327.png",
    brief: "Downtown Buffalo on a clear winter afternoon",
  },
  {
    kind: "city",
    key: "ca/ab/calgary",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_189602b4-0f8e-48e4-9d5d-9113c258039f.png",
    brief: "Calgary skyline with the Rockies behind",
  },
  {
    kind: "city",
    key: "us/nc/charlotte",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183454_f6eeeab3-8547-49cc-84a8-07febd187b06.png",
    brief: "Uptown Charlotte at dusk",
  },
  {
    kind: "city",
    key: "ca/pe/charlottetown",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_097865a1-ed82-4c1d-bea1-ac6108639a42.png",
    brief: "Charlottetown waterfront and harbour",
  },
  {
    kind: "city",
    key: "us/il/chicago",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_478d00f9-7caf-40d7-801e-073eb3f8860e.png",
    brief: "The Chicago River between downtown towers",
  },
  {
    kind: "city",
    key: "us/oh/columbus",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_d9aff777-c4de-4f1f-a3d4-d3db13817808.png",
    brief: "Columbus skyline across the Scioto",
  },
  {
    kind: "city",
    key: "us/tx/dallas",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_cb6d0869-d9d9-435f-9b3f-532771be7f5e.png",
    brief: "Dallas skyline at blue hour",
  },
  {
    kind: "city",
    key: "us/co/denver",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_77e04641-5b44-47be-a2ee-34745859c33a.png",
    brief: "Denver skyline against the Front Range",
  },
  {
    kind: "city",
    key: "us/mi/detroit",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183453_5426038d-8808-47e7-a25d-aeefcbf85804.png",
    brief: "Detroit riverfront skyline",
  },
  {
    kind: "city",
    key: "ca/ab/edmonton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_3d11b7ed-fd54-40db-b7cf-04e4fb611761.png",
    brief: "Edmonton across the North Saskatchewan valley",
  },
  {
    kind: "city",
    key: "ca/ns/halifax",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183514_b2e17a91-a724-425b-96a2-b8dfb3d50499.png",
    brief: "Halifax harbour waterfront",
  },
  {
    kind: "city",
    key: "ca/on/hamilton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183514_72372b5e-bd65-4c57-83fc-ae224b5c89c4.png",
    brief: "Hamilton from the escarpment",
  },
  {
    kind: "city",
    key: "us/tx/houston",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_3570e0cf-ea8e-4f6b-a0e7-c113ef78719c.png",
    brief: "Houston skyline at dusk",
  },
  {
    kind: "city",
    key: "ca/nu/iqaluit",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_bb931c62-b10b-442b-8159-300826bc1213.png",
    brief: "Iqaluit on arctic tundra above a frozen inlet",
  },
  {
    kind: "city",
    key: "us/ca/los-angeles",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183514_d19ef6f4-158b-44f9-8dd0-7617e20fcf4f.png",
    brief: "Los Angeles streets with downtown beyond",
  },
  {
    kind: "city",
    key: "us/mn/minneapolis",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_866223e4-70f4-4158-a06f-99fa7d8cebbf.png",
    brief: "Minneapolis from the Stone Arch Bridge",
  },
  {
    kind: "city",
    key: "ca/on/mississauga",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_353cb2c4-d938-44db-b24f-a755d036987a.png",
    brief: "A Mississauga residential neighbourhood",
  },
  {
    kind: "city",
    key: "ca/nb/moncton",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_48520c6d-c4a2-414d-aa5e-ff043e308c80.png",
    brief: "Downtown Moncton main street",
  },
  {
    kind: "city",
    key: "ca/qc/montreal",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183755_2c8fed60-47ed-4935-9a87-db15b7510255.png",
    brief: "Montreal walk-ups with exterior staircases",
  },
  {
    kind: "city",
    key: "us/ny/new-york",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_eb8f3814-0173-417b-bc2f-dfc3da9b7c80.png",
    brief: "Manhattan across the East River",
  },
  {
    kind: "city",
    key: "us/nj/newark",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183513_d49393e1-a556-48bb-a532-85c10a6c038f.png",
    brief: "Newark row houses with downtown beyond",
  },
  {
    kind: "city",
    key: "us/fl/orlando",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_e8cd04d6-b2a4-4eee-a368-5c81470d3b99.png",
    brief: "Orlando across Lake Eola",
  },
  {
    kind: "city",
    key: "ca/on/ottawa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_81b17f84-1c00-44f9-97e7-e8918528495d.png",
    brief: "Parliament above the Ottawa River",
  },
  {
    kind: "city",
    key: "us/pa/philadelphia",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_7ceea1a4-9cf7-4819-a16b-01dc94708708.png",
    brief: "Philadelphia brick row houses with marble stoops",
  },
  {
    kind: "city",
    key: "us/az/phoenix",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_8a0d7d70-38d9-4801-b28f-1fa1f50c2363.png",
    brief: "Phoenix stucco houses and desert landscaping",
  },
  {
    kind: "city",
    key: "us/tx/san-antonio",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_e8bff30e-93f8-4ba7-b0e8-2c6aa90726fd.png",
    brief: "The San Antonio River Walk",
  },
  {
    kind: "city",
    key: "us/ca/san-diego",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_55afd824-b4bd-4d15-baf0-b971e546f91b.png",
    brief: "San Diego skyline across the bay",
  },
  {
    kind: "city",
    key: "ca/sk/saskatoon",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_5d8d21d5-21d7-42ea-aa76-415ab1dc83db.png",
    brief: "Saskatoon on the South Saskatchewan River",
  },
  {
    kind: "city",
    key: "us/wa/seattle",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183756_18d6052f-fc82-45d2-bbd2-d557187ce267.png",
    brief: "Seattle across Elliott Bay with Rainier behind",
  },
  {
    kind: "city",
    key: "ca/nl/st-johns",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183532_0f8d8174-cbce-4e08-b541-e722d3089e86.png",
    brief: "St. John's painted row houses above the harbour",
  },
  {
    kind: "city",
    key: "us/fl/tampa",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_02a7c82e-a9db-4254-b39c-d1efe1eb44a2.png",
    brief: "Tampa skyline across Hillsborough Bay",
  },
  {
    kind: "city",
    key: "ca/bc/vancouver",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_d684c5a2-2dc5-45f6-a112-7d39dfadbdd4.png",
    brief: "Vancouver with the North Shore mountains",
  },
  {
    kind: "city",
    key: "ca/bc/victoria",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183533_b1ac85ef-26d2-41ad-ac1a-dcc0a9a0b4c0.png",
    brief: "Victoria's Inner Harbour",
  },
  {
    kind: "city",
    key: "ca/yt/whitehorse",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_2099760b-4127-417d-ba76-4abfbd0903cd.png",
    brief: "Whitehorse along the Yukon River",
  },
  {
    kind: "city",
    key: "ca/mb/winnipeg",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_fc4be49a-02ec-44fa-ad92-69c4efd54594.png",
    brief: "Winnipeg at the river confluence",
  },
  {
    kind: "city",
    key: "ca/nt/yellowknife",
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260906_183553_b2e24b6e-4c1b-446a-8323-c34d8e14d7f2.png",
    brief: "Yellowknife on granite bedrock above a lake",
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
