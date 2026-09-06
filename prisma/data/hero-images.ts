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
];
