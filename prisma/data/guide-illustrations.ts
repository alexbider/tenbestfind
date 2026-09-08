/**
 * The pictures the eight seeded guides carry.
 *
 * These guides were written before the writer could commission its own
 * illustrations, so their briefs are here instead. Anything written from now on
 * arrives with its own three, and this file stays the record for the originals.
 *
 * `url` is where an image is fetched from, once. It is not what the site
 * serves: scripts/ingest-guide-images.ts downloads each one into MEDIA_DIR,
 * runs it through the image pipeline and stores the resulting `/uploads/...`
 * path on the guide, so after the first run nothing here is load-bearing.
 *
 * `after` is the heading id the inline figure is placed under. A figure block
 * is inserted there if the body does not already carry one for that key, which
 * is what lets a guide written months ago become illustrated without anybody
 * editing its prose.
 */

export type GuideIllustrationSource = {
  key: string;
  slot: "cover" | "inline";
  /** The exact brief the picture was generated from. */
  scene: string;
  alt: string;
  caption?: string;
  /**
   * Inline only: the heading id this figure sits under, placed after the first
   * block of that section. Left out when the guide has no second heading worth
   * hanging it on, in which case it goes at the end of the body.
   */
  after?: string;
  url?: string;
  revision?: number;
};

/**
 * A chart built from the guide's own published cost rows.
 *
 * Only the labels are named here. Every number comes from the CostRow records
 * the page already prints, so the chart and the table under it cannot disagree,
 * and nothing in the picture is a figure somebody made up. That is the whole
 * reason charts are drawn from data rather than generated as images.
 */
export type GuideChartSource = {
  title: string;
  intro?: string;
  note?: string;
  /** The heading id it sits under. Omitted means the end of the body. */
  after?: string;
  /** Cost row labels, in the order they should appear. */
  rows: string[];
};

export type GuideIllustrationSet = {
  slug: string;
  images: GuideIllustrationSource[];
  charts?: GuideChartSource[];
};

/** Applied to every brief, so the set reads as one photographer's work. */
export const HOUSE_STYLE =
  "Documentary editorial photography, natural available light, realistic colour and texture, believable wear and dirt, shallow depth of field, unposed. No faces, nobody looking at the camera, no text, no lettering, no numbers, no signage, no logos, no brand marks, no watermarks. Not a stock photo.";

export const GUIDE_ILLUSTRATIONS: GuideIllustrationSet[] = [
  {
    slug: "how-to-choose-a-roofing-contractor",
    images: [
      {
        key: "roofing-choose-cover",
        slot: "cover",
        scene:
          "A residential asphalt shingle roof part way through a tear-off, seen from roof level looking along the slope. Old shingles stripped back to grey felt on the left, new architectural shingles laid on the right, a chalk line between them. A roofer's gloved hands rest on a clipboard at the bottom edge of the frame. Late afternoon light raking across the surface.",
        alt: "A roof half stripped to the felt and half re-shingled, with a worker's gloved hands holding a clipboard at the edge of the frame",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_f97eb0e3-86b4-4d50-8bc4-7dc86985d17a.png",
      },
      {
        key: "roofing-choose-insurance",
        slot: "inline",
        after: "insurance",
        scene:
          "A clipboard holding a stack of paperwork resting on the open tailgate of a work truck, a coil roofing nailer and a bundle of shingles beside it. The paperwork is at a steep angle and out of focus so no writing can be read. Overcast morning light, suburban driveway behind.",
        alt: "A clipboard of paperwork on a truck tailgate beside a coil roofing nailer",
        caption: "The certificate a roofer hands over should name your address and the dates the work will happen.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_b5536ba6-e152-4dd1-a056-86702abe0176.png",
      },
      {
        key: "roofing-choose-decking",
        slot: "inline",
        after: "quotes",
        scene:
          "Close view of exposed roof decking where a ridge vent has been cut open, showing plywood edges, a strip of daylight through the ridge, and new underlayment rolled back. Rafters visible below through the opening. Flat overcast light, fine sawdust on the plywood.",
        alt: "Exposed plywood roof decking with a ridge vent slot cut open and underlayment rolled back",
        caption: "Decking and ventilation are where two quotes for the same roof most often diverge.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_50237ae3-b4d3-4970-a93a-84ea2319c837.png",
      },
    ],
  },
  {
    slug: "roof-replacement-cost",
    images: [
      {
        key: "roof-cost-cover",
        slot: "cover",
        scene:
          "Bundles of asphalt shingles stacked in pairs across a residential roof at dawn, still wrapped, dew beading on the plastic. A ladder hook is visible at the eave. Long shadows, cool early light, a quiet street of rooftops behind.",
        alt: "Wrapped bundles of asphalt shingles stacked across a residential roof at dawn",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_a0ed63e7-3ac3-4203-b902-c67b3c811515.png",
      },
      {
        key: "roof-cost-tearoff",
        slot: "inline",
        after: "factors",
        scene:
          "A roof tear-off in progress: old shingles sliding down a debris chute into a skip on a driveway, torn felt and a scattering of nails on the roof surface above. Morning light, dust in the air.",
        alt: "Old shingles sliding down a debris chute into a skip during a roof tear-off",
        caption: "Tear-off and disposal are a line item, not an assumption. Ask which one your quote includes.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_a018688c-9cd4-4c3b-a941-043db3fd7201.png",
      },
      {
        key: "roof-cost-eave",
        slot: "inline",
        after: "breakdown",
        scene:
          "Detail of a roof eave with new metal drip edge fitted over fresh synthetic underlayment, the first course of shingles started above it, a gutter below. Crisp side light showing the layers clearly.",
        alt: "A roof eave showing new drip edge, underlayment and the first course of shingles",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_a34cbca5-2561-4d4b-a213-26cd172dd095.png",
      },
    ],
    charts: [
      {
        title: "What the material costs, before anything else",
        intro:
          "Installed cost per square foot, from the same figures as the table below. Material is the one variable a homeowner chooses; almost everything else on a roof quote follows from the house itself.",
        note: "Natural slate and clay tile are left off because they are quoted per project and the range is too wide to draw honestly.",
        after: "factors",
        rows: [
          "Three-tab asphalt shingle",
          "Architectural asphalt shingle",
          "Standing seam metal",
          "Synthetic slate",
        ],
      },
    ],
  },
  {
    slug: "compare-moving-quotes",
    images: [
      {
        key: "moving-quotes-cover",
        slot: "cover",
        scene:
          "The inside of a half-loaded moving truck seen from the open rear, ramp down. Furniture wrapped in quilted moving blankets and strapped to the walls, stacked cardboard boxes, a hand truck leaning at the side. Daylight falling in from behind the camera into the darker interior.",
        alt: "The interior of a half-loaded moving truck with blanket-wrapped furniture strapped along the walls",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_83cf8ecf-3ab6-4417-915d-fe5e2638c8c9.png",
      },
      {
        key: "moving-quotes-wrapping",
        slot: "inline",
        after: "estimates",
        scene:
          "Gloved hands wrapping a wooden dining chair in a quilted moving blanket in an otherwise empty living room, tape gun on the bare floorboards, afternoon light through an uncurtained window.",
        alt: "Gloved hands wrapping a wooden dining chair in a quilted moving blanket in an empty room",
        caption: "Packing materials and labour are where a binding estimate and a non-binding one part company.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_348680de-29b3-4f8e-8377-dc411074ddc1.png",
      },
      {
        key: "moving-quotes-inventory",
        slot: "inline",
        after: "registration",
        scene:
          "A hand truck loaded with four stacked cardboard boxes in a narrow hallway, plain unmarked tape across the seams, a doorway and stairs beyond. Even indoor light.",
        alt: "A hand truck stacked with plain cardboard boxes in a narrow hallway",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_0f54e3ba-2d91-49ae-9f8f-a95865077b1c.png",
      },
    ],
  },
  {
    slug: "chimney-inspection-timing",
    images: [
      {
        key: "chimney-timing-cover",
        slot: "cover",
        scene:
          "A brick chimney stack rising from a shingle roof on an autumn afternoon, concrete crown weathered, moss along the flashing where it meets the shingles, bare branches and a pale sky behind. Low warm sun across the brickwork.",
        alt: "A weathered brick chimney stack on a shingle roof with moss along the flashing, autumn light",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_96426ed2-f726-4cf1-89f9-50ef3222a2a5.png",
      },
      {
        key: "chimney-timing-sweep",
        slot: "inline",
        after: "levels",
        scene:
          "A chimney sweep's sectional rods and round wire brush leaning against the opening of a brick firebox, soot marks on the hearth tiles, a dust sheet folded on the floor. Dim interior light from a nearby window.",
        alt: "Sweep's rods and a wire brush leaning against a brick firebox with soot on the hearth tiles",
        caption: "A sweep and an inspection are different jobs, and only one of them tells you the flue is sound.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_f949dbb3-ad11-4874-8adc-7f4dab223ed0.png",
      },
      {
        key: "chimney-timing-mortar",
        slot: "inline",
        scene:
          "Close view of a chimney stack showing cracked and receding mortar joints and one spalled brick with its face flaked away, a rusted flashing edge at the lower corner. Flat overcast light, high detail.",
        alt: "Cracked mortar joints and a spalled brick face on a chimney stack",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044850_28dbc8cf-38d3-4672-b16a-63d7e63c2142.png",
      },
    ],
  },
  {
    slug: "hvac-replacement-cost",
    images: [
      {
        key: "hvac-cost-cover",
        slot: "cover",
        scene:
          "An outdoor air conditioning condenser on a concrete pad beside the wall of a suburban house, insulated copper line set curving into the wall, a grey disconnect box above it, uncut grass at the edge of the pad. Bright summer afternoon, hard shadows.",
        alt: "An outdoor condenser unit on a concrete pad beside a house, copper line set running into the wall",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_4794f937-5a45-4474-a7a2-14b5807659f2.png",
      },
      {
        key: "hvac-cost-gauges",
        slot: "inline",
        after: "sizing",
        scene:
          "A gloved hand holding a set of refrigeration manifold gauges connected by red and blue hoses to the service ports of a condenser, the dials turned away from the camera and out of focus. Close, shallow depth of field, sunlight on the metal.",
        alt: "A gloved hand holding manifold gauges connected to the service ports of a condenser unit",
        caption: "A load calculation, not a rule of thumb, is what decides the size of the system you are quoted.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_af1a02c1-8426-4953-8486-37bb75d4d7ad.png",
      },
      {
        key: "hvac-cost-furnace",
        slot: "inline",
        scene:
          "A newly installed furnace and evaporator coil in an unfinished basement, sheet metal plenum and flexible ducting overhead, a work light on a stand throwing light across the joists and bare concrete floor.",
        alt: "A newly installed furnace and coil in an unfinished basement with sheet metal plenum and flexible duct above",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_8475ff34-60d7-4a95-8bf2-b9ad76ceff45.png",
      },
    ],
    charts: [
      {
        title: "What each kind of replacement runs to",
        intro: "Whole-project ranges on existing ductwork, drawn from the same figures as the table below.",
        note: "Duct replacement is not shown because it is quoted after an inspection rather than from a range.",
        after: "sizing",
        rows: ["Furnace replacement", "AC replacement, existing ductwork", "Heat pump replacement"],
      },
    ],
  },
  {
    slug: "questions-remodeling-contractor",
    images: [
      {
        key: "remodel-questions-cover",
        slot: "cover",
        scene:
          "A kitchen part way through a remodel: base cabinets removed, wall studs and plywood subfloor exposed, plastic sheeting taped over a doorway, a stack of offcuts in the corner. Daylight from an uncovered window, dust visible in the beam.",
        alt: "A kitchen mid-remodel with cabinets removed and studs and subfloor exposed",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_8448c9d2-9102-48b5-aff6-2d765dfeacb1.png",
      },
      {
        key: "remodel-questions-plans",
        slot: "inline",
        after: "questions",
        scene:
          "A rolled set of drawings, a retractable tape measure and a carpenter's pencil resting on a plywood work surface over sawhorses, the paper furled so nothing on it can be read. Soft window light from one side.",
        alt: "Rolled drawings, a tape measure and a pencil on a plywood work surface over sawhorses",
        caption: "The answer to what happens when we open the wall belongs in writing before the wall is opened.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_c94bee37-71cb-41dd-af40-ea2ae1ede837.png",
      },
      {
        key: "remodel-questions-substrate",
        slot: "inline",
        scene:
          "A gloved hand resting against a bathroom wall where old tile has been stripped away, exposing cement backer board, screw heads and a patch of darker damaged substrate near the floor. Cool even light.",
        alt: "A gloved hand against a stripped bathroom wall showing cement backer board and a patch of damaged substrate",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_f525c678-28c5-4e1c-893b-600bf6e313c0.png",
      },
    ],
  },
  {
    slug: "verify-a-license",
    images: [
      {
        key: "verify-licence-cover",
        slot: "cover",
        scene:
          "The open side door of a tradesperson's van in a suburban driveway at early morning, showing organised shelving of tool cases and coiled cable, a clipboard resting on the step. Low sun across the driveway, dew on the tarmac.",
        alt: "The open side door of a work van showing organised tool shelving, a clipboard on the step",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_a4b6c10c-a4f2-4eb7-acef-3f42bdc203cb.png",
      },
      {
        key: "verify-licence-documents",
        slot: "inline",
        after: "source",
        scene:
          "A manila folder open on a kitchen table with several sheets of paper fanned out and a pen laid across them, a mug at the edge of the frame. The papers are shot at a low angle and out of focus so no writing is legible. Morning light through a window.",
        alt: "A manila folder of papers fanned open on a kitchen table with a pen across them",
        caption: "Ask for the licence number rather than the certificate. A number can be checked; a photocopy cannot.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_90abec71-9d53-4b01-9306-afeed29bc157.png",
      },
      {
        key: "verify-licence-handover",
        slot: "inline",
        scene:
          "Two pairs of hands at a doorstep, one passing a folded set of papers to the other, work jacket sleeve on one side and a home doorway on the other. Cropped at the shoulders so no faces are in frame. Overcast daylight.",
        alt: "One person passing a folded set of papers to another at a doorstep, hands only",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_cb18cbab-3c2a-4b86-8004-18084ab06d26.png",
      },
    ],
  },
  {
    slug: "compare-contractor-quotes",
    images: [
      {
        key: "compare-quotes-cover",
        slot: "cover",
        scene:
          "Three separate stapled sets of paperwork laid side by side across a kitchen table, a pen and a half-full mug beside them, a phone face down at the edge. Shot from above at a slight angle with the pages out of focus so no writing can be read. Soft morning light from a window.",
        alt: "Three stapled sets of paperwork laid side by side on a kitchen table with a pen and a mug",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_ca5872c4-f873-4857-a0e1-030887cda438.png",
      },
      {
        key: "compare-quotes-annotating",
        slot: "inline",
        after: "sheet",
        scene:
          "A hand annotating one page of a stapled document with a pen, close and from the side, the rest of the page falling out of focus so nothing is legible. Warm lamp light on a wooden table.",
        alt: "A hand marking up one page of a stapled document with a pen",
        caption: "Line the three up item by item before you look at a single total.",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_fefe1920-ef22-4261-9d20-d02afce92e42.png",
      },
      {
        key: "compare-quotes-decision",
        slot: "inline",
        scene:
          "The same kitchen table at dusk, two of the paper sets pushed to one side and one left in the middle, the mug empty, a phone face up but screen dark, the window behind gone blue. Low warm interior light.",
        alt: "A kitchen table at dusk with two sets of paperwork pushed aside and one left in the middle",
        url: "https://d8j0ntlcm91z4.cloudfront.net/user_3DntZ67Lu0VNZoxPFyPiizduGb0/hf_20260908_044919_c574771c-3cf7-4504-9135-abf073a6156c.png",
      },
    ],
  },
];
