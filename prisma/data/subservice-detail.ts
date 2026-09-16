// The written half of every subservice page.
//
// The template is one component and always was: /flooring/tile/ and
// /electricians/generator-installation/ are the same file with different rows
// behind them. What separated hardwood from the other seventy-six was not
// markup, it was that somebody had written this.
//
// Four sections, each optional, each about the job rather than the trade:
//
//   involves  what the work actually is, and where there are two options, the
//             comparison a buyer is really choosing between
//   prices    what it costs, drawn as bars from real figures
//   claim     the one thing worth saying about it that is not about booking
//   pitfalls  the ways it goes wrong, each with the question that catches it
//
// A job with none of these renders without those sections rather than with
// invented ones, which is the point: "nine to eighteen dollars a square foot"
// and "the wood has to acclimate for days before it is laid" are facts about
// hardwood, and no sentence shape turns the name of a trade into either.
//
// `prices` is deliberately rare. A price range is a claim about the world and
// wants a source behind it; the rest is craft knowledge that holds anywhere.
//
// Keyed by category slug, then subservice slug, both as they appear in the URL.

import type { SubserviceDetail } from "../../src/lib/subservice-detail";

export const SUBSERVICE_DETAIL: Record<string, Record<string, SubserviceDetail>> = {
  /* ------------------------------------------------------------- flooring */
  flooring: {
    hardwood: {
      involves: {
        heading: "Solid or engineered, and where each one can go",
        paragraphs: [
          "Solid hardwood is one piece of timber all the way through, which is what lets it be sanded and refinished repeatedly across decades. Engineered hardwood is a real wood veneer over a plywood core, so it looks identical once laid but can only be refinished once or twice, and sometimes not at all if the veneer is thin.",
          "The deciding factor is usually not preference, it is where the floor is going. On a normal timber subfloor above ground either works, and solid lasts longer.",
        ],
        options: [
          {
            name: "Solid hardwood",
            note: "One piece of timber throughout",
            rows: [
              { label: "Over concrete slab", value: "No", tone: "against" },
              { label: "Over radiant heating", value: "No", tone: "against" },
              { label: "Below grade", value: "No", tone: "against" },
              { label: "Refinishing", value: "Repeatedly", tone: "for" },
            ],
          },
          {
            name: "Engineered hardwood",
            note: "Wood veneer over a plywood core",
            rows: [
              { label: "Over concrete slab", value: "Yes", tone: "for" },
              { label: "Over radiant heating", value: "Yes", tone: "for" },
              { label: "Below grade", value: "Yes", tone: "for" },
              { label: "Refinishing", value: "Once or twice", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "Engineered is dimensionally stable, so it goes over concrete slabs and over radiant heating, both of which solid hardwood cannot do reliably. Below grade, in a basement, engineered is the only one of the two worth considering.",
      },
      prices: {
        eyebrow: "Hardwood by type",
        heading: "What it costs per square foot",
        lead: "Installed, 2026, including materials and labour on a straightforward rectangular room.",
        unit: "Dollars per square foot",
        currency: "$",
        items: [
          { name: "Engineered hardwood", low: 8, high: 14, note: "Goes where solid cannot." },
          { name: "Solid hardwood", low: 9, high: 18, note: "Lasts longest on a timber subfloor above ground." },
          {
            name: "Refinishing an existing floor",
            low: 3,
            high: 5,
            tone: "mixed",
            note: "Often the better spend if the boards are sound.",
          },
        ],
        footnote:
          "Removing the old floor adds $1 to $3 per square foot. Minor levelling adds roughly five to eight percent to a job, and replacing soft or rotten subfloor sections adds ten to twenty percent or more.",
        aside: {
          label: "Cheapest good option",
          heading: "Refinishing is a third of the price of replacing",
          body: "If you have hardwood already and it looks tired, price refinishing before replacement. At $3 to $5 a square foot against $9 to $18 for new, sanding back and refinishing a floor is a fraction of the cost and gives you a floor with more remaining life than a new engineered one.",
          footnote:
            "The question is only how much thickness is left above the tongue, which a flooring contractor can tell you in a few minutes.",
        },
      },
      claim: {
        eyebrow: "Resale",
        heading: "It is the one flooring choice that reliably affects resale",
        lead: "Vinyl and laminate have closed the gap on appearance to the point where most people cannot tell at a normal viewing distance. What they have not closed is the effect on valuation.",
        notes: [
          "Real hardwood still moves appraisals and buyer perception in a way that convincing imitations do not, particularly at higher price points.",
          "That cuts both ways. In a house where the comparable sales do not have hardwood, installing it will not lift the value to match what it cost. The advantage shows up where buyers expect it and its absence would be noticed.",
        ],
      },
      pitfalls: [
        {
          title: "Acclimation",
          body: "Wood needs to sit in the room it will live in, for days, reaching the humidity of that space before it is fitted. Floors laid straight off the delivery truck are the ones that gap in winter or cup in summer, and the installer who wants to fit tomorrow is the one to question.",
          ask: "How many days will the wood sit in the room before you fit it?",
        },
        {
          title: "Subfloor flatness",
          body: "It matters more with wider boards. Wide plank over an uneven subfloor moves, creaks and shows every dip. Ask what flatness tolerance the manufacturer specifies and whether the subfloor was checked against it, because that answer separates installers who have read the instructions from those who have not.",
          ask: "What flatness tolerance does the manufacturer specify, and was it checked?",
        },
      ],
    },

    tile: {
      involves: {
        heading: "Ceramic or porcelain, and the substrate that decides how long it lasts",
        paragraphs: [
          "Both are fired clay. Porcelain is fired denser and absorbs almost no water, which is what lets it go outdoors, into wet rooms and onto floors that take real traffic. Ceramic is softer, cheaper and easier to cut, and on a bathroom wall the difference will never show.",
          "The tile itself is rarely what fails. What fails is underneath it: a substrate that moves, a waterproofing layer that was skipped, or a tile bed with no room to expand.",
        ],
        options: [
          {
            name: "Ceramic",
            note: "Softer body, glazed surface",
            rows: [
              { label: "Water absorption", value: "Over 0.5%", tone: "mixed" },
              { label: "Outdoors and freeze", value: "No", tone: "against" },
              { label: "Heavy floor traffic", value: "Limited", tone: "mixed" },
              { label: "Cutting and drilling", value: "Easier", tone: "for" },
            ],
          },
          {
            name: "Porcelain",
            note: "Denser body, fired hotter",
            rows: [
              { label: "Water absorption", value: "Under 0.5%", tone: "for" },
              { label: "Outdoors and freeze", value: "Yes", tone: "for" },
              { label: "Heavy floor traffic", value: "Yes", tone: "for" },
              { label: "Cutting and drilling", value: "Harder", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "On a timber floor, or anywhere the structure moves, an uncoupling membrane between the substrate and the tile lets the two move independently. It is the single most effective thing standing between a tiled floor and a line of cracked grout.",
      },
      claim: {
        eyebrow: "Where it fails",
        heading: "Almost every tile failure is a substrate failure",
        lead: "Cracked tiles, hollow sounds underfoot and grout that keeps opening are usually blamed on the tile or the grout. They are nearly always the layer below.",
        notes: [
          "Tile has no give. Anything that moves under it, a deflecting floor, a fresh slab still curing, two materials expanding at different rates, has to go somewhere, and it goes through the weakest line in the tile bed.",
          "That is why the quotes worth comparing are the ones that describe the substrate preparation. Two prices for the same square footage can differ by thousands and be for genuinely different jobs.",
        ],
      },
      pitfalls: [
        {
          title: "Movement joints",
          body: "A tiled area needs a compressible joint at every perimeter and at intervals across large floors, usually where the structure changes or the room exceeds a span the standard sets. Skipping them is invisible on handover day and shows up as tented tiles or a cracked line the first time the building expands.",
          ask: "Where will the movement joints go, and what spacing does the standard require here?",
        },
        {
          title: "Waterproofing in wet areas",
          body: "Tile and grout are not waterproof. In a shower the waterproof layer sits behind them, and it is a system: membrane, corners, pipe collars, all by one manufacturer. Mixing brands or skipping the corner pieces is where leaks into the room below begin, long after the tiler has gone.",
          ask: "What waterproofing system goes behind the tile, and is it one manufacturer's from corner to corner?",
        },
      ],
    },

    "vinyl-plank": {
      involves: {
        heading: "Rigid core or flexible, and what the wear layer actually buys",
        paragraphs: [
          "Luxury vinyl plank is a printed image under a clear wear layer, over a core that decides how it behaves. Rigid cores come in two kinds: stone composite, which is dense and hard, and wood composite, which is lighter and warmer underfoot.",
          "The number worth knowing is the wear layer, measured in mils. It has nothing to do with how the floor looks on day one and everything to do with how it looks in year eight, because it is the only thing between the printed image and the traffic.",
        ],
        options: [
          {
            name: "Stone composite core",
            note: "Denser, harder underfoot",
            rows: [
              { label: "Dent resistance", value: "Higher", tone: "for" },
              { label: "Hides subfloor dips", value: "Less", tone: "against" },
              { label: "Underfoot comfort", value: "Firmer", tone: "mixed" },
              { label: "Temperature stability", value: "Higher", tone: "for" },
            ],
          },
          {
            name: "Wood composite core",
            note: "Lighter, warmer, more forgiving",
            rows: [
              { label: "Dent resistance", value: "Lower", tone: "against" },
              { label: "Hides subfloor dips", value: "More", tone: "for" },
              { label: "Underfoot comfort", value: "Softer", tone: "for" },
              { label: "Temperature stability", value: "Lower", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "Twelve mil is a normal residential wear layer and twenty or more is what light commercial specifies. A thin wear layer under a convincing photograph is the most common way a cheap plank floor is made to look like an expensive one.",
      },
      claim: {
        eyebrow: "Waterproof",
        heading: "Waterproof describes the plank, not the floor",
        lead: "Every rigid core plank on the market is waterproof as a piece of material. You can leave one in a bucket overnight and nothing happens to it. That is not the same claim as a waterproof floor.",
        notes: [
          "Water that reaches a seam runs along the locking joint and sits on the subfloor, where it has nowhere to dry. The plank survives; the subfloor and whatever is under it may not.",
          "In a bathroom or a laundry the thing that matters is what happens at the perimeter and around the pipes, which is a question about sealant and transitions rather than about the plank.",
        ],
      },
      pitfalls: [
        {
          title: "Telegraphing",
          body: "A floating plank floor takes the shape of what is under it. Ridges, old adhesive, a high screw head or a dip between joists will show through as a visible line or a soft spot, and with a hard rigid core it will also click underfoot. The remedy is levelling before, not adjustment after.",
          ask: "What will you do to the subfloor before the planks go down?",
        },
        {
          title: "The expansion gap",
          body: "Vinyl moves with temperature more than most people expect, and a floating floor needs a gap at every wall and every fixed object for it to move into. Fitted tight, or trapped by a heavy kitchen island set on top of it, the floor has to buckle somewhere. Rooms with big windows and direct sun are where this shows first.",
          ask: "How much expansion gap are you leaving, and does anything heavy sit on top of the floating floor?",
        },
      ],
    },

    carpet: {
      involves: {
        heading: "The fibre decides the wear, the underlay decides the feel",
        paragraphs: [
          "Most residential carpet is nylon or polyester. Nylon springs back, which is why it holds up in hallways and on stairs; polyester resists stains naturally and feels softer, which is why it suits bedrooms and rooms that see less traffic.",
          "Underneath, the underlay does more than comfort. It absorbs the impact that would otherwise crush the pile, and the carpet's own warranty usually specifies a minimum thickness and density for exactly that reason.",
        ],
        options: [
          {
            name: "Nylon",
            note: "Resilient, the traffic fibre",
            rows: [
              { label: "Springs back", value: "Yes", tone: "for" },
              { label: "Stain resistance", value: "Treated", tone: "mixed" },
              { label: "Stairs and hallways", value: "Yes", tone: "for" },
              { label: "Price", value: "Higher", tone: "mixed" },
            ],
          },
          {
            name: "Polyester",
            note: "Soft, naturally stain resistant",
            rows: [
              { label: "Springs back", value: "Less", tone: "against" },
              { label: "Stain resistance", value: "Built in", tone: "for" },
              { label: "Stairs and hallways", value: "Not ideal", tone: "against" },
              { label: "Price", value: "Lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "Density matters more than pile height. Bend a sample back on itself: the less backing you can see through the fibres, the denser it is, and dense carpet in a cheap style outlasts sparse carpet in an expensive one.",
      },
      claim: {
        eyebrow: "The warranty",
        heading: "The underlay is usually what voids the warranty",
        lead: "Carpet warranties are written around a complete installation, and the part homeowners are most often talked out of is the one the warranty names.",
        notes: [
          "Most manufacturers specify a minimum underlay thickness and density. Reusing the old underlay, or accepting a thinner one to bring the quote down, can void the wear warranty on the carpet above it.",
          "It is also the cheapest part of the job to get right. The difference between the specified underlay and a thin one is usually a small fraction of the total, and it decides how the carpet looks in five years.",
        ],
      },
      pitfalls: [
        {
          title: "Where the seams land",
          body: "Carpet comes on a roll of fixed width, so any room wider than the roll has a seam. A seam placed across a doorway or down the middle of a bright room will be visible for the life of the carpet, and it is decided by how the installer plans the cut rather than by the quality of the carpet.",
          ask: "Where will the seams fall, and can they run away from the window and out of the doorways?",
        },
        {
          title: "Stretching, not just laying",
          body: "Carpet on a tack strip has to be power stretched into place, not merely pushed in with a knee kicker. Under-stretched carpet develops ripples within a year or two, and re-stretching it later means moving the furniture and paying somebody to do the job properly the second time.",
          ask: "Will the carpet be power stretched, and is the re-stretch covered if it ripples?",
        },
      ],
    },
  },

  /* ------------------------------------------------------------- plumbers */
  plumbers: {
    "emergency-plumbing": {
      involves: {
        heading: "Stopping the damage first, fixing the cause second",
        paragraphs: [
          "An emergency call is usually two jobs wearing one name. The first is isolation: get the water off, contain what is escaping, make the property safe. That can be twenty minutes. The second is the actual repair, which often needs parts, daylight or a wall opened up.",
          "Knowing they are separate is what stops the bill surprising you. A good emergency plumber will stabilise the situation, tell you plainly what the permanent fix involves, and book it rather than attempt it badly at two in the morning.",
        ],
        footnote:
          "Before anyone arrives, find your main shut-off valve and turn it off. It is the single most valuable thing a homeowner can do, and it changes an emergency into an appointment.",
      },
      claim: {
        eyebrow: "Out of hours",
        heading: "The premium is for the hour, not for the plumber",
        lead: "Out-of-hours rates are often two or three times the daytime rate, and that is normal rather than opportunistic. What is worth understanding is what the premium actually covers.",
        notes: [
          "You are paying for somebody to leave their house at midnight, not for a better repair. The same work done at ten the next morning is the same work at a much lower rate.",
          "So the question when you call is whether this genuinely cannot wait. If the water is off and nothing is escaping, waiting until morning is usually the cheaper and no less safe decision.",
        ],
      },
      pitfalls: [
        {
          title: "What the call-out actually includes",
          body: "Some firms charge a call-out that covers the first hour on site, some charge a call-out and then start the clock, and some charge for travel both ways. All three are legitimate and they produce very different bills for the same visit. It is a thirty second question and almost nobody asks it while the water is running.",
          ask: "What does the call-out cover, and when does the hourly rate start?",
        },
        {
          title: "A temporary fix billed as a repair",
          body: "Clamping a pipe, capping a line or fitting a push-on coupling will stop the leak tonight and is exactly the right thing to do. It is not a permanent repair, and the risk is that it gets signed off as one and forgotten until it fails again. Get it recorded either way.",
          ask: "Is this a temporary fix, and if so what is the permanent repair and what does it cost?",
        },
      ],
    },

    "drain-cleaning": {
      involves: {
        heading: "Clearing the blockage, then finding out why it blocked",
        paragraphs: [
          "There are two ways in. A drain snake is a rotating cable that bores through the obstruction, which is quick, cheap and usually enough for a single soft blockage. Hydro jetting is high-pressure water that scours the pipe wall, which takes longer and costs more but removes the grease, scale and root hair that the cable only punched a hole through.",
          "The difference matters most for repeat blockages. A cable clears the line today; a jet leaves the pipe closer to its original bore, which is why it lasts longer.",
        ],
        options: [
          {
            name: "Drain snake",
            note: "A cable bored through the blockage",
            rows: [
              { label: "Clears a soft blockage", value: "Yes", tone: "for" },
              { label: "Grease and scale", value: "Partly", tone: "mixed" },
              { label: "Old clay or cast iron", value: "Usually safe", tone: "for" },
              { label: "Cost", value: "Lower", tone: "for" },
            ],
          },
          {
            name: "Hydro jetting",
            note: "High-pressure water against the pipe wall",
            rows: [
              { label: "Clears a soft blockage", value: "Yes", tone: "for" },
              { label: "Grease and scale", value: "Yes", tone: "for" },
              { label: "Old clay or cast iron", value: "Camera first", tone: "mixed" },
              { label: "Cost", value: "Higher", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "Jetting puts real force against the pipe wall. On a line that is already cracked, or on old clay with displaced joints, that force can turn a blockage into an excavation, which is why a camera survey should come before the jet rather than after it.",
      },
      claim: {
        eyebrow: "Repeat blockages",
        heading: "A drain that blocks twice does not have a blockage, it has a cause",
        lead: "One blockage is bad luck. The same drain blocking again within a year is telling you something about the pipe, and clearing it a second time buys another few months rather than a solution.",
        notes: [
          "The usual causes are roots at a joint, a belly where the line has sagged and holds water, a collapsed section, or a fall that was never right. None of them is fixed by clearing.",
          "A camera survey after the line is clear costs a fraction of a repeat visit and is the only thing that tells you which of those you have. Ask for the footage, not just the verdict.",
        ],
      },
      pitfalls: [
        {
          title: "No camera after the clear",
          body: "The drain runs again, everyone is happy, and nobody looks at why it stopped. A survey is most useful in the hour after clearing, when the line is empty and the camera can actually see the joints, the fall and whatever is growing through the wall.",
          ask: "Will you camera the line once it is clear, and do I get the footage?",
        },
        {
          title: "Jetting a pipe that cannot take it",
          body: "Cast iron that has scaled down to half its bore, or clay with open joints, can be damaged by a jet at full pressure. The tell is a firm that offers to jet before it has seen inside the pipe, on a house old enough for either to be likely.",
          ask: "Do you know what this pipe is made of, and what pressure will you use on it?",
        },
      ],
    },

    "water-heater-repair": {
      involves: {
        heading: "What can be repaired, and the age at which it stops being worth it",
        paragraphs: [
          "Most tank failures are a small number of parts: a thermostat, a heating element, a gas control valve, a thermocouple. All are replaceable and none is expensive relative to a new heater. What is not repairable is the tank itself, and a tank that is leaking from the body has reached the end.",
          "The other repairable problem is sediment. Minerals settle out of the water and bake onto the bottom of the tank, which insulates the burner from the water, wastes gas and eventually cracks the glass lining.",
        ],
        options: [
          {
            name: "Repair",
            note: "Tank sound, a component has failed",
            rows: [
              { label: "Under 8 years old", value: "Worth it", tone: "for" },
              { label: "Leaking from the tank", value: "No", tone: "against" },
              { label: "Still under warranty", value: "Worth it", tone: "for" },
              { label: "Cost", value: "Much lower", tone: "for" },
            ],
          },
          {
            name: "Replace",
            note: "Tank at the end of its life",
            rows: [
              { label: "Over 10 to 12 years", value: "Usually right", tone: "for" },
              { label: "Leaking from the tank", value: "Only option", tone: "for" },
              { label: "Chance to resize", value: "Yes", tone: "for" },
              { label: "Cost", value: "Much higher", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "The date is stamped in the serial number on the label, usually as the first four digits for year and week. Most tanks last ten to twelve years, and a component failure on a tank past that is worth putting against the price of a new one before you spend anything.",
      },
      claim: {
        eyebrow: "The part nobody replaces",
        heading: "The anode rod is what decides how long the tank lives",
        lead: "There is a sacrificial metal rod inside the tank whose only job is to corrode instead of the steel around it. When it is used up, the tank starts rusting, and that is the failure that cannot be repaired.",
        notes: [
          "Replacing it every few years is a cheap job that meaningfully extends the life of the heater, and almost nobody does it because nothing prompts them to.",
          "It is worth asking about on any service call. If the rod has never been checked on a heater that is six or seven years old, that is the single most useful thing the plumber can look at while they are there.",
        ],
      },
      pitfalls: [
        {
          title: "The relief valve and the expansion tank",
          body: "A temperature and pressure relief valve that weeps, or an expansion tank that has lost its charge, will be blamed on the heater. They are safety devices reacting to a pressure problem, and capping or replacing the valve without finding out why it opened removes the protection rather than the fault.",
          ask: "If the relief valve is discharging, what is the pressure doing, and has the expansion tank been checked?",
        },
        {
          title: "Replacing like for like without asking",
          body: "A replacement is the one moment the size, the fuel and the type are all up for reconsideration, and the default is to fit whatever came out. If the household has grown, or you run out of hot water on a normal evening, that default quietly locks in the same problem for another decade.",
          ask: "Is this size still right for the household, and what would the alternative cost?",
        },
      ],
    },

    repiping: {
      involves: {
        heading: "Copper or PEX, and how much of the house has to open",
        paragraphs: [
          "Repiping replaces the supply lines through the house rather than patching the one that failed. It is disruptive because the pipes are in the walls, ceilings and floors, and most of the cost and nearly all of the mess is access rather than pipe.",
          "The two materials in normal use are copper and PEX. Copper is rigid, long-lived and familiar to every inspector; PEX is flexible, faster to run, cheaper, and can often be pulled through existing cavities with far fewer openings.",
        ],
        options: [
          {
            name: "Copper",
            note: "Rigid, soldered joints",
            rows: [
              { label: "Openings needed", value: "More", tone: "against" },
              { label: "Lifespan", value: "Longest", tone: "for" },
              { label: "Tolerates freezing", value: "Poorly", tone: "against" },
              { label: "Material cost", value: "Higher", tone: "mixed" },
            ],
          },
          {
            name: "PEX",
            note: "Flexible, fitted runs",
            rows: [
              { label: "Openings needed", value: "Fewer", tone: "for" },
              { label: "Lifespan", value: "Long", tone: "for" },
              { label: "Tolerates freezing", value: "Better", tone: "for" },
              { label: "Material cost", value: "Lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "Check what your local code allows before choosing. PEX is accepted nearly everywhere now, but some jurisdictions still restrict where it can run, and a few insurers ask about it.",
      },
      claim: {
        eyebrow: "Galvanised",
        heading: "Galvanised supply pipe closes from the inside",
        lead: "If the house has original galvanised steel supply lines, the problem is not that they might leak. It is that they are narrowing.",
        notes: [
          "Zinc coating gives way and the steel corrodes inward, so the bore shrinks and the water pressure falls over decades. By the time the flow is obviously poor, the pipe is well down its life.",
          "That is why repiping a galvanised house is a planned job rather than an emergency one, and why replacing only the section that failed leaves you with the same house and one new pipe in it.",
        ],
      },
      pitfalls: [
        {
          title: "A partial repipe that leaves the cause",
          body: "Doing the accessible runs and leaving the ones behind finished walls is cheaper on the day and often the wrong answer, because the sections left in place are the same age as the ones being removed. If the quote stops at a boundary, find out where that boundary is and what is on the other side of it.",
          ask: "Which runs are being replaced, which are staying, and how old are the ones staying?",
        },
        {
          title: "Making good is somebody else's job",
          body: "Plenty of repipe quotes cover the plumbing and leave the drywall, plaster, tile and paint to you. That is a legitimate way to price it and a very large number to discover afterwards. Ask whether patching, texture matching and painting are inside or outside the figure.",
          ask: "Does the price include closing the walls back up, and to what standard?",
        },
      ],
    },

    "sewer-line-repair": {
      involves: {
        heading: "Lining it or digging it, and what the camera has to show first",
        paragraphs: [
          "A damaged sewer line can often be repaired without a trench. A cured-in-place liner is a resin sleeve pulled through the existing pipe and hardened, leaving a new pipe inside the old one. Pipe bursting pulls a new pipe through while fracturing the old one outward. Both need access pits rather than a full excavation.",
          "Neither works everywhere. A line that has collapsed, lost its fall or separated at a joint has nothing left to line, and then it is a dig.",
        ],
        options: [
          {
            name: "Trenchless lining",
            note: "A new pipe cured inside the old one",
            rows: [
              { label: "Disturbs the garden", value: "Barely", tone: "for" },
              { label: "Works on a collapse", value: "No", tone: "against" },
              { label: "Fixes a sagging fall", value: "No", tone: "against" },
              { label: "Time on site", value: "Shorter", tone: "for" },
            ],
          },
          {
            name: "Excavation",
            note: "Open the ground and replace",
            rows: [
              { label: "Disturbs the garden", value: "Yes", tone: "against" },
              { label: "Works on a collapse", value: "Yes", tone: "for" },
              { label: "Fixes a sagging fall", value: "Yes", tone: "for" },
              { label: "Time on site", value: "Longer", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "Lining reduces the internal diameter slightly. On a line that is already at the minimum for its length and fall, that can matter, and it is a question worth putting to the contractor rather than assuming.",
      },
      claim: {
        eyebrow: "Where your responsibility ends",
        heading: "The lateral is usually yours all the way to the main",
        lead: "People assume the property line is the boundary of their responsibility. In most jurisdictions it is not: the lateral from the house to the public sewer belongs to the property owner along its whole length, including the part under the road.",
        notes: [
          "That is what turns a sewer repair from a few thousand into a much larger number, because the section under the pavement needs permits, traffic control and reinstatement.",
          "It is worth confirming locally before you agree to anything, and worth knowing that some municipalities do take over at the property line. The answer changes the scope of every quote you are comparing.",
        ],
      },
      pitfalls: [
        {
          title: "No survey and no locate before the price",
          body: "A sewer quote given without a camera down the line and a locator marking the depth and route is a guess. It is also how a job that was priced as twenty feet of lining becomes an excavation halfway through, with the variation priced while the machine is already on site.",
          ask: "Can I see the camera footage and the marked route and depth before I accept the quote?",
        },
        {
          title: "Repairing the damage and leaving the cause",
          body: "Roots enter at a joint because the joint is open, and they will re-enter a repaired line if the joint is still there. The same is true of a belly that holds water. Fixing the visible break without addressing what caused it puts you back here in a few years.",
          ask: "What caused this, and does the repair deal with the cause or just the damage?",
        },
      ],
    },

    "leak-detection": {
      involves: {
        heading: "Finding it without opening the wall",
        paragraphs: [
          "The tools are acoustic listening equipment, thermal imaging, moisture meters and sometimes tracer gas, which is a harmless gas pushed into the line and sniffed out where it escapes. The point of all of them is the same: narrow the search from a room to a square foot before anybody cuts anything.",
          "A leak under a slab or behind a finished wall is expensive mostly because of the opening up. An hour of detection routinely saves a day of exploratory demolition.",
        ],
        footnote:
          "You can do the first test yourself. Turn off every fixture, note the meter reading, and check it again in two hours with nothing running. If it has moved, you have a leak on the supply side, and that is worth knowing before you call anyone.",
      },
      claim: {
        eyebrow: "Two jobs",
        heading: "Detection and repair are usually two different quotes",
        lead: "A detection company finds the leak and reports where it is. Whether the same firm then repairs it, and at what price, is a separate question, and one that is easy to assume the answer to.",
        notes: [
          "Some firms do both and credit the detection fee against the repair. Some only detect. Some will repair but subcontract it. All are fine; discovering which after the fact is not.",
          "Ask up front, because the detection fee is usually modest and the repair is not, and knowing whether you will be getting a second quote changes how you plan the day.",
        ],
      },
      pitfalls: [
        {
          title: "A guaranteed find, or a guaranteed bill",
          body: "Detection is skilled work and it does not always succeed on the first visit, particularly with intermittent leaks. Firms differ on what happens then: some return at no charge, some charge again, some cap it. Worth settling before rather than during.",
          ask: "What happens if the first visit does not find it?",
        },
        {
          title: "Who closes the hole",
          body: "Access is part of the job and making good usually is not. The plumber cuts a neat opening, fixes the pipe and leaves; the drywall, tile or render is yours. That is normal and it is also a cost nobody quotes for, so ask where the work stops.",
          ask: "After the repair, who patches the opening, and is that in the price?",
        },
      ],
    },

    "gas-line-work": {
      involves: {
        heading: "Sized for the load, pressure tested, and signed off",
        paragraphs: [
          "Gas work is licensed separately from general plumbing nearly everywhere, and for good reason. The work itself is a small part of it: the pipe has to be sized for the total demand of everything on the line, joined and supported to code, pressure tested, and inspected before it is put into service.",
          "Anything that adds an appliance, moves a line or extends a run is a permit job. A quote that treats it as a quick disconnect and reconnect is a quote from somebody planning to skip a step.",
        ],
        footnote:
          "Never accept gas work from a general handyman, however capable, and never accept a line put into service without a documented pressure test. This is the one trade on the site where the downside of getting it wrong is not financial.",
      },
      claim: {
        eyebrow: "Sizing",
        heading: "The new appliance is not the only thing on the pipe",
        lead: "The most common real fault in domestic gas work is not a leak, it is undersized pipe, and it shows up as appliances that underperform rather than as anything dramatic.",
        notes: [
          "A line is sized for the combined demand of everything it feeds, over the length of the run. Adding a range or a pool heater to a pipe that was sized without it can leave the furnace short on a cold evening when everything is calling at once.",
          "So the right question when adding an appliance is not whether the pipe reaches, it is whether the pipe carries. Ask for the load calculation, not just the connection.",
        ],
      },
      pitfalls: [
        {
          title: "No permit, no inspection",
          body: "Permits on gas work exist so somebody independent looks at it. Skipping the permit saves a fee and a wait and leaves you with unverified gas pipe in your walls, a problem at sale, and a conversation with your insurer you do not want to have after an incident.",
          ask: "Is a permit being pulled, and who is the inspecting authority?",
        },
        {
          title: "No test certificate",
          body: "The pressure test is the evidence the work is sound, and it should come to you on paper with the pressure held and the duration recorded. If the only record is that the plumber says it is fine, you have nothing to show anybody later.",
          ask: "Will I get the pressure test result in writing, with the licence number on it?",
        },
      ],
    },

    "fixture-installation": {
      involves: {
        heading: "The fixture is the easy part",
        paragraphs: [
          "Swapping a tap, a toilet or a sink is straightforward when everything behind it cooperates. What decides the job is what is already in the wall: the rough-in dimensions, the age and condition of the shut-off valves, and whether the new fitting matches the valve body that is already there.",
          "That last one catches people out with showers in particular. The visible trim and the valve inside the wall are usually a matched pair from one manufacturer, so changing the look can mean opening the wall.",
        ],
        footnote:
          "A standard toilet rough-in, the distance from the finished wall to the centre of the drain, is twelve inches, but ten and fourteen both exist in older houses. Measure before you buy, because the pan will not move to suit the pipe.",
      },
      claim: {
        eyebrow: "The old valves",
        heading: "The shut-off valves are the part most likely to fail today",
        lead: "On a fixture swap in an older house, the thing most likely to go wrong is not the new fitting. It is the small isolating valve under the sink being asked to close for the first time in twenty years.",
        notes: [
          "Old compression stops seize, and forcing one can shear it or leave it weeping once the job is done, which turns a one-hour swap into a repair on the supply line.",
          "A good plumber will expect this and price replacing the stops as part of the work. A quote that does not mention them on an old house is a quote with a variation waiting inside it.",
        ],
      },
      pitfalls: [
        {
          title: "Trim that does not fit the valve",
          body: "Shower and bath trim is manufacturer-specific. Buying a finish you like and assuming it will fit the existing valve body is the most common way a simple swap becomes a tiled wall coming off. Confirm compatibility before anything is ordered.",
          ask: "Does this trim fit the valve that is already in the wall, or does the valve have to change?",
        },
        {
          title: "Supplying your own fixture",
          body: "Buying the fitting yourself usually saves money and moves the warranty onto you. If it arrives damaged, is the wrong rough-in, or fails in a year, the labour to deal with it is a fresh charge. That trade is often worth making, as long as it is made knowingly.",
          ask: "If I supply the fixture, who carries the warranty and what happens if it is faulty?",
        },
      ],
    },
  },

  /* -------------------------------------------------------------- roofing */
  roofing: {
    "roof-repair": {
      involves: {
        heading: "Finding where the water gets in, which is rarely where it comes out",
        paragraphs: [
          "Water travels. A stain on a bedroom ceiling is often several feet from the actual entry point, because water runs along a rafter or a felt lap before it finds somewhere to drop. Chasing the stain rather than the source is how a roof gets repaired twice.",
          "Most leaks are not holes in the field of the roof. They are at the interruptions: flashing around a chimney or a vent, a valley where two slopes meet, the edge detail, or a fastener that has backed out.",
        ],
        footnote:
          "If the leak only shows in wind-driven rain rather than in a steady downpour, that points at flashing or a wall detail rather than at the covering, and it is worth telling the roofer which one you have seen.",
      },
      claim: {
        eyebrow: "Repair or replace",
        heading: "The age of the roof decides whether a repair is money well spent",
        lead: "A sound repair on a roof with years left is good value. The same repair on a roof near the end of its life is a deposit on a replacement you are going to make anyway.",
        notes: [
          "Ask how old the covering is and how much life the roofer thinks is left, then weigh the repair against that. Patching a twenty-two year old asphalt roof twice costs more than replacing it once.",
          "It also affects matching. On an older roof the replacement material will not weather to the same colour, so a repair in the middle of a visible slope stays visible.",
        ],
      },
      pitfalls: [
        {
          title: "Sealant instead of flashing",
          body: "A bead of roofing cement over a bad flashing detail will stop the leak and will fail, because sealant moves and ages differently to the metal and the covering around it. It is a legitimate temporary measure and a poor permanent one, and from the ground the two look identical.",
          ask: "Is this being flashed properly or sealed, and how long should the fix last?",
        },
        {
          title: "Nobody looked in the attic",
          body: "The underside tells you things the surface cannot: where the water actually lands, whether the deck is soft, whether the insulation is wet, and whether this has been going on far longer than the stain suggests. A repair quoted from the ground or the ladder alone is a quote for the visible half of the problem.",
          ask: "Have you been inside the roof space, and what does the deck look like from underneath?",
        },
      ],
    },

    "roof-replacement": {
      involves: {
        heading: "Tear off or overlay, and what happens to the deck underneath",
        paragraphs: [
          "A replacement either strips the old covering back to the deck or lays the new one over the top. Overlaying is cheaper and quicker and most codes allow it once, never twice. Tearing off costs more and is the only way anybody finds out what the deck is doing.",
          "The deck is the part worth caring about. Soft or rotten sheathing under an old roof is common, it is invisible until the covering comes off, and it is the single most likely reason a replacement quote grows once work starts.",
        ],
        options: [
          {
            name: "Tear off",
            note: "Strip back to the deck",
            rows: [
              { label: "Deck can be inspected", value: "Yes", tone: "for" },
              { label: "New underlayment", value: "Yes", tone: "for" },
              { label: "Full warranty", value: "Usually", tone: "for" },
              { label: "Cost", value: "Higher", tone: "mixed" },
            ],
          },
          {
            name: "Overlay",
            note: "New covering over the old",
            rows: [
              { label: "Deck can be inspected", value: "No", tone: "against" },
              { label: "New underlayment", value: "No", tone: "against" },
              { label: "Full warranty", value: "Often limited", tone: "mixed" },
              { label: "Cost", value: "Lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "An overlay also adds weight and traps heat against the old layer, which shortens the life of the new covering. It is the right answer on a sound roof and a tight budget, and the wrong one nearly everywhere else.",
      },
      claim: {
        eyebrow: "The warranty",
        heading: "Two warranties, and the one that matters is the workmanship",
        lead: "Every quote will mention a long manufacturer warranty on the material. That is the easy one, and it is rarely what you need.",
        notes: [
          "Roofs leak because of how they were installed far more often than because the shingles failed. The manufacturer's warranty does not cover that; the roofer's workmanship warranty does, and its length varies from one year to a lifetime between firms bidding the same job.",
          "Ask for it in writing, ask what it excludes, and ask whether it transfers if you sell. A long material warranty behind a one-year workmanship warranty is the weaker of the two offers.",
        ],
      },
      pitfalls: [
        {
          title: "Deck replacement priced per sheet, discovered later",
          body: "Nobody can know how much rotten sheathing is under a roof before it comes off, so quotes carry a per-sheet rate for replacement. The rate is where a reasonable job becomes an expensive one, and it is almost never compared between bidders because it sits in the small print.",
          ask: "What is the per-sheet rate for deck replacement, and how many sheets are allowed for in the price?",
        },
        {
          title: "The details priced as extras",
          body: "Flashing, drip edge, valley metal, vents and the ridge are where roofs actually leak, and they are also where a low bid gets its number. Reusing old flashing on a new roof is the classic example. Compare the line items rather than the totals.",
          ask: "Is all the flashing being replaced, or reused, and is it in this price?",
        },
      ],
    },

    "roof-inspection": {
      involves: {
        heading: "What a proper inspection covers, and what it produces",
        paragraphs: [
          "An inspection should take in the covering, the flashings, the penetrations, the gutters and edges, and the roof space from underneath. The underside is where an experienced inspector learns the most: daylight where there should not be any, stained rafters, damp insulation, inadequate ventilation.",
          "What you should get at the end is a written report with dated photographs, an assessment of remaining life, and a separation between what needs doing now and what can wait.",
        ],
        footnote:
          "Book one before buying a house, after any serious storm, and every few years once the roof is past its midpoint. The cost is small against what it can find, and the report is useful evidence in an insurance claim later.",
      },
      claim: {
        eyebrow: "Who is looking",
        heading: "A free inspection from a roofing contractor is a sales visit",
        lead: "That is not a reason to refuse one. It is a reason to understand what you are getting, because the person assessing whether you need a new roof is the person who would sell you one.",
        notes: [
          "For a straightforward opinion after a storm, a contractor's free assessment is useful and costs nothing. Get two, because two independent sales visits that agree are worth more than one.",
          "For a purchase, a valuation, or an insurance dispute, pay an independent inspector who does not sell roofs. The fee buys you a report nobody can accuse of having an interest in the answer.",
        ],
      },
      pitfalls: [
        {
          title: "A verbal verdict and no report",
          body: "An inspector who comes down the ladder and tells you the roof is fine has given you nothing you can use, at sale, with an insurer, or against a contractor later. The deliverable is the document, and it should name the inspector and the date.",
          ask: "What does the written report include, and does it come with dated photographs?",
        },
        {
          title: "Damage that appears during the inspection",
          body: "It is rare, and it is real: walking a brittle roof can break tiles or scuff old asphalt. Agree beforehand who is responsible if the inspection itself causes damage, particularly on slate, clay or anything past twenty years old.",
          ask: "What happens if walking the roof damages it?",
        },
      ],
    },

    "metal-roofing": {
      involves: {
        heading: "Standing seam or exposed fastener, and where the difference shows",
        paragraphs: [
          "Standing seam hides its fixings inside the raised joint between panels, so nothing that holds the roof down is exposed to weather. Exposed fastener panels are screwed through the face, with a rubber washer under each screw head, and they cost considerably less.",
          "The washers are the whole story. They are the part that ages, and on an exposed fastener roof there are thousands of them, each one a small hole through the covering that depends on a rubber seal.",
        ],
        options: [
          {
            name: "Standing seam",
            note: "Concealed clips, no face fixings",
            rows: [
              { label: "Exposed fixings", value: "None", tone: "for" },
              { label: "Thermal movement", value: "Allowed", tone: "for" },
              { label: "Maintenance", value: "Minimal", tone: "for" },
              { label: "Cost", value: "Much higher", tone: "against" },
            ],
          },
          {
            name: "Exposed fastener",
            note: "Screwed through the panel face",
            rows: [
              { label: "Exposed fixings", value: "Thousands", tone: "against" },
              { label: "Thermal movement", value: "Limited", tone: "mixed" },
              { label: "Maintenance", value: "Re-screwing", tone: "against" },
              { label: "Cost", value: "Lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "Metal expands and contracts a long way across a full-length panel. Standing seam clips are designed to let it move; a panel screwed tight through the face cannot, which is what slowly works the fixings loose and opens the washers up.",
      },
      claim: {
        eyebrow: "Lifespan",
        heading: "The coating decides the life, not the metal",
        lead: "Metal roofs are sold on a fifty-year number. The steel will comfortably manage that. What decides whether the roof still looks like a roof is the paint system on it.",
        notes: [
          "The premium coatings hold their colour and resist chalking for decades. The cheaper polyester finishes fade and chalk in a fraction of that time, on identical steel, under the same warranty headline.",
          "So the specification worth comparing between quotes is the coating and the metal gauge, not the years in the brochure.",
        ],
      },
      pitfalls: [
        {
          title: "Mixing metals",
          body: "Putting incompatible metals in contact, or letting runoff from one wash over another, causes galvanic corrosion. Copper above steel is the classic case, and so are the wrong fasteners: steel screws in aluminium panels will corrode at every single fixing.",
          ask: "Are the fasteners and the flashings the same metal family as the panels?",
        },
        {
          title: "Fitted by a roofer who does asphalt",
          body: "Metal is a different trade. Panel layout, allowance for expansion, seaming and the flashing details all have their own rules, and a crew that mostly lays shingles will produce a roof that looks right and works loose. Ask what proportion of their work is metal.",
          ask: "How many metal roofs has this crew done, and can I see one a few years old?",
        },
      ],
    },

    "flat-roofing": {
      involves: {
        heading: "Single ply or built up, and why the falls matter more than either",
        paragraphs: [
          "Flat roofs are not flat. They are laid to a shallow fall so water leaves, and the coverings in normal use are single-ply membranes, which come as large sheets welded at the seams, or built-up systems of layered felt and bitumen.",
          "Whichever covering goes on, the thing that decides how long it lasts is whether the water gets off it. Standing water finds every weakness in a seam, adds weight, and in cold climates freezes and works joints apart.",
        ],
        footnote:
          "If there are dark rings or silt patches on the existing roof two days after rain, the falls or the drains are not doing their job, and re-covering without fixing that buys you a newer roof with the same problem.",
      },
      claim: {
        eyebrow: "The seams",
        heading: "A flat roof fails at its joints, so count them",
        lead: "The field of a membrane rarely fails. The failures are at seams, at upstands where the roof meets a wall, around drains, and at any penetration through the covering.",
        notes: [
          "That makes the layout worth asking about. Fewer, wider sheets mean fewer seams; a roof detailed to run the seams across the fall rather than along it puts every joint in the path of the water.",
          "It also makes the upstand height worth checking. Where the covering turns up against a wall, it needs enough height above the finished surface to keep driven rain and ponding out, and cutting that short is invisible until it is not.",
        ],
      },
      pitfalls: [
        {
          title: "Covering over a wet build-up",
          body: "Laying a new membrane over an old one that has taken on water seals the moisture in, where it drives blisters and rots the deck from above. On anything that has leaked, the question is whether the existing layers are dry, and the honest answer usually requires a core sample.",
          ask: "Has anyone cut a core to check whether the existing build-up is dry?",
        },
        {
          title: "Drains and outlets left as they were",
          body: "Re-covering a roof and reusing tired outlets puts the newest part of the system against its oldest component, right at the one place all the water goes. Outlets are cheap relative to the roof and they are where re-covered flat roofs most often leak first.",
          ask: "Are the outlets and drains being replaced as part of this?",
        },
      ],
    },

    "storm-damage-repair": {
      involves: {
        heading: "Making it safe, documenting it, then repairing it",
        paragraphs: [
          "Storm work runs in three stages and they are easy to collapse into one. First is making the building safe and watertight, which usually means a temporary cover. Second is documenting what happened, because that is what the insurer pays against. Third is the permanent repair.",
          "The middle stage is the one that gets skipped under pressure, and it is the one that decides how much of the repair you pay for yourself.",
        ],
        footnote:
          "Photograph everything before anybody touches it, including the debris and the inside of any room that took water. A temporary cover fitted before the damage is recorded is a repair you may struggle to claim for.",
      },
      claim: {
        eyebrow: "After a storm",
        heading: "Be careful who knocks on the door",
        lead: "Severe weather brings crews into an area who were not there the week before and will not be there the month after. Some are legitimate firms following the work. Some are not.",
        notes: [
          "The signals worth heeding are the ordinary ones: a local address you can visit, a licence number you can look up with the issuing authority, insurance confirmed by the insurer rather than by a certificate they hand you, and no pressure to sign today.",
          "Be especially wary of an offer to cover your deductible or to handle the claim for you in exchange for signing the work over. Depending where you are, that is somewhere between a bad idea and insurance fraud.",
        ],
      },
      pitfalls: [
        {
          title: "Signing before the scope is known",
          body: "A contingency agreement signed on the doorstep can commit you to one contractor for whatever the insurer eventually approves, before anyone knows what that is or what it will cost. Read what you are signing, and take the time to, however urgent it feels.",
          ask: "What exactly does this document commit me to if the claim is approved, and can I take it away to read?",
        },
        {
          title: "A temporary cover treated as the repair",
          body: "A tarp or a temporary membrane is emergency mitigation with a life measured in weeks. Left over winter it becomes the roof, and the damage underneath goes on quietly. Agree at the outset when the permanent repair happens and what triggers it.",
          ask: "How long is this temporary cover good for, and when is the permanent repair scheduled?",
        },
      ],
    },
  },

  /* ----------------------------------------------------------------- hvac */
  hvac: {
    "ac-repair": {
      involves: {
        heading: "Most failures are electrical or airflow, not the compressor",
        paragraphs: [
          "An air conditioner that will not cool usually has a cheap problem. Capacitors fail more than any other single component, contactors burn, and a dirty filter or a blocked coil chokes the airflow until the system protects itself and shuts down.",
          "The expensive failures are the sealed system: the compressor and a genuine refrigerant leak. Those are the ones where the age of the unit starts to decide whether repair is sensible at all.",
        ],
        footnote:
          "Before calling anybody, change the filter and check that the outdoor unit is clear of leaves and growth. A surprising number of no-cooling calls are one of those two, and both are free to rule out.",
      },
      claim: {
        eyebrow: "Refrigerant",
        heading: "A system that needs topping up has a leak",
        lead: "Refrigerant is not consumed. It circulates in a sealed loop, and if the charge is low, it went somewhere.",
        notes: [
          "Adding refrigerant without finding the leak is a repair with a countdown on it: the same call next season, at the same price, with the new gas gone the same way.",
          "It matters more than it used to, because older refrigerants are being phased down and the cost per pound has climbed steeply. Paying twice to refill a leaking system can approach the cost of fixing it properly.",
        ],
      },
      pitfalls: [
        {
          title: "Diagnosis rolled into the repair",
          body: "Some firms charge a diagnostic fee and waive it if you proceed, some charge it regardless, and some quote a repair price that assumes you already agreed. All are fine if you know which; it is the assumption that costs money.",
          ask: "What is the diagnostic fee, and does it come off the repair if I go ahead?",
        },
        {
          title: "Straight to replacement",
          body: "On a system over ten or twelve years old, replacement often is the right recommendation. On a five-year-old unit with a failed capacitor it is not, and the difference between the two conversations is whether anybody told you what actually failed and what the part costs.",
          ask: "What specifically failed, what does the repair cost, and how old is this system?",
        },
      ],
    },

    "ac-installation": {
      involves: {
        heading: "Sized by calculation, not by the unit that was there before",
        paragraphs: [
          "A replacement is the moment to get the size right, and the right way to size it is a load calculation that accounts for the building: floor area, insulation, window area and orientation, air leakage, local climate. The wrong way is to read the label on the old unit and match it.",
          "Oversizing is the common error and it feels like the safe one. An oversized system cools the air quickly, satisfies the thermostat and shuts off before it has removed the humidity, so the house ends up cold and clammy, and the equipment wears out from constant starting.",
        ],
        footnote:
          "A proper load calculation has a name and a method, and any contractor doing this seriously will be willing to show you theirs. If the sizing conversation begins and ends with the tonnage of the old unit, that is worth noticing.",
      },
      claim: {
        eyebrow: "Efficiency",
        heading: "The efficiency rating is a laboratory number",
        lead: "A high-efficiency unit installed on leaky ducts, with the wrong charge, in a house that was never sealed, will not deliver what the label says. The rating describes the equipment under test conditions, not your house.",
        notes: [
          "The installation variables, duct sealing, correct refrigerant charge, adequate airflow across the coil, move real-world performance more than the difference between two adjacent efficiency tiers.",
          "That is why the money often goes further in sealing ducts and improving the envelope than in buying up a tier, and why two quotes for the same rated unit are not the same offer.",
        ],
      },
      pitfalls: [
        {
          title: "New outdoor unit, old indoor coil",
          body: "Replacing only the condenser and keeping the existing indoor coil is cheaper and leaves you with a mismatched pair. The system will run, and it will not deliver its rated efficiency or capacity, and manufacturers frequently will not warrant it.",
          ask: "Is the indoor coil being replaced to match, and is the pair AHRI matched?",
        },
        {
          title: "The ductwork nobody costed",
          body: "The ducts are usually older than the equipment and frequently the reason the old system struggled. A quote that covers the box and says nothing about duct sizing, sealing or the return air path is a quote for half the system.",
          ask: "Have the ducts been assessed, and is any sealing or resizing in this price?",
        },
      ],
    },

    "furnace-repair": {
      involves: {
        heading: "Ignition, flame sensing, and the one failure that is not about heat",
        paragraphs: [
          "Most no-heat calls come down to ignition and flame sensing: a dirty flame sensor that no longer proves the flame, a failed igniter, a pressure switch reading a blocked flue. All are routine parts and none is expensive.",
          "The failure that is different in kind is a cracked heat exchanger, because that is a combustion gas problem rather than a heating one, and the correct response to it is to shut the furnace down.",
        ],
        footnote:
          "Fit a carbon monoxide alarm on every floor with a fuel-burning appliance, regardless of the age or condition of the furnace. It is the cheapest safety device in the house.",
      },
      claim: {
        eyebrow: "Heat exchanger",
        heading: "A cracked heat exchanger is a shutdown, not a repair",
        lead: "The heat exchanger separates the combustion gases from the air that goes into your rooms. A crack in it lets those gases, carbon monoxide among them, into the air you breathe.",
        notes: [
          "A technician who finds one should red tag the furnace and take it out of service. That is the correct action and it is not a sales tactic, even though it arrives at the same conclusion as one.",
          "Because it does arrive there, it is a reasonable thing to get confirmed. Ask to be shown the crack, by camera if necessary, and on an expensive call there is nothing wrong with a second opinion from a firm not quoting for the replacement.",
        ],
      },
      pitfalls: [
        {
          title: "Parts warranty that needs registering",
          body: "Most manufacturers give a long parts warranty and most require the unit to be registered within a short window of installation. An unregistered furnace falls back to a much shorter term, and the homeowner usually finds this out at the moment they need it.",
          ask: "Was this furnace registered with the manufacturer, and what is the parts warranty now?",
        },
        {
          title: "Repeated repairs on an old unit",
          body: "Two or three service calls a season on a furnace in its late teens is money going into something with a short remaining life. The useful figure is the running total over the last two years against the price of replacing it, and almost nobody adds that up.",
          ask: "What has this furnace cost in repairs over the last two years, and what would replacing it cost?",
        },
      ],
    },

    "heat-pump-installation": {
      involves: {
        heading: "One machine for heating and cooling, and what happens when it is cold",
        paragraphs: [
          "A heat pump is an air conditioner that can run in reverse, moving heat into the house rather than out of it. Because it moves heat rather than making it, it delivers far more heat per unit of electricity than a resistance heater, which is the whole point of fitting one.",
          "Its output falls as the outdoor temperature drops, so the design question is what happens on the coldest days: either a back-up heat source, or a cold-climate model rated to hold useful capacity well below freezing.",
        ],
        options: [
          {
            name: "Ducted heat pump",
            note: "Uses the existing duct system",
            rows: [
              { label: "Needs good ducts", value: "Yes", tone: "against" },
              { label: "Whole house at once", value: "Yes", tone: "for" },
              { label: "Room by room control", value: "Limited", tone: "mixed" },
              { label: "Visible indoors", value: "No", tone: "for" },
            ],
          },
          {
            name: "Ductless mini split",
            note: "Indoor heads on each zone",
            rows: [
              { label: "Needs good ducts", value: "No", tone: "for" },
              { label: "Whole house at once", value: "Zone by zone", tone: "mixed" },
              { label: "Room by room control", value: "Yes", tone: "for" },
              { label: "Visible indoors", value: "Yes", tone: "against" },
            ],
          },
        ],
        footnote:
          "Heat pumps deliver warm air rather than hot air, at a lower temperature than a furnace but for longer. It heats the house perfectly well and it does feel different at the vent, which is worth expecting rather than discovering.",
      },
      claim: {
        eyebrow: "Running cost",
        heading: "The saving depends on what you are replacing and what power costs",
        lead: "A heat pump is dramatically cheaper to run than electric resistance heating. Against cheap natural gas, in a cold climate, the arithmetic is much closer and sometimes goes the other way.",
        notes: [
          "So the honest question is what you heat with now, what electricity and gas cost where you live, and how cold it actually gets. A contractor should be able to show you that comparison rather than assert the saving.",
          "Rebates and tax credits frequently move the decision on their own, and they change from year to year, so it is worth asking what is currently available before committing either way.",
        ],
      },
      pitfalls: [
        {
          title: "Back-up strip heat left to do the work",
          body: "Most ducted heat pumps include electric resistance back-up. If the controls are set poorly, or the unit is undersized, that back-up runs far more than it should, and the first winter bill is the one that tells you. It is a commissioning matter, not a fault.",
          ask: "At what outdoor temperature does the back-up heat come on, and who sets that?",
        },
        {
          title: "Nobody checked the ducts or the insulation",
          body: "A heat pump is more sensitive to a leaky, poorly insulated house than a furnace is, because it works with smaller temperature differences. Fitting one to a house that needed sealing first is the most common way an efficient machine disappoints its owner.",
          ask: "What did the load calculation assume about insulation and duct leakage, and was that measured?",
        },
      ],
    },

    "duct-cleaning": {
      involves: {
        heading: "What it does, and what it is often sold as doing",
        paragraphs: [
          "Duct cleaning is a physical job: a vacuum under negative pressure on the system while brushes or compressed air agitate the inside of the ducts, plus cleaning the coil, the blower and the return. Done properly it takes hours and the equipment is large.",
          "It is genuinely worth doing in specific situations: after construction or renovation work, if there is visible mould in the ducts, if there has been vermin, or if the system was run without filters. As routine maintenance on a normal house, the evidence for a health benefit is thin.",
        ],
        footnote:
          "Ask to see inside the ducts before and after, with a camera or a mirror. A firm that does this properly will be happy to show you; it is the most persuasive thing they have.",
      },
      claim: {
        eyebrow: "The offer",
        heading: "The whole-house special is an advertisement, not a price",
        lead: "This is the corner of home services with the most aggressive discounting, and a very low headline figure is almost always the opening of a different conversation.",
        notes: [
          "The pattern is familiar: a small advertised price, a technician on site who finds mould, contamination or a need for sanitising treatment, and a total many times the number that got them through the door.",
          "A straightforward firm will quote by the number of vents and returns, say plainly what is included, and put the price in writing before arriving.",
        ],
      },
      pitfalls: [
        {
          title: "Sanitising sprays and sealants",
          body: "Chemical treatments and duct sealants sprayed into the system are the most common upsell and the least well supported. Some are not approved for use inside ducts at all. Find out exactly what product is proposed and why, before agreeing to anything applied into the air you breathe.",
          ask: "What product is this, is it approved for use inside ducts, and what does it do that cleaning does not?",
        },
        {
          title: "Cleaning without touching the coil or blower",
          body: "Much of what accumulates in a forced air system is on the evaporator coil and the blower wheel rather than in the ducts. A cheap clean that runs a hose down the vents and leaves both untouched has skipped the part that actually affects airflow.",
          ask: "Does this include the coil and the blower wheel, or only the ducts?",
        },
      ],
    },

    "maintenance-plans": {
      involves: {
        heading: "What is in the plan, and what it is worth against paying per visit",
        paragraphs: [
          "A typical plan buys two visits a year, one before cooling season and one before heating, plus some combination of priority scheduling, a discount on repairs and a waived diagnostic fee. The visits themselves are a defined list of checks: charge, airflow, electrical connections, combustion, safety controls.",
          "Whether it pays depends on the arithmetic. Add up the two visits at the normal rate, compare it to the plan, and treat the priority and the repair discount as what they are, which is insurance against a bad week rather than a saving.",
        ],
        footnote:
          "Some manufacturer warranties require documented annual servicing. If yours does, the record the plan produces has a value beyond the visits, and it is worth checking whether that is the case before deciding.",
      },
      claim: {
        eyebrow: "Worth having",
        heading: "The real value is the inspection, not the cleaning",
        lead: "Most of what a maintenance visit produces is not the cleaning. It is somebody looking at a system once a year who knows what an early failure looks like.",
        notes: [
          "A capacitor that is losing capacity, a contactor pitting, a refrigerant charge drifting, a flue partially blocked: all are visible before they strand you, and all are cheaper to deal with in April than in the first week of a heatwave.",
          "That is also the test of a good plan. Ask what the technician checks and whether you get their readings afterwards. A visit that produces no numbers was a visit that changed the filter.",
        ],
      },
      pitfalls: [
        {
          title: "Rolling renewal and a rising price",
          body: "Plans usually auto-renew, often at a rate that drifts up, and the visits are easy to forget to book. A plan you paid for and did not use is worse value than paying per visit. Check the renewal terms and put the visits in the calendar when you sign.",
          ask: "Does this auto-renew, at what price, and what happens to unused visits?",
        },
        {
          title: "A discount on an inflated rate",
          body: "Fifteen percent off repairs is only worth something if the underlying rates are competitive. Where the plan is the main thing being sold, the repair pricing behind it is worth sampling against a couple of independent quotes before you assume the discount is a saving.",
          ask: "What is the standard hourly rate the discount applies to?",
        },
      ],
    },
  },

  /* --------------------------------------------------------- electricians */
  electricians: {
    "panel-upgrades": {
      involves: {
        heading: "More circuits, or more capacity, which are different problems",
        paragraphs: [
          "Two different complaints get called a panel upgrade. One is running out of spaces for new circuits, which can sometimes be solved inside the existing panel. The other is running out of service capacity, where the supply into the house is not enough for what the house now contains, and that means new service from the meter in.",
          "Which one you have decides the price, and the difference between them is large. Adding an electric vehicle charger, a heat pump and an induction range to a sixty-amp service is a capacity problem; wanting two more circuits in a hundred-amp panel usually is not.",
        ],
        footnote:
          "Some panel brands have known safety problems and are effectively uninsurable in parts of North America. If yours is one of them, replacement is not really a discretionary upgrade, and an electrician will tell you which you have on sight.",
      },
      claim: {
        eyebrow: "The load calculation",
        heading: "The size of the new service should come from a calculation",
        lead: "Two hundred amps has become the default answer, and it is often right. It should still be the output of a calculation rather than a habit.",
        notes: [
          "The calculation adds up the connected load: heating and cooling, water heating, cooking, laundry, vehicle charging, and a factor for general lighting and outlets by floor area. It is a standard method and it produces a number.",
          "It matters in both directions. Undersizing leaves you doing this again in five years, and oversizing can mean an unnecessary service upgrade with the utility involved, which is the expensive half of the job.",
        ],
      },
      pitfalls: [
        {
          title: "The utility's part of the work",
          body: "Upgrading the service often needs the utility to change the drop, the meter or the connection, on their schedule rather than the electrician's. That can add weeks, and sometimes cost, and it is the single most common reason a panel upgrade takes longer than anybody said.",
          ask: "Does this need the utility, and who arranges it and pays for their part?",
        },
        {
          title: "Grounding and bonding brought up to date",
          body: "Older installations frequently have grounding arrangements that no longer meet current requirements, and a panel replacement is the moment that gets corrected. It is a legitimate addition to the scope and a nasty surprise if it appears after the quote was accepted.",
          ask: "Does the price include bringing the grounding and bonding up to current code?",
        },
      ],
    },

    rewiring: {
      involves: {
        heading: "Why old wiring gets replaced, and how the house gets opened",
        paragraphs: [
          "Rewiring is usually driven by one of a few things: cloth-insulated wiring that has gone brittle, aluminium branch circuits, knob and tube, or simply too few circuits and no ground. The wire itself is a modest cost; getting at it is not.",
          "How much has to open depends on the construction. Some runs can be fished through cavities from above and below, which is why attics and basements matter. Where the route is blocked, the wall comes open.",
        ],
        footnote:
          "Knob and tube and aluminium branch wiring are both insurable problems in many places, not only safety ones. It is worth asking your insurer what they require before you decide how much of the house to do.",
      },
      claim: {
        eyebrow: "Doing it in stages",
        heading: "A partial rewire is reasonable, as long as you know where it stops",
        lead: "Rewiring the whole house at once is disruptive and expensive, and doing it in phases is a legitimate way to manage that. The risk is losing track of what is old.",
        notes: [
          "Phasing by circuit rather than by room is usually the sensible split: the kitchen, the bathrooms and anything outdoors first, because that is where old wiring and water meet.",
          "Whatever the order, insist on a written record of what has been replaced and what has not, marked at the panel. The next owner, the next electrician and your insurer will all want it.",
        ],
      },
      pitfalls: [
        {
          title: "Making good, again",
          body: "As with repiping, most electrical quotes cover the electrical work and stop at the hole. Plaster, drywall, cornice and paint in an older house can be a significant second trade, and in a period property the plasterwork may be the harder job of the two.",
          ask: "Who closes and finishes the walls, and is that inside this price?",
        },
        {
          title: "Old fittings on new circuits",
          body: "A rewire is the natural moment to replace switches, outlets and any fitting that is original to the old wiring. Keeping them saves a little and puts worn accessories on new cable, which tends to be the thing that fails next.",
          ask: "Are the outlets, switches and fittings being replaced as part of this?",
        },
      ],
    },

    "ev-charger-installation": {
      involves: {
        heading: "The charger is simple, the supply to it is the job",
        paragraphs: [
          "A home charger is a dedicated high-current circuit, a protective device and a unit on the wall. Fitting the unit takes an hour. Everything that decides the price is between the panel and that wall: distance, route, whether the walls or the driveway have to open, and whether the panel can carry it.",
          "That last part is where these jobs turn into panel work. A house already close to its service capacity may need a load management device that throttles the charger when the rest of the house is busy, which is usually much cheaper than upgrading the service.",
        ],
        footnote:
          "Most people charge overnight and need far less power than they assume. A slower circuit that adds plenty of range in eight hours can avoid a service upgrade entirely, and is worth pricing alongside the fastest option.",
      },
      claim: {
        eyebrow: "Before you upgrade the service",
        heading: "Load management is usually cheaper than more amps",
        lead: "The reflex when the panel is full is to upgrade the service. For vehicle charging specifically, there is normally a cheaper answer.",
        notes: [
          "A load management device watches the whole-house demand and reduces or pauses the charger when everything else is running. The car takes slightly longer overnight and the service never has to change.",
          "It is explicitly permitted for this purpose in current codes, and it can turn a job that needed the utility involved into an afternoon's work. Ask for it to be priced as an alternative.",
        ],
      },
      pitfalls: [
        {
          title: "Permit and rebate paperwork",
          body: "These installations are permit work nearly everywhere, and many utilities and jurisdictions offer rebates that require the permit, a licensed installer and sometimes a specific charger model. Skipping the permit can cost more in lost rebate than it saved.",
          ask: "Is a permit included, and does this installation qualify for the rebates available here?",
        },
        {
          title: "Hardwired or plug, decided by default",
          body: "A charger on a plug is easier to replace and to take with you; a hardwired one is required for some outdoor locations and higher currents, and in some places the plug version needs additional protection that adds cost. It is a real choice and it is usually made for you.",
          ask: "Is this hardwired or on a receptacle, and why that one here?",
        },
      ],
    },

    "lighting-installation": {
      involves: {
        heading: "Fittings, controls, and whether the dimmer will get on with the lamps",
        paragraphs: [
          "Most lighting work is straightforward: replacing fittings, adding recessed lights, putting in under-cabinet or outdoor lighting. The complications are usually in the ceiling rather than the fitting, particularly where there is insulation, a fire-rated ceiling or a joist exactly where the light should go.",
          "The other complication is dimming. Low-energy lamps and older dimmers are frequently incompatible, which shows up as flicker, buzz, a narrow dimming range or lamps that will not go low without dropping out.",
        ],
        footnote:
          "Colour temperature is worth deciding deliberately across a whole room rather than fitting by fitting. Mixing warm and neutral lamps in one space is the most common reason new lighting looks wrong in a way people struggle to name.",
      },
      claim: {
        eyebrow: "Recessed lights",
        heading: "A downlight is a hole in your ceiling, and the ceiling may have a job",
        lead: "Cutting recessed fittings into a ceiling is easy. Whether that ceiling is doing something else is the question worth asking first.",
        notes: [
          "Where the ceiling is part of a fire separation, between a garage and a room above, or between flats, the fittings have to maintain that rating, and the correct products cost more than standard ones.",
          "Insulation matters too. A fitting not rated for contact with insulation needs clearance around it, and pulling the insulation back from a dozen holes measurably affects the thermal performance of the ceiling.",
        ],
      },
      pitfalls: [
        {
          title: "Dimmer and lamp not matched",
          body: "The commonest complaint after a lighting job is flicker or buzz, and it is almost always a compatibility problem between the dimmer and the driver in the lamp. Manufacturers publish compatibility lists. Choosing both from one list beforehand avoids the whole conversation.",
          ask: "Have you checked the dimmer against the lamps on the manufacturer's compatibility list?",
        },
        {
          title: "Integrated fittings that cannot be relamped",
          body: "Many modern fittings have the light source built in, so when it fails the whole fitting is replaced rather than the lamp. That is fine if you know it, and it is a poor surprise in eight years across twenty downlights in a plastered ceiling.",
          ask: "Are these relampable, or does the whole fitting get replaced when it fails?",
        },
      ],
    },

    "generator-installation": {
      involves: {
        heading: "Standby or portable, and the switch that keeps the power company safe",
        paragraphs: [
          "A standby generator is permanently installed, runs on natural gas or propane, and starts itself when the power fails. A portable is wheeled out, fuelled by hand and connected through an inlet. The standby costs several times as much and asks nothing of you during an outage.",
          "Either way the critical component is the transfer switch. It disconnects the house from the grid before connecting the generator, which stops your generator pushing power back into the lines where somebody is working.",
        ],
        options: [
          {
            name: "Standby",
            note: "Permanently installed, starts itself",
            rows: [
              { label: "Automatic on outage", value: "Yes", tone: "for" },
              { label: "Refuelling", value: "None", tone: "for" },
              { label: "Permit and gas work", value: "Yes", tone: "mixed" },
              { label: "Cost", value: "Much higher", tone: "against" },
            ],
          },
          {
            name: "Portable with an inlet",
            note: "Wheeled out and connected",
            rows: [
              { label: "Automatic on outage", value: "No", tone: "against" },
              { label: "Refuelling", value: "By hand", tone: "against" },
              { label: "Permit and gas work", value: "Inlet only", tone: "for" },
              { label: "Cost", value: "Much lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "Sizing does not have to mean the whole house. A generator feeding a critical loads panel, heating, refrigeration, a few circuits and the well pump, is far cheaper than one carrying air conditioning as well, and covers what an outage actually threatens.",
      },
      claim: {
        eyebrow: "Backfeeding",
        heading: "Never connect a generator through a socket",
        lead: "Running a lead from a generator into a wall socket to feed the house is the one thing in this trade that is genuinely, immediately dangerous, and it is common enough to be worth saying plainly.",
        notes: [
          "It energises the house wiring and, through the meter, the utility lines outside, where linemen are working on what they have every right to believe is a dead circuit.",
          "A proper transfer switch or interlock makes that physically impossible, which is why they are required. It is not paperwork; it is the part that stops the generator killing somebody.",
        ],
      },
      pitfalls: [
        {
          title: "The gas supply was not sized for it",
          body: "A standby generator is a large gas appliance, and the existing meter and pipe were sized before it existed. Undersized supply shows up as the generator stumbling under load, usually when the furnace fires at the same time, which is exactly when you need it.",
          ask: "Has the gas load been recalculated with the generator on it, and does the meter need upgrading?",
        },
        {
          title: "Nobody exercises it",
          body: "A standby unit runs a self-test weekly and still needs oil changes, filters and a load test on a schedule, like any engine. The ones that fail during an outage are almost always the ones that have not run under load in years.",
          ask: "What is the maintenance schedule, and is a service plan available?",
        },
      ],
    },
  },

  /* ----------------------------------------------------- appliance repair */
  "appliance-repair": {
    "refrigerator-repair": {
      involves: {
        heading: "Sealed system or everything else",
        paragraphs: [
          "Refrigerator faults split cleanly. Everything outside the sealed system, the defrost heater and thermostat, fans, door seals, control boards, thermistors, is a normal repair with a normal part. The sealed system, compressor, evaporator and refrigerant, is specialist work, needs certification to open, and costs a large fraction of a new appliance.",
          "The common symptom of a fridge that is cold but not cold enough is usually the defrost system rather than the compressor, and that is the cheap end.",
        ],
        footnote:
          "Before booking, pull the appliance out and vacuum the condenser coils at the back or underneath. A coil packed with dust makes a healthy fridge behave like a failing one, and it is the most common fault there is.",
      },
      claim: {
        eyebrow: "Repair or replace",
        heading: "Weigh the repair against the age and the running cost",
        lead: "The usual rule of thumb is that a repair costing more than about half of a replacement is not worth doing, but the age of the appliance matters as much as the ratio.",
        notes: [
          "A sealed system repair on a unit over about eight years old is rarely sensible. Almost anything else on a decent appliance of that age is.",
          "Running cost tilts it further on older units, because efficiency has improved a lot and a refrigerator runs continuously for its whole life. A fifteen-year-old fridge is quietly expensive even when it is working.",
        ],
      },
      pitfalls: [
        {
          title: "Parts availability on a discontinued model",
          body: "Control boards and cosmetic parts for models more than a few years old can be unobtainable or absurdly priced, and that is discovered after the diagnostic visit has been paid for. It is worth asking the technician to check availability before ordering anything.",
          ask: "Is the part available, and what does it cost, before I commit to the repair?",
        },
        {
          title: "Diagnostic fee terms",
          body: "Nearly every appliance firm charges to attend and diagnose, and they differ on whether it comes off the repair. On a repair you may well decline, that fee is the real cost of finding out, so it is worth knowing the number before the van is dispatched.",
          ask: "What is the call-out and diagnostic fee, and is it credited if I proceed?",
        },
      ],
    },

    "washer-dryer-repair": {
      involves: {
        heading: "Bearings, pumps, belts, and the vent nobody thinks about",
        paragraphs: [
          "Washing machine faults are mostly mechanical and mostly repairable: drain pumps blocked by debris, door seals, shock absorbers and suspension, and on front loaders the drum bearings. Bearings are the expensive one because on many machines the outer drum is sealed, so the repair means a whole drum assembly.",
          "Dryer faults are simpler still, and a large share of them are not faults at all but restricted venting, which makes a working dryer take three cycles to do one load.",
        ],
        footnote:
          "If a dryer has got slower over a year or two, clean the whole vent run to the outside before calling anybody. Restricted venting is the single most common dryer complaint and it is also a fire risk.",
      },
      claim: {
        eyebrow: "Front loaders",
        heading: "A drum bearing is where the repair-or-replace line usually falls",
        lead: "Most washing machine repairs are worth doing. Bearings are the exception that catches people out.",
        notes: [
          "On machines with a sealed outer drum, replacing bearings means replacing the drum assembly and several hours of labour, which frequently lands close to the price of a new machine.",
          "The warning is audible long before failure: a rumble that rises with the spin speed, getting louder over months. Catching it early does not make the repair cheaper, but it does let you plan rather than react.",
        ],
      },
      pitfalls: [
        {
          title: "The vent, not the dryer",
          body: "A dryer that will not dry is very often a venting problem: a crushed flexible hose behind the machine, a long run with too many bends, or a blocked outside flap. A technician who replaces a heating element without checking the vent has fixed a symptom of something still there.",
          ask: "Has the vent run been checked and its length and bends assessed?",
        },
        {
          title: "Stacked and integrated units",
          body: "Machines built into cabinetry or stacked in a closet can need significant work simply to reach, and that labour is real. It is also frequently absent from a phone quote given against a model number.",
          ask: "Does the quote account for getting the machine out of where it is?",
        },
      ],
    },

    "oven-range-repair": {
      involves: {
        heading: "Elements and igniters are routine, control boards are the gamble",
        paragraphs: [
          "Electric ovens fail predictably: bake or broil elements burn through, thermostats and sensors drift, door seals and hinges wear. Gas ranges are similar, with igniters and safety valves in place of elements. All are standard parts and straightforward work.",
          "The exception is the electronic control board. Boards are expensive, frequently model-specific, and on discontinued appliances sometimes unavailable at any price.",
        ],
        footnote:
          "An oven that cooks unevenly or burns one side is usually a sensor or a fan rather than an element, and it can often be confirmed with an oven thermometer before anybody visits.",
      },
      claim: {
        eyebrow: "Gas ranges",
        heading: "A gas smell is not a repair booking",
        lead: "Everything else on this page can wait for an appointment. A persistent smell of gas cannot.",
        notes: [
          "Leave the property, and call the gas utility's emergency line from outside. That service is free nearly everywhere and it is not the same as calling an appliance technician.",
          "Once the supply is confirmed safe, the appliance repair is an ordinary job. The order of those two things is the part that matters.",
        ],
      },
      pitfalls: [
        {
          title: "Board replaced without finding why it failed",
          body: "Control boards sometimes fail on their own and sometimes fail because something else is shorting or overheating. Fitting an expensive board without establishing which is how people end up buying two.",
          ask: "Do we know why the board failed, or are we replacing it and hoping?",
        },
        {
          title: "Built-in ovens and the cabinetry",
          body: "Removing a built-in oven can involve cabinetry, worktop clearances and sometimes a hardwired connection that needs isolating. It is more work than a freestanding cooker and occasionally the cabinet has to be modified to get the replacement back in.",
          ask: "Will the cabinet need altering to get this in or out?",
        },
      ],
    },

    "dishwasher-repair": {
      involves: {
        heading: "Drainage, spray and seals, in that order of likelihood",
        paragraphs: [
          "Most dishwasher complaints are about cleaning performance, and most of those come down to water not getting where it should: a blocked filter, clogged spray arm holes, a failing circulation pump or a drain restriction. None is expensive.",
          "Leaks are the other main category, and they are usually the door seal, the pump seal or a hose connection. Water under the cabinet from a dishwasher is worth acting on quickly because of what it does to the floor and the units around it.",
        ],
        footnote:
          "Clean the filter in the base and clear the spray arm holes with a pin before booking a repair for poor cleaning. On a machine that has never had it done, that is the fix more often than not.",
      },
      claim: {
        eyebrow: "Integrated machines",
        heading: "A slow leak does more damage than the repair costs",
        lead: "A dishwasher sits under a worktop surrounded by particle board, and a leak it is small enough to ignore is a leak that is soaking the cabinets next to it.",
        notes: [
          "By the time water appears on the floor it has usually been wetting the base of the units for a while, and swollen chipboard does not recover.",
          "So a dishwasher that is damp underneath is worth looking at now rather than at the weekend, and worth pulling out to check the floor under it while somebody is there.",
        ],
      },
      pitfalls: [
        {
          title: "Repair priced against a cheap machine",
          body: "Entry-level dishwashers are inexpensive enough that a pump and two hours of labour can approach the price of a new one. On a mid-range or integrated machine the arithmetic is completely different. Ask what the repair costs before deciding anything.",
          ask: "What is the total repair cost, and what would a comparable replacement be?",
        },
        {
          title: "Installation issues blamed on the appliance",
          body: "A drain hose without a high loop, or plumbed into a disposal with the plug still in, produces symptoms that look like a broken machine. These are installation faults, and a technician who corrects one has fixed the problem without replacing anything.",
          ask: "Is the drain hose looped and connected correctly?",
        },
      ],
    },
  },

  /* ----------------------------------------------------- chimney services */
  "chimney-services": {
    "chimney-sweeping": {
      involves: {
        heading: "Removing the deposits, and reading what they tell you",
        paragraphs: [
          "Sweeping removes soot and creosote from the flue with brushes and a vacuum. Creosote is the part that matters: it is condensed combustion products, it burns, and it is what a chimney fire actually consumes.",
          "The sweep is also the inspection. What comes out, and what the flue looks like once it is clean, says whether the appliance is burning properly, whether the liner is intact, and whether anything is nesting in there.",
        ],
        footnote:
          "The usual guidance is annually for a regularly used fireplace or stove, and a sweep before the season rather than after is better, because a summer of damp on a dirty flue is what produces the smell people complain about.",
      },
      claim: {
        eyebrow: "What you burn",
        heading: "Wet wood is what fills a chimney",
        lead: "Creosote builds up fastest when combustion is cool and incomplete, and the most common cause of that is burning wood that is not dry.",
        notes: [
          "Seasoned wood at around twenty percent moisture burns hot and clean. Unseasoned wood spends its heat boiling water out of itself, and the cool smoke that results condenses in the flue.",
          "A moisture meter costs very little and settles the question. It is the single cheapest thing that reduces how often a chimney needs sweeping and how likely a chimney fire is.",
        ],
      },
      pitfalls: [
        {
          title: "A sweep with no report",
          body: "A proper sweep produces a certificate or a report saying what was found and what condition the flue is in. Some insurers ask for it after a fire. A sweep who brushes the flue and leaves without paperwork has done half the service.",
          ask: "Do I get a certificate, and does it record the condition of the flue?",
        },
        {
          title: "Cleaning around a fault",
          body: "A sweep can clean a flue that has a cracked liner or a damaged cap without mentioning it, and the chimney will look fine and still be unsafe to use. Ask specifically what the liner and the cap look like, and ask for photographs if there is a camera on the job.",
          ask: "What condition are the liner and the cap in, and can I see?",
        },
      ],
    },

    "chimney-repair": {
      involves: {
        heading: "The crown, the flashing and the mortar, which is where water gets in",
        paragraphs: [
          "Most chimney repairs are about water rather than fire. The crown on top cracks, the flashing where the stack meets the roof fails, and the mortar joints in the exposed brickwork erode, because a chimney is the one part of the building weathered on all four sides and above.",
          "Repointing replaces the failed mortar. Crown repair or replacement seals the top. Flashing is roofing work as much as chimney work, and on older properties it is often the original lead or the wrong material entirely.",
        ],
        footnote:
          "Water damage inside a chimney is progressive and it works on the liner and the structure together. A stain on a ceiling next to the stack is usually flashing, and it is cheaper to deal with in the year it appears.",
      },
      claim: {
        eyebrow: "Waterproofing",
        heading: "Sealing masonry with the wrong product traps water in",
        lead: "Waterproofing a chimney is a legitimate and useful measure, and the product has to be vapour permeable.",
        notes: [
          "A breathable masonry sealer keeps liquid water out while letting water vapour escape. A film-forming waterproofer seals both ways, so anything that gets in, and something always does, stays in and freezes.",
          "The damage from that is worse than no treatment at all. It is worth asking what product is being used and confirming it is breathable rather than a general purpose sealer.",
        ],
      },
      pitfalls: [
        {
          title: "The wrong mortar on old brick",
          body: "Repointing soft old brick with hard modern cement mortar makes the mortar stronger than the brick, so the brick face spalls off instead of the joint wearing. On a period property the correct mix is usually lime based, and it is a common and expensive mistake.",
          ask: "What mortar mix are you using, and is it softer than the brick?",
        },
        {
          title: "Flashing sealed rather than replaced",
          body: "Running sealant around old flashing is a temporary measure sold as a repair more often here than almost anywhere else on a house, because nobody can see it from the ground. Proper flashing is stepped into the mortar joints, not stuck to the surface.",
          ask: "Is the flashing being replaced and stepped into the joints, or sealed?",
        },
      ],
    },

    "chimney-inspection": {
      involves: {
        heading: "Three levels, and which one you actually need",
        paragraphs: [
          "Chimney inspections are commonly described in three levels. The first is a visual check of the readily accessible parts, appropriate for an unchanged system in regular use. The second adds a camera survey of the flue and is what a property sale, a change of appliance or a suspected problem calls for. The third opens up the structure and is reserved for a known serious fault.",
          "The second level is the one most people should be asking for and the one least often quoted, because it needs a camera and takes longer.",
        ],
        footnote:
          "After a chimney fire, an earthquake or a serious storm, a visual inspection is not enough. Flue liners crack in ways that are invisible from either end and only show on camera.",
      },
      claim: {
        eyebrow: "Buying a house",
        heading: "A general home inspection does not inspect the chimney",
        lead: "Home inspectors look at the outside of a stack and into the firebox. That is not an assessment of the flue, and the flue is where the expensive problems live.",
        notes: [
          "Relining a chimney is a significant cost, and a cracked liner is entirely invisible during a normal viewing and a normal home inspection.",
          "If the house has a working fireplace or stove you intend to use, a camera inspection before exchange is cheap against what it can find, and it gives you something concrete to negotiate with.",
        ],
      },
      pitfalls: [
        {
          title: "Free inspection, found problem",
          body: "The same pattern as roofing after a storm. A free inspection from a firm that sells relining is a sales visit, which is fine as long as you treat it as one. For anything expensive, get a second opinion from somebody not quoting for the work.",
          ask: "Are you quoting for the repair as well, and can I see the camera footage myself?",
        },
        {
          title: "No footage handed over",
          body: "If a camera goes up the flue, the recording is yours and it is the evidence for whatever is recommended next. A verbal account of what the camera saw is worth much less, particularly if you want to compare quotes.",
          ask: "Will you give me the video file, not just a description of it?",
        },
      ],
    },

    "liner-installation": {
      involves: {
        heading: "Why flues get lined, and what goes in",
        paragraphs: [
          "A liner gives the flue a continuous, correctly sized path for combustion gases. Old chimneys were often built without one, or with clay tiles that have cracked, and fitting a new appliance nearly always means a liner because the appliance needs a specific diameter.",
          "The usual answer is a flexible stainless steel liner dropped down the stack, with the annular space insulated. Rigid systems and cast-in-place liners exist for particular situations.",
        ],
        footnote:
          "Stainless liners come in different grades, and the right grade depends on what you burn. Wood, multi-fuel and condensing gas appliances all attack the steel differently, and the wrong grade fails early.",
      },
      claim: {
        eyebrow: "Sizing",
        heading: "An oversized flue draws worse than a correct one",
        lead: "It seems as though a bigger flue should draw better. For a modern appliance the opposite is usually true.",
        notes: [
          "Gases in an oversized flue cool as they rise, slow down, and condense on the way, which is both poor draught and the fastest route to creosote or acidic condensate.",
          "The liner should be sized to the appliance manufacturer's specification rather than to the opening in the chimney, and a fitter who asks what appliance is going on the end before quoting is asking the right question.",
        ],
      },
      pitfalls: [
        {
          title: "No insulation around the liner",
          body: "The gap between the liner and the old flue should be insulated, with a wrap or a pour. Leaving it empty lets the liner run cold, which hurts draught and encourages condensation, and it is the easiest thing to omit from a quote without it being visible afterwards.",
          ask: "Is the liner being insulated, and with what?",
        },
        {
          title: "Warranty conditional on servicing",
          body: "Liner warranties are often long and nearly always conditional on annual sweeping by a qualified sweep, with records. Plenty of people discover the condition when they try to claim, having swept it themselves or not at all.",
          ask: "What does the liner warranty require me to do each year to keep it valid?",
        },
      ],
    },
  },

  /* --------------------------------------------------------- garage doors */
  "garage-doors": {
    repair: {
      involves: {
        heading: "Springs, rollers, cables and tracks, and one of them is dangerous",
        paragraphs: [
          "A garage door is a heavy panel balanced by springs so that a small motor, or a person, can lift it. Most repairs are to the parts that wear: rollers, hinges, cables, the bottom seal, and the opener's own gear.",
          "The springs are different. They hold the door's entire weight as stored energy, and releasing that energy without the right tools and method is how people are seriously injured.",
        ],
        footnote:
          "If the door is hard to lift by hand with the opener disconnected, the problem is almost certainly the spring balance rather than the motor, and running the opener against it will destroy the opener next.",
      },
      claim: {
        eyebrow: "Springs",
        heading: "Torsion spring work is not a home repair",
        lead: "This is the one job on a garage door where the advice is unambiguous: do not do it yourself, and do not accept it from somebody without the tools for it.",
        notes: [
          "A torsion spring on a double door stores enough energy to break bones. It is wound under tension with purpose-made bars, and improvising that is where the injuries come from.",
          "It is also not expensive to have done. The cost of the spring and the visit is small compared with almost any other repair in this list, which makes the risk an entirely unnecessary one to take.",
        ],
      },
      pitfalls: [
        {
          title: "Replacing one spring of a pair",
          body: "Springs on a two-spring door have lived the same life and have the same number of cycles in them. Replacing the broken one and leaving its twin means a second call, a second visit charge, and an unbalanced door in the meantime.",
          ask: "If one spring has gone, what does it cost to do both now?",
        },
        {
          title: "Cheap springs quoted by cycle life",
          body: "Springs are rated in cycles, and the difference between a standard spring and a high-cycle one is small on the invoice and large in years. On a door used several times a day, the standard spring is a false economy nobody mentions.",
          ask: "What cycle rating are these springs, and what does the longer-life option cost?",
        },
      ],
    },

    "opener-installation": {
      involves: {
        heading: "Chain, belt or screw, and the safety gear that is not optional",
        paragraphs: [
          "Openers differ mainly in how they drive the door. Chain drives are cheapest and noisiest, belt drives are quiet and cost more, screw drives sit in between and need occasional lubrication. Under a bedroom, belt is usually worth the difference.",
          "Regardless of type, the opener must have photo-eye sensors near the floor and an automatic reverse on obstruction. These are requirements, not features, on anything sold in the last few decades.",
        ],
        footnote:
          "Test the reverse every few months: put a solid object flat on the floor in the door's path and close it. The door should touch it and immediately go back up. If it does not, the opener needs adjusting before it is used again.",
      },
      claim: {
        eyebrow: "Balance first",
        heading: "The opener is not supposed to lift the door",
        lead: "A correctly balanced door is held almost entirely by its springs. The opener only overcomes the small remaining imbalance and friction.",
        notes: [
          "That is why fitting a more powerful opener to an unbalanced door is the wrong fix. It will work for a while and then wear out early, having masked the actual problem.",
          "Disconnect the opener and lift the door by hand to waist height. A balanced door stays roughly where you leave it. If it drops or flies up, the springs need adjusting before any new opener goes on.",
        ],
      },
      pitfalls: [
        {
          title: "Old remotes and rolling codes",
          body: "New openers use rolling security codes and will not work with older remotes or keypads. That is a good thing, and it means budgeting for new remotes, a new external keypad, and reprogramming anything built into a vehicle.",
          ask: "What does it cost to get the extra remotes, the keypad and the car buttons working?",
        },
        {
          title: "Wall reinforcement skipped",
          body: "Openers pull against the top panel of the door, and lightweight doors often need a reinforcement bracket to spread that load. Without it the motor slowly bends the panel it is pulling on, and the damage appears a season later.",
          ask: "Does this door need a reinforcement bracket at the top panel, and is it included?",
        },
      ],
    },

    "spring-replacement": {
      involves: {
        heading: "Torsion or extension, and how long they are meant to last",
        paragraphs: [
          "Torsion springs sit on a bar above the door and wind up as it closes. Extension springs run along the horizontal tracks on each side and stretch. Torsion is the more common modern arrangement, lasts longer and behaves better if it breaks.",
          "Springs are rated in cycles, one open and one close being a cycle, and a standard spring is often around ten thousand. A household opening the door four times a day gets through that in roughly seven years.",
        ],
        footnote:
          "Extension springs should always have a containment cable running through them. Without one, a spring that breaks under tension becomes a projectile inside the garage.",
      },
      claim: {
        eyebrow: "Cycle life",
        heading: "Paying more for the spring is the cheapest upgrade on the door",
        lead: "Springs are one of the few components where spending more buys a straightforwardly proportional increase in life.",
        notes: [
          "High-cycle springs are physically larger and rated for two or three times the cycles of a standard set, and the price difference is modest against the labour of a visit.",
          "Since almost all of the cost of replacing springs is the call rather than the part, buying the longer-lived spring means fewer calls, which is where the actual saving is.",
        ],
      },
      pitfalls: [
        {
          title: "Wrong spring for the door's weight",
          body: "Springs are matched to the weight and height of the specific door. A set chosen approximately leaves a door that is unbalanced from the day it is fitted, wearing the opener and never quite sitting where it should.",
          ask: "How are you determining the correct spring for this door's weight?",
        },
        {
          title: "Cables and bearings left in place",
          body: "Cables and the bearings at the ends of the torsion bar have worn through exactly the same cycles as the spring. Replacing the spring alone is the cheapest quote and the one most likely to bring somebody back.",
          ask: "Are the cables and bearings being replaced at the same time?",
        },
      ],
    },

    "door-installation": {
      involves: {
        heading: "Insulation, material and the tracks that decide what fits",
        paragraphs: [
          "A new door is chosen on material, steel, timber or composite, on insulation, expressed as an R-value, and on how it looks. If the garage is attached to the house, shares a wall with a room, or is used for anything other than parking, the insulation is the specification that matters most.",
          "The other constraint is the space above and beside the opening, which decides what track configuration is possible. Low headroom situations need particular hardware.",
        ],
        footnote:
          "An insulated door with a poorly sealed perimeter performs badly regardless of its rating. The seals at the sides, the top and along the floor do a large share of the work, and they are the part that wears.",
      },
      claim: {
        eyebrow: "Attached garages",
        heading: "The door between the garage and the house is the one with rules",
        lead: "People replacing a garage door often do not realise that the internal door from the garage into the house is a fire separation with requirements of its own.",
        notes: [
          "It typically has to be fire rated and self-closing, and the wall and ceiling between the garage and the living space have their own rating.",
          "It comes up because a garage door replacement is often when somebody first looks closely at the garage, and because it is a genuine safety item rather than a formality.",
        ],
      },
      pitfalls: [
        {
          title: "Disposal of the old door",
          body: "Removing and disposing of the existing door and hardware is real work and it appears in some quotes and not others. It is a simple thing to compare and a common reason two prices differ by more than they seem to.",
          ask: "Is removing and disposing of the old door included?",
        },
        {
          title: "Reusing the existing opener",
          body: "Keeping the old opener with a new door can be fine, and it can also mean an opener sized for a lighter door, or one too old for the safety requirements. Worth a decision rather than an assumption.",
          ask: "Is the existing opener suitable for the weight of this new door?",
        },
      ],
    },
  },

  /* ------------------------------------------------------ home remodeling */
  "home-remodeling": {
    "kitchen-remodeling": {
      involves: {
        heading: "Where the plumbing and the wiring are decides most of the budget",
        paragraphs: [
          "A kitchen remodel divides into work that keeps the existing layout and work that moves things. Replacing cabinets, worktops and appliances in the same positions is expensive but predictable. Moving the sink, the range or a wall brings in plumbing, electrical, structural and permit work, and that is a different order of cost.",
          "The other large variable is cabinetry. Stock, semi-custom and custom cabinets can differ by a factor of three for a kitchen of the same size, and they also differ in lead time by months.",
        ],
        footnote:
          "Order the appliances before the cabinets are made. Appliance dimensions vary more than people expect, and a cabinet run built to assumed sizes is an expensive thing to alter afterwards.",
      },
      claim: {
        eyebrow: "The contingency",
        heading: "Hold back a contingency, because the walls will have something in them",
        lead: "Kitchens sit against plumbing, wiring and sometimes structure, all of it hidden until demolition, and in an older house something is usually not what anybody assumed.",
        notes: [
          "Ten to twenty percent held back is the normal advice, and on a house over fifty years old the upper end is more realistic than the lower.",
          "That money is not a buffer for changing your mind. Keeping the two separate, contingency for what is found and a different budget for what you decide to upgrade, is what stops a project drifting.",
        ],
      },
      pitfalls: [
        {
          title: "No written schedule of what happens when",
          body: "A kitchen is a sequence of trades and a delay anywhere pushes everything after it. Without a written schedule and a named person coordinating it, the gaps between trades become the longest part of the job and nobody owns them.",
          ask: "Who is coordinating the trades, and can I see the schedule with the sequence on it?",
        },
        {
          title: "Change orders agreed verbally",
          body: "Mid-project changes are normal. Agreeing them in conversation is where disputes come from. Every change should have a written price and a note of its effect on the schedule, signed before the work is done rather than invoiced after.",
          ask: "How are changes priced and approved once work has started?",
        },
      ],
    },

    "bathroom-remodeling": {
      involves: {
        heading: "Waterproofing and ventilation, then everything else",
        paragraphs: [
          "The visible parts of a bathroom, the tiling, the fittings, the vanity, sit on two invisible systems that decide whether the room lasts. The waterproofing behind the tile in the wet area, and the ventilation that removes the moisture from the air.",
          "Get either wrong and the room looks perfect for two years and then does not. Rotten substrate behind a shower is the most expensive common failure in domestic building, and it is entirely preventable.",
        ],
        footnote:
          "Extractor fans are frequently undersized and frequently vented into the loft rather than outside. Both are common and both put the moisture somewhere it will do damage instead of removing it.",
      },
      claim: {
        eyebrow: "The shower",
        heading: "Tile is not the waterproof layer",
        lead: "Tile and grout shed water. They do not stop it. The waterproofing is a separate membrane system behind them, and it is a system rather than a product.",
        notes: [
          "The membrane, the corner pieces, the pipe collars and the bonding all have to come from one manufacturer's range and be installed to their instructions, because that is what the warranty covers and what actually seals.",
          "Ask which system is being used and ask for the manufacturer's name. A bathroom fitter who cannot answer that is not doing this part deliberately.",
        ],
      },
      pitfalls: [
        {
          title: "Ventilation that does not reach outside",
          body: "A fan discharging into a roof space moves the moisture out of the bathroom and deposits it in the structure. It is extremely common in older work. The duct should run to an outside terminal, be insulated where it passes through cold space, and have a fall away from the fan.",
          ask: "Where does the extractor duct terminate, and is it insulated on the way?",
        },
        {
          title: "Floor and substrate taken on trust",
          body: "Tiled bathroom floors need a substrate stiff enough not to flex, and in older houses the existing floor often is not. Tiling over it produces cracked grout within a year. The strengthening is not visible in the finished room and is easy to leave out of a keen price.",
          ask: "What is going under the floor tile, and has the deflection been checked?",
        },
      ],
    },

    "basement-remodeling": {
      involves: {
        heading: "Dry first, then finish, never the other way round",
        paragraphs: [
          "A basement conversion has one prerequisite that nothing else in remodelling shares: the space has to be reliably dry before any finish goes into it. That can mean grading and drainage outside, a perimeter drain and sump inside, or sealing and vapour control on the walls and slab.",
          "Once that is settled, the rest is ordinary construction with a few extra constraints: ceiling height, egress, and how the mechanical services that live down there get boxed in without becoming unreachable.",
        ],
        footnote:
          "Any bedroom in a basement needs a proper means of escape, which usually means a window of a specified size and reach, or a door. It is a safety requirement and also the thing that decides whether the room can be described as a bedroom at all.",
      },
      claim: {
        eyebrow: "Moisture",
        heading: "Finishing over a damp basement builds a mould culture",
        lead: "Studs, insulation and plasterboard against a wall that takes on moisture is the most reliable way to grow mould in a house, and it is invisible until it smells.",
        notes: [
          "The honest test is to tape a square of clear plastic tightly to the bare slab and to the wall and leave it a few days. Moisture on the underside means it is coming through the concrete; on the top means it is condensing out of the air. They have different fixes.",
          "Materials matter as well as the fix. In a basement, inorganic insulation and moisture-tolerant boards are worth their extra cost, because the whole point is that the wall assembly can survive getting damp.",
        ],
      },
      pitfalls: [
        {
          title: "Ceiling height and permits",
          body: "Finished basements have minimum ceiling heights, and ducts and beams are usually what breaks them. It is also the room most often finished without permission, which becomes a problem at sale when the square footage cannot be counted and an inspector wants the work opened up.",
          ask: "Does this meet the ceiling height requirement, and is it being permitted?",
        },
        {
          title: "Services boxed in beyond reach",
          body: "The furnace, the water heater, the shut-offs and the electrical panel all live down here and all need access and clearance. Framing that looks tidy on the drawing can leave an appliance unserviceable or a panel illegally enclosed.",
          ask: "What clearances do the panel and the appliances need, and does the layout keep them?",
        },
      ],
    },

    additions: {
      involves: {
        heading: "Approvals and foundations come long before anybody builds",
        paragraphs: [
          "An addition is a construction project rather than a renovation. There is design, structural engineering, planning or zoning approval, a building permit, foundations, connection to the existing structure, and the extension of every service into the new space.",
          "The lead time before work starts is often as long as the build. Approval timescales are outside everybody's control and they are the usual reason an addition takes a year rather than the months the construction itself needs.",
        ],
        footnote:
          "Where the new roof meets the old, and where the new foundation meets the existing one, are the two junctions that cause most later problems. They deserve detail on the drawings rather than being left to the site.",
      },
      claim: {
        eyebrow: "Design and build",
        heading: "Decide early who owns the drawings",
        lead: "An addition can be arranged as design and build, where one firm does both, or with an independent architect or designer producing drawings that contractors bid on. They produce very different projects.",
        notes: [
          "Design and build is simpler to manage and gives one point of responsibility, at the cost of an independent check on what is being proposed and what it should cost.",
          "Separating them costs more in fees and gives you comparable bids and somebody on your side of the table during construction. On a project this size, that is usually worth it.",
        ],
      },
      pitfalls: [
        {
          title: "Allowances standing in for decisions",
          body: "Bids contain allowances for things not yet chosen: finishes, fittings, kitchens. A low bid is often a bid with low allowances, which does not mean a cheaper project, only a later reckoning. Compare the allowances, not the totals.",
          ask: "What allowances are in this bid, and what do they actually buy?",
        },
        {
          title: "How the existing house is affected",
          body: "Tying into an existing building means opening walls, possibly moving services, and living in a house that is part building site. What gets protected, what gets made good, and whether anything existing has to be upgraded to current code are all real costs that sit at the edges of the scope.",
          ask: "What work to the existing house is included, and what has to be brought up to code?",
        },
      ],
    },
  },

  /* ---------------------------------------------------------- landscaping */
  landscaping: {
    "lawn-care": {
      involves: {
        heading: "Mowing is the visible part, the soil is the actual job",
        paragraphs: [
          "A lawn programme is usually mowing, feeding, weed control, and some combination of aeration and overseeding. The first two are what people buy and the last two are what tends to change the lawn, because compacted soil is the underlying cause of most of what a lawn is criticised for.",
          "Aeration pulls plugs out and relieves that compaction; overseeding straight afterwards puts new grass into the holes. Done together in the right season they do more than another year of feed.",
        ],
        footnote:
          "Cutting too short is the most common self-inflicted lawn problem. Longer grass shades out weed seedlings and roots deeper, and raising the mower is free.",
      },
      claim: {
        eyebrow: "The soil test",
        heading: "Feeding without a soil test is guessing expensively",
        lead: "Fertiliser programmes are usually sold as a schedule rather than as a response to anything measured about your soil.",
        notes: [
          "A soil test costs very little and says what is actually short, and what the pH is. Nutrients applied to soil at the wrong pH are largely unavailable to the grass however much goes down.",
          "It also tends to reduce the programme rather than expand it, which is a reasonable way to judge whether the company recommending it is selling you applications or results.",
        ],
      },
      pitfalls: [
        {
          title: "Contracts that roll over",
          body: "Lawn programmes usually renew automatically for the next season, sometimes with a price rise and a pre-payment. That is fine if it is what you want and irritating if it arrives unasked. Check the renewal and cancellation terms at the start.",
          ask: "Does this renew automatically, and what notice do I need to give?",
        },
        {
          title: "Treatments applied on a calendar",
          body: "Pre-emergent weed control in particular works within a soil temperature window rather than on a date. A firm applying on a fixed schedule regardless of the season will sometimes be applying at a point where it does very little.",
          ask: "Are the applications timed to soil temperature or to a fixed calendar?",
        },
      ],
    },

    hardscaping: {
      involves: {
        heading: "The base course is the part that decides whether it moves",
        paragraphs: [
          "Patios, paths, driveways and retaining walls are mostly invisible work. Under the paving there is excavation, a compacted aggregate base of a specified depth, and bedding, and the depth of that base is set by the soil and by what the surface will carry.",
          "Nearly every failed patio, sunken paver and heaved path traces back to a base that was too thin, not compacted in layers, or laid on ground that was not right.",
        ],
        footnote:
          "Drainage and fall away from the building matter as much as the base. Paving laid level, or falling towards the house, delivers water to the wall for the life of the surface.",
      },
      claim: {
        eyebrow: "Retaining walls",
        heading: "Above a certain height a retaining wall is engineering",
        lead: "Low decorative walls are landscaping. Walls retaining any real height of soil are structures holding back a great deal of weight, and they are regulated accordingly.",
        notes: [
          "Most jurisdictions require engineering and a permit above a threshold height, commonly around three or four feet, and lower if there is a surcharge such as a driveway or a slope above it.",
          "The drainage behind the wall is what most often causes failure: water builds up and the pressure pushes the wall out. A wall quote with no mention of drainage stone and a drain pipe behind it is missing the thing that keeps it standing.",
        ],
      },
      pitfalls: [
        {
          title: "Base depth not specified",
          body: "This is the number to compare between quotes and the one most often absent. A patio base that is four inches where it should be eight will look identical on completion and will not be identical in three winters.",
          ask: "What base depth are you excavating to, and how is it being compacted?",
        },
        {
          title: "Utilities not located before digging",
          body: "Hardscaping means excavation, and buried services are exactly where people dig. Locating is free or cheap nearly everywhere and is legally required in most places, and hitting a line is dangerous and expensive.",
          ask: "Have the utilities been located and marked before you dig?",
        },
      ],
    },

    irrigation: {
      involves: {
        heading: "Zones, heads and the controller that decides whether it wastes water",
        paragraphs: [
          "A system is divided into zones, each sized to what the water supply can run at once, with heads chosen for the planting: spray heads for lawn, rotors for larger areas, drip for beds. Mixing head types within a zone is the classic design fault, because they apply water at completely different rates.",
          "The controller is where most of the waste happens. A fixed schedule waters the same amount in April and August and during a week of rain.",
        ],
        footnote:
          "A rain sensor or a soil moisture sensor is inexpensive, required in some jurisdictions, and stops the most visible waste there is, which is sprinklers running in the rain.",
      },
      claim: {
        eyebrow: "Backflow",
        heading: "The backflow device protects the drinking water, not the garden",
        lead: "Irrigation connects a system full of standing water, fertiliser and whatever is on the soil to the potable supply. The backflow preventer is what stops that being drawn back into the house.",
        notes: [
          "It is required by code, it is usually required to be tested annually by a certified tester, and the test is a matter of record with the water authority in many places.",
          "It is also the part of an irrigation system homeowners most often do not know they have or are responsible for, until a letter arrives asking for the test certificate.",
        ],
      },
      pitfalls: [
        {
          title: "Head spacing that leaves dry patches",
          body: "Sprinkler heads should be spaced so each throws to the next, which looks like heavy overlap and is what produces even coverage. Spacing them to just touch leaves dry rings that get blamed on the grass and treated with fertiliser.",
          ask: "Is the layout designed head to head, and what is the spacing?",
        },
        {
          title: "Winterisation left to the owner",
          body: "In any climate that freezes, the system has to be drained or blown out before winter, and a system left charged will split pipes and heads underground. Whether that visit is included, and what it costs, should be settled at installation.",
          ask: "Is winterisation included, and what happens if a freeze damages the system?",
        },
      ],
    },

    design: {
      involves: {
        heading: "A plan you can build from, in stages if you need to",
        paragraphs: [
          "Garden design produces drawings: a survey of what is there, a layout, planting plans and enough construction detail for somebody to price and build it. The value is that it resolves levels, drainage, circulation and planting together, before anybody moves soil.",
          "It also lets the work be phased sensibly. A plan makes it possible to build the hard landscaping this year and plant next year without the second phase fighting the first.",
        ],
        footnote:
          "Planting plans should name species and sizes and account for mature spread rather than how the bed looks on planting day. Overplanting for instant effect is the most common reason a garden needs thinning out in four years.",
      },
      claim: {
        eyebrow: "Design and build",
        heading: "A designer who also builds is quicker; a designer who does not is impartial",
        lead: "The same trade-off as an addition, at a smaller scale, and worth making deliberately rather than by default.",
        notes: [
          "A design-and-build practice knows what its own crews can do and what it costs, which makes the plan realistic and the process simple.",
          "An independent designer produces a plan several contractors can bid on, which is the only way to know what the build is actually worth. On a large garden that difference usually exceeds the fee.",
        ],
      },
      pitfalls: [
        {
          title: "Drawings you cannot build from",
          body: "A beautiful rendering is not a construction document. Without levels, drainage, setting out dimensions and specifications, contractors are each interpreting it differently, which is why their prices vary so much and why the built result differs from the picture.",
          ask: "What drawings do I get, and is there enough detail for a contractor to price it accurately?",
        },
        {
          title: "Plants specified for the wrong conditions",
          body: "Sun, shade, soil type, drainage and hardiness all decide whether a planting plan survives. A plan drawn to a look rather than to the site produces a garden that needs replanting within two seasons, usually at the owner's cost.",
          ask: "Has the soil and the aspect been assessed, and are these plants suited to it?",
        },
      ],
    },
  },

  /* ----------------------------------------------------------- locksmiths */
  locksmiths: {
    "emergency-lockout": {
      involves: {
        heading: "Opening it without destroying it",
        paragraphs: [
          "A competent locksmith opens most domestic locks non-destructively, by picking, bypassing or manipulating the mechanism. Drilling is a last resort, and it means the lock is replaced rather than reopened.",
          "Which one you get depends more on who turns up than on your lock. It is the difference between a modest bill and paying for a new cylinder on top.",
        ],
        footnote:
          "If you are locked out of a car with a child or an animal inside, call the emergency services rather than a locksmith. That is not a lock problem and it is usually free.",
      },
      claim: {
        eyebrow: "The call",
        heading: "The trade has a lead generation problem, and it costs homeowners",
        lead: "Search results for emergency locksmiths are heavily populated by call centres with local-looking numbers that dispatch whoever is nearest, at a price agreed with nobody.",
        notes: [
          "The pattern is a low quoted figure on the phone, a technician who says the lock must be drilled, and a final bill several times the quote with the pressure of standing outside your own house.",
          "The defences are simple: use a firm with a real local address, ask for the total including call-out and any drilling before they set off, ask for identification on arrival, and be wary of anyone who will not name a figure.",
        ],
      },
      pitfalls: [
        {
          title: "Drilling presented as the only option",
          body: "Most standard residential locks can be opened non-destructively by somebody with the skill. Immediate drilling on an ordinary lock usually says more about the technician's training than about the lock, and it converts a service call into a parts sale.",
          ask: "Can this be opened without drilling, and if not, why not?",
        },
        {
          title: "No proof you live there",
          body: "A legitimate locksmith will ask for identification showing the address before opening the door. If nobody asks, that is a firm that would open your door for somebody else too, which is worth knowing about the company you just let into your house.",
          ask: "What identification do you need from me before opening it?",
        },
      ],
    },

    rekeying: {
      involves: {
        heading: "Changing which key works, without changing the lock",
        paragraphs: [
          "Rekeying replaces the pins inside the existing cylinder so it accepts a different key. The hardware stays on the door, it takes a few minutes per lock, and it costs a fraction of replacement.",
          "It is the right answer whenever the concern is who might hold a key: moving into a house, a tenant changing, a set of keys lost, a relationship ending, or builders handing back.",
        ],
        footnote:
          "It is also the moment to get every exterior lock onto one key if they are not already. Most cylinders of a similar type can be keyed alike, and it costs almost nothing extra while somebody is already doing the work.",
      },
      claim: {
        eyebrow: "Moving in",
        heading: "You have no idea how many keys exist to a house you just bought",
        lead: "Between previous owners, their family, tradespeople, cleaners, neighbours and agents, the number of keys to any given house is unknown and usually larger than anybody assumes.",
        notes: [
          "Rekeying every exterior lock on the day you get the keys costs very little and settles the question permanently.",
          "It is worth doing even on a new build, where keys have circulated among trades for months and the builder's system may still work.",
        ],
      },
      pitfalls: [
        {
          title: "Replacement quoted where rekeying would do",
          body: "Selling new hardware is more profitable than rekeying, and on a sound lock in good condition it is unnecessary. Replacement is genuinely warranted when the lock is worn, damaged or too weak a grade, not merely because the key changed.",
          ask: "Can these cylinders be rekeyed, and if you are recommending replacement, why?",
        },
        {
          title: "Restricted keyways and future copies",
          body: "High security cylinders often use patented keys that can only be duplicated by an authorised dealer with proof of authorisation. That is the security benefit and it is also a practical constraint, so it is worth understanding before you fit them.",
          ask: "Who can cut copies of this key, and what do I need to prove to get one?",
        },
      ],
    },

    "lock-installation": {
      involves: {
        heading: "Grades, deadbolts, and the screws that hold the strike plate",
        paragraphs: [
          "Locks are graded, and the grade describes how much force and how many cycles they are built for. The grade appropriate for an exterior door on a house is higher than most hardware sold in general retailers.",
          "The lock is rarely the weak point of a domestic door. Forced entry usually splits the frame around the strike plate, which is held by short screws into soft trim rather than into the structural framing behind it.",
        ],
        footnote:
          "Replacing the strike plate with a reinforced one and using three inch screws that reach the framing is the cheapest meaningful security improvement available to a homeowner, and it takes ten minutes.",
      },
      claim: {
        eyebrow: "Where doors fail",
        heading: "The frame gives way before the lock does",
        lead: "Spending on a high-grade deadbolt while leaving the strike plate fixed with short screws into the door casing puts a strong lock in a weak hole.",
        notes: [
          "A kick concentrates its force on the strike, and the trim it is usually screwed to is a thin piece of timber nailed to the frame. Long screws into the stud behind change the failure point entirely.",
          "The same applies to the hinges on an outward opening door, and to the glass next to a door with a thumb turn on the inside, both of which are usually cheaper to address than a lock upgrade.",
        ],
      },
      pitfalls: [
        {
          title: "Grade not specified",
          body: "Hardware that looks identical can be two grades apart, and the difference is in the internal components rather than the finish. If a quote does not name a grade, it is not specifying the thing that matters about the product.",
          ask: "What grade are these locks, and is that appropriate for an exterior door?",
        },
        {
          title: "Egress and fire requirements",
          body: "Double cylinder deadbolts, which need a key on the inside as well, stop somebody reaching through broken glass and also stop you leaving in a fire without finding a key. They are restricted or prohibited in many places for exactly that reason.",
          ask: "Is a key-operated inside cylinder permitted here, and is it the right choice on this door?",
        },
      ],
    },

    "smart-lock-installation": {
      involves: {
        heading: "The mechanism, the connectivity and the batteries",
        paragraphs: [
          "Smart locks either replace the whole lockset or fit over the inside of an existing deadbolt and turn it. The second kind keeps your existing key and cylinder, which is simpler and often the better choice.",
          "The differences that matter day to day are how it connects, and what happens when the batteries die or the internet does.",
        ],
        footnote:
          "Check the door first. Smart locks are less tolerant of a door that needs a shove to latch than a key is, because a motor has less force than a hand, and a misaligned strike is the most common reason one fails to lock.",
      },
      claim: {
        eyebrow: "When it fails",
        heading: "Know the manual override before you need it",
        lead: "Every smart lock has a way in when the batteries are flat or the electronics fail. Finding out what yours is at the door, in the dark, is the wrong time.",
        notes: [
          "Common overrides are a physical key, external contacts you can touch a battery to, or a keypad code stored in the lock itself rather than in the cloud.",
          "The related question is what happens when the internet is down. A lock that needs a network to open from the keypad is a different proposition to one that only needs it for remote access, and both exist.",
        ],
      },
      pitfalls: [
        {
          title: "Codes that stay after people leave",
          body: "The point of a smart lock is guest and contractor codes, and the value depends on them actually being removed or time-limited. Plenty of locks accumulate active codes for people who have not been near the house in years.",
          ask: "Can codes be time-limited, and can I see and revoke every active one?",
        },
        {
          title: "The account outlives the owner",
          body: "Smart locks are tied to an account, and when a house sells or a tenant changes, the old account may retain access. Transferring or factory resetting the lock is a step people skip, and it is the digital equivalent of not rekeying.",
          ask: "How do I fully transfer or reset this so no previous account keeps access?",
        },
      ],
    },
  },

  /* ---------------------------------------------------- moving companies */
  "moving-companies": {
    local: {
      involves: {
        heading: "Priced by the hour, so the estimate is about time",
        paragraphs: [
          "Local moves are normally charged hourly for a crew and a truck, sometimes with a minimum and travel time either end. That means the estimate is really a prediction of how long your move will take, and the things that change it are access, stairs, distance from door to truck, and how well packed you are.",
          "Being genuinely ready when the crew arrives is the largest single lever on the final bill, and it is entirely in your control.",
        ],
        footnote:
          "Ask whether travel time is charged, and from where. Some firms bill from their depot to your door and back again, which can add an hour to a short move before anything is lifted.",
      },
      claim: {
        eyebrow: "Valuation",
        heading: "The cover included is not insurance, and it is very low",
        lead: "Movers include a basic liability that is typically calculated by weight rather than by value, which comes to a small fraction of what anything is worth.",
        notes: [
          "Under that basic cover, a damaged item is settled on its weight. A heavy, cheap item and a light, valuable one are treated identically, and the valuable one is badly served.",
          "Full value protection is available at extra cost, and household insurance sometimes covers goods in transit. Either is worth arranging in advance for anything you would actually mind losing.",
        ],
      },
      pitfalls: [
        {
          title: "An estimate given without seeing the place",
          body: "A quote over the phone without a walkthrough, in person or by video, is a guess against an assumed inventory. It is also the usual precondition for the bill being much larger than the estimate, because nobody saw the stairs or the amount of stuff.",
          ask: "Will you do a walkthrough, in person or on video, before confirming the estimate?",
        },
        {
          title: "What the crew will not take",
          body: "Movers will not carry flammables, gas bottles, some chemicals and often paint, and many decline plants and anything perishable. Discovering the list on the day leaves you with a car full of things and no plan.",
          ask: "What will you not take, so I can deal with it beforehand?",
        },
      ],
    },

    "long-distance": {
      involves: {
        heading: "Priced by weight and distance, and the truck may not be yours alone",
        paragraphs: [
          "Long distance moves are usually priced on the weight of the shipment and the distance, rather than hourly. Many are consolidated, meaning your goods share a trailer with other shipments, which is why delivery is quoted as a window of days rather than a date.",
          "The alternatives are a dedicated truck, which costs considerably more and delivers on a date, and container services where you load a box that is then transported.",
        ],
        footnote:
          "Ask for the delivery spread in writing, and plan for the far end of it. People book a flight to arrive for the early end of the window and then pay for a hotel and an air bed for a week.",
      },
      claim: {
        eyebrow: "Binding estimates",
        heading: "The word binding is the one that matters on the paperwork",
        lead: "Long distance estimates come in kinds, and the difference decides whether the number you were given is the number you pay.",
        notes: [
          "A non-binding estimate can rise if the shipment weighs more than predicted. A binding estimate is fixed for the inventory listed. A binding not-to-exceed estimate can fall if it weighs less but cannot rise, which is the best of the three for a customer.",
          "Whichever it is will be written on the document. It is worth reading that word before signing, and worth asking for the third kind.",
        ],
      },
      pitfalls: [
        {
          title: "A large deposit up front",
          body: "Reputable long-distance movers ask for a modest deposit or none at all, and take payment at delivery. A demand for a large cash deposit before anything moves is the most reliable signal in the whole trade that something is wrong.",
          ask: "What deposit is required, and when is the balance due?",
        },
        {
          title: "Goods held against a higher price",
          body: "The serious version of a rogue move is a shipment that arrives with a demand for far more than was agreed before it will be unloaded. Checking the mover's registration and complaint history with the relevant transport authority before booking is the defence, and it takes minutes.",
          ask: "What is your registration number, so I can check it with the authority?",
        },
      ],
    },

    storage: {
      involves: {
        heading: "Who holds it, in what, and how you get at it",
        paragraphs: [
          "Storage during a move takes two shapes. Self storage is a unit you rent and access yourself. Storage in transit is held by the mover, usually in wooden vaults in a warehouse, and you generally cannot walk in and get things.",
          "The second is cheaper for a few months and less flexible. Which is right depends entirely on whether you will need anything out of it.",
        ],
        footnote:
          "Climate control is worth paying for with anything wooden, upholstered, electronic or paper, particularly over a summer or a winter. Ordinary units follow the outside temperature and humidity closely.",
      },
      claim: {
        eyebrow: "Insurance",
        heading: "Your home policy may not cover goods in a storage unit",
        lead: "People assume contents insurance follows their possessions. Often it follows the address, with limited or no cover for goods stored elsewhere.",
        notes: [
          "Storage facilities usually require you to have insurance and offer their own, which is frequently more expensive per pound of cover than adding it to an existing policy.",
          "It takes one call to your insurer to find out which applies, and it is the difference between a covered loss and an uncovered one if the building floods.",
        ],
      },
      pitfalls: [
        {
          title: "Handling charges at both ends",
          body: "Storage in transit is priced as monthly storage plus a handling charge in and out. The monthly figure is what gets quoted and the handling is what makes a short stay expensive. Ask for the total for the period you actually need.",
          ask: "What are the handling charges in and out, on top of the monthly rate?",
        },
        {
          title: "Access that is not what you assumed",
          body: "Access hours, whether you can drive to the unit, whether trolleys and lifts are available, and how far the unit is from the door all decide what using the storage is like. A cheap unit at the far end of a building with no lift is a different product.",
          ask: "What are the access hours, and how far is the unit from where I can park?",
        },
      ],
    },

    packing: {
      involves: {
        heading: "Full pack, part pack, or just the fragile things",
        paragraphs: [
          "Movers will pack everything, pack the difficult rooms only, or supply materials and leave it to you. Kitchens and books are where professional packing earns its cost, because they are slow, heavy and the easiest to do badly.",
          "Packing is charged for labour and materials, and materials on a full pack are a larger line than most people expect.",
        ],
        footnote:
          "Label by room at the destination, not by room at the origin, and mark which way is up on anything fragile. It costs nothing and saves the whole crew asking you where things go.",
      },
      claim: {
        eyebrow: "Liability",
        heading: "Who packed the box decides who is liable for what is in it",
        lead: "This is the practical reason to have the mover pack anything valuable, and it surprises people after a breakage.",
        notes: [
          "Most movers will not accept liability for damage to the contents of a carton the customer packed, unless the carton itself is visibly damaged in transit.",
          "So a self-packed box of glassware that arrives broken is generally your loss. If something matters, having their crew pack it moves the responsibility along with the work.",
        ],
      },
      pitfalls: [
        {
          title: "Materials charged by what is used",
          body: "Packing materials are usually billed by the carton and roll actually consumed, so the quote is an estimate rather than a price. It is worth asking for a cap, or for the materials estimate to be broken out, before agreeing.",
          ask: "Are materials estimated or capped, and what is the rate per carton?",
        },
        {
          title: "The things they are not allowed to pack",
          body: "Valuables of extraordinary worth, documents, jewellery, medication and keys should travel with you rather than in the load, and many movers formally exclude them. Assuming they will be handled is how important things end up in a warehouse for a fortnight.",
          ask: "What should I keep with me rather than put in the load?",
        },
      ],
    },
  },

  /* ------------------------------------------------------------- cleaning */
  cleaning: {
    "deep-cleaning": {
      involves: {
        heading: "What separates a deep clean from a thorough regular one",
        paragraphs: [
          "A deep clean covers what a routine visit does not have time for: inside the oven and the refrigerator, behind and under appliances, skirting boards and door frames, light fittings, window tracks, limescale on tiles and screens, and the tops of things nobody looks at.",
          "It takes considerably longer than a standard clean, which is why it is priced separately and why a firm quoting the same hours for both is quoting a standard clean.",
        ],
        footnote:
          "It is normally the first visit with a new cleaner, or a one-off before a party or after building work. After that, regular visits maintain it at a much lower cost.",
      },
      claim: {
        eyebrow: "The checklist",
        heading: "Ask for the task list, because the words mean different things",
        lead: "Deep clean, spring clean and top to bottom are marketing terms rather than defined services, and two firms using the same phrase can be offering substantially different work.",
        notes: [
          "A written list of what is included, room by room, makes quotes comparable and settles arguments afterwards. Ovens, interior windows, inside kitchen cupboards and blinds are the four most common exclusions.",
          "It is also the fairest thing for the cleaner. Most disputes in this trade come from an expectation nobody wrote down.",
        ],
      },
      pitfalls: [
        {
          title: "Priced by the hour, scoped by the room",
          body: "A deep clean quoted hourly with a fixed number of hours will stop when the hours do, whatever is left. Either agree the scope and let the hours follow, or accept that the quoted time is the real limit and decide what matters most.",
          ask: "Is this priced for the job or for a number of hours, and what happens if it takes longer?",
        },
        {
          title: "Products and equipment assumed",
          body: "Some firms bring everything, some expect you to supply products, and some will use yours on request. It matters for anyone with allergies, pets, stone worktops or anything else that reacts badly to a general purpose cleaner.",
          ask: "Do you bring your own products, and can you use mine if I need specific ones?",
        },
      ],
    },

    "move-out": {
      involves: {
        heading: "Cleaning to a standard somebody else will inspect",
        paragraphs: [
          "An end of tenancy clean is judged rather than admired. It covers everything a deep clean does, with particular attention to the places inventories always check: the oven, the extractor filter, inside cupboards and drawers, the fridge freezer defrosted and cleaned, limescale, window interiors, and skirting.",
          "The distinguishing feature is that the work is aimed at a checklist held by somebody who has an interest in finding fault.",
        ],
        footnote:
          "Book it for after the furniture has gone and before the final inspection, with a day between. Cleaning around a half-packed flat produces exactly the result the inventory clerk will photograph.",
      },
      claim: {
        eyebrow: "The deposit",
        heading: "A guarantee is only worth the window it gives you",
        lead: "Many end of tenancy cleans come with a re-clean guarantee if the landlord or agent objects, and the value is entirely in the terms.",
        notes: [
          "Ask how long the guarantee lasts, usually between two and seven days, whether it needs the agent's report, and whether the re-clean covers the whole property or only the items raised.",
          "Keep your own dated photographs of every room after the clean. They are the evidence if a deposit deduction is proposed weeks later, and they cost nothing to take.",
        ],
      },
      pitfalls: [
        {
          title: "Carpets quoted separately",
          body: "Many tenancy agreements require professional carpet cleaning with a receipt, and that is a different machine and often a different company. It is the single most common thing missing from an end of tenancy quote.",
          ask: "Does this include professional carpet cleaning with a receipt, or is that separate?",
        },
        {
          title: "Pre-existing damage treated as dirt",
          body: "Worn enamel, scratched worktops and stained grout do not come out, and a clean cannot fix them. Photograph them beforehand so the difference between damage and dirt is documented before anybody starts.",
          ask: "What here will not come out, and can we record that before you start?",
        },
      ],
    },

    recurring: {
      involves: {
        heading: "The same rooms every visit, plus a rotation for the rest",
        paragraphs: [
          "A regular clean covers kitchens, bathrooms, floors and surfaces every time, because those are what get dirty on a weekly cycle. Everything else, skirtings, interior windows, inside the oven, behind furniture, is usually on a rotation or not included at all.",
          "Understanding which tasks are every visit and which are periodic is what makes a regular service work. Without that, the rotating tasks silently become never.",
        ],
        footnote:
          "Weekly, fortnightly and monthly are genuinely different services rather than the same one at different frequencies. A monthly visit to a busy house is closer to a small deep clean each time, and should be priced and scoped that way.",
      },
      claim: {
        eyebrow: "Employment",
        heading: "Agency or self-employed changes who carries the risk",
        lead: "A cleaner booked through an agency and a cleaner working for themselves are different arrangements, and the difference shows up when something goes wrong.",
        notes: [
          "An agency should carry liability insurance, cover holidays and sickness with a replacement, and handle vetting. That is what the higher rate pays for.",
          "Engaging somebody directly usually costs less and puts those things on you, including checking they have their own insurance, and in some places obligations as an employer. Both are perfectly reasonable; they are just not the same deal.",
        ],
      },
      pitfalls: [
        {
          title: "A different person each visit",
          body: "Continuity is most of what makes a regular clean good, because the same person learns the house. Agencies vary enormously on this, and it is worth asking directly rather than discovering that it is whoever is free that week.",
          ask: "Will it be the same cleaner each visit, and who comes when they are away?",
        },
        {
          title: "Keys and access arrangements",
          body: "Most regular cleans happen when nobody is home, which means keys or codes held by somebody else. How they are stored, who has access, and what happens when the arrangement ends are worth settling at the start rather than at the end.",
          ask: "How are keys held and logged, and how are they returned if we stop?",
        },
      ],
    },
  },

  /* -------------------------------------------------- general contractors */
  "general-contractors": {
    "design-build": {
      involves: {
        heading: "One contract for the drawings and the building",
        paragraphs: [
          "In design and build, a single firm takes the project from sketch to completion. The designer and the builder are the same company, so what gets drawn is what the firm knows how to build and what it costs is known as the design develops.",
          "The alternative is design-bid-build, where an independent architect or designer produces drawings that several contractors price. It takes longer, costs more in fees, and gives you comparable bids.",
        ],
        footnote:
          "The strongest argument for design and build is buildability and speed. The strongest argument against it is that nobody independent is checking the price or the specification on your behalf.",
      },
      claim: {
        eyebrow: "Getting the benefit",
        heading: "Without competing bids, the contract has to do the work",
        lead: "A design and build price is not tested against anything, so the protections you would get from competition have to come from the agreement instead.",
        notes: [
          "Open-book pricing, where you see the subcontractor quotes and the contractor's mark-up is a stated percentage, is the usual way to restore some of that visibility.",
          "The other lever is an independent quantity surveyor or owner's representative to review the price and the specification. On a project of any size that fee is small against what it tends to find.",
        ],
      },
      pitfalls: [
        {
          title: "Specification thinning as the design develops",
          body: "The risk in a single contract is that the price stays the same while the specification quietly gets cheaper, because the same firm controls both. A specification schedule fixed at the point of agreement, with changes requiring your sign-off, is what prevents it.",
          ask: "Is the specification schedule fixed, and how are substitutions approved?",
        },
        {
          title: "Who owns the drawings",
          body: "If the relationship ends, whether you can take the design to another builder depends on what the contract says about intellectual property. Firms differ, and it is much easier to establish at the start than during a dispute.",
          ask: "If we part company, can I use these drawings with another contractor?",
        },
      ],
    },

    "whole-home-renovation": {
      involves: {
        heading: "Sequencing, living arrangements, and the order things have to happen in",
        paragraphs: [
          "A whole house renovation is a sequence: strip out, structural work, then the first fix of plumbing and electrical, insulation and boarding, then plastering, then second fix, then decoration and floors. Each stage depends on the one before, so a delay anywhere moves everything after it.",
          "The question that shapes everything else is whether you live in it. Staying costs less and slows the work considerably; moving out costs more and lets trades work properly.",
        ],
        footnote:
          "Ask for the programme with the trade sequence on it and the dependencies visible. It is the single most useful document in a project of this size, and a contractor who does not have one is managing it in their head.",
      },
      claim: {
        eyebrow: "Payments",
        heading: "Payments should follow completed work, not the calendar",
        lead: "The schedule of payments is the main protection a homeowner has, and it works only if each payment is tied to something finished and verifiable.",
        notes: [
          "Large payments in advance of work remove your leverage exactly when you may need it. A reasonable deposit covers materials ordered, not months of labour not yet done.",
          "A retention, a small percentage held back until the snagging list is cleared some weeks after completion, is normal in commercial work and equally sensible here. It is the only thing that reliably gets the last ten items done.",
        ],
      },
      pitfalls: [
        {
          title: "Provisional sums treated as prices",
          body: "Provisional sums are placeholders for work not yet defined, and they are not prices. A contract with many of them is a contract whose total is provisional too. Convert as many as possible into fixed prices before signing.",
          ask: "Which items are provisional sums, and when do they become fixed prices?",
        },
        {
          title: "No named site contact",
          body: "On a job with many trades, there has to be one person responsible for coordination who answers to you. Without that, you become the project manager by default, and questions arrive from five trades at once.",
          ask: "Who is the single point of contact, and how often will we meet on site?",
        },
      ],
    },

    permitting: {
      involves: {
        heading: "Establishing what is needed, then getting it approved and signed off",
        paragraphs: [
          "Permit work is the paperwork side of construction: identifying which approvals a project needs, preparing the application and drawings, submitting it, answering the authority's queries, and arranging the inspections as work proceeds.",
          "It ends with sign-off. A permit that is opened and never closed out is arguably worse than no permit, because it is a documented, unfinished obligation attached to the property.",
        ],
        footnote:
          "Zoning approval and building permits are different things and are often granted by different departments on different timescales. A project can satisfy one and be refused by the other.",
      },
      claim: {
        eyebrow: "Unpermitted work",
        heading: "It surfaces at sale, and it surfaces at claim time",
        lead: "Skipping a permit saves a fee and weeks of waiting, and defers a problem rather than removing it.",
        notes: [
          "At sale, unpermitted work can stop a mortgage valuation, and buyers' solicitors ask about it directly. Retrospective approval is possible and sometimes means opening finished work for inspection.",
          "At claim time, an insurer can decline where unpermitted work contributed to the loss. That is the version of this that actually costs real money.",
        ],
      },
      pitfalls: [
        {
          title: "Whose name is on the permit",
          body: "A permit pulled in the homeowner's name rather than the contractor's puts responsibility for code compliance on you, not them. Some contractors prefer it for exactly that reason. It is a meaningful difference and it is a line on a form.",
          ask: "Whose name goes on the permit, and why that one?",
        },
        {
          title: "Inspections missed as work covers up",
          body: "Inspections happen at defined stages, and several must occur before the work is covered. A missed inspection can mean opening up finished work. The schedule is known in advance and it is a coordination failure when it slips.",
          ask: "What inspections are required, at what stages, and who books them?",
        },
      ],
    },
  },

  /* -------------------------------------------------------------- gutters */
  gutters: {
    cleaning: {
      involves: {
        heading: "Clearing the gutters, and checking the part that carries the water away",
        paragraphs: [
          "The job is removing debris from the gutter runs and, more importantly, clearing the downpipes, then flushing through to confirm the water actually leaves. A gutter that is clean but discharges into a blocked drain has not been fixed.",
          "A proper visit also looks at the brackets, the joints and the fall, because those are what a season of standing water tends to have loosened.",
        ],
        footnote:
          "Twice a year is the usual advice, and if there are trees close by, the visit that matters is the one after the leaves have finished falling rather than partway through.",
      },
      claim: {
        eyebrow: "Why it matters",
        heading: "Gutters are a foundation problem more than a roof one",
        lead: "Overflowing gutters are treated as a nuisance. What they are actually doing is delivering the entire roof's rainfall to the base of the wall.",
        notes: [
          "Repeatedly saturating the ground next to the foundation is a leading cause of basement water and of movement in the soil that supports the footings.",
          "That is why the downpipe discharge matters as much as the gutter. Water taken off the roof neatly and dropped a foot from the wall has not gone anywhere useful.",
        ],
      },
      pitfalls: [
        {
          title: "Debris left on the roof or in the beds",
          body: "Clearing gutters produces a surprising volume of wet, staining debris. Whether it is bagged and taken away or flicked onto the roof and the borders is worth agreeing, because the second version is a job you finish yourself.",
          ask: "Is the debris bagged and removed, and is that in the price?",
        },
        {
          title: "Working at height without insurance",
          body: "This is ladder work on a roofline, and it is one of the more common sources of serious injury in home services. A firm without liability insurance leaves that exposure with you as the property owner.",
          ask: "Can I see your liability insurance, confirmed by the insurer?",
        },
      ],
    },

    guards: {
      involves: {
        heading: "What guards actually do, which is reduce the frequency",
        paragraphs: [
          "Gutter guards come as mesh, micro-mesh, surface tension covers, foam and brush inserts. Micro-mesh is the most effective at keeping fine debris out and the most expensive; foam and brush are cheap and tend to collect the debris rather than exclude it.",
          "None of them makes a gutter maintenance-free. What a good system does is turn a twice-yearly clean into a periodic inspection.",
        ],
        footnote:
          "Fitting guards to gutters that sag, leak at the joints or fall the wrong way makes those problems harder to see and harder to reach. The guttering should be right before anything covers it.",
      },
      claim: {
        eyebrow: "The claim to check",
        heading: "Lifetime no-clogging guarantees are worth reading closely",
        lead: "This product category is sold hard, often at the door, with long guarantees that are frequently narrower than they sound.",
        notes: [
          "Common conditions include the guarantee being on the product rather than the performance, being void if anybody else touches the gutters, requiring paid annual inspections, or not transferring when you sell.",
          "Get the terms in writing before agreeing, and be wary of a price that falls sharply if you sign today. That is a sales technique rather than a discount.",
        ],
      },
      pitfalls: [
        {
          title: "Guards fixed under the roof covering",
          body: "Some systems are fitted by lifting the bottom course of shingles or tiles and sliding the guard underneath. That can disturb the roof edge and, on some roofs, affect the roofing warranty. Worth checking against your roof rather than in general.",
          ask: "How does this fix to the roof, and does it affect the roof warranty?",
        },
        {
          title: "Ice and overflow in cold climates",
          body: "In climates with freeze and thaw, some guard designs make ice dams worse or cause water to run over the front of the gutter in heavy rain. Ask specifically how the system behaves in freezing conditions and in a downpour, not just with leaves.",
          ask: "How does this perform in freezing weather and in very heavy rain?",
        },
      ],
    },
  },

  /* ------------------------------------------------------------- painting */
  painting: {
    interior: {
      involves: {
        heading: "Preparation is most of the labour and all of the result",
        paragraphs: [
          "Interior painting is filling, sanding, caulking, masking and priming, and then the part everybody pictures. On a normal room the preparation is the majority of the hours, and it is the entire difference between a decent finish and a poor one.",
          "It is also where quotes differ. Two prices for the same rooms usually describe different amounts of preparation rather than different paint.",
        ],
        footnote:
          "Number of coats is worth agreeing explicitly. Two coats over a matched primer is normal; one coat over a colour change will look thin in the corners and against the light, whatever the tin claims.",
      },
      claim: {
        eyebrow: "Comparing quotes",
        heading: "Ask what the preparation includes, in words",
        lead: "Every painter says they prepare properly. The quotes that mean it describe what that involves, and the ones that do not are the cheap ones.",
        notes: [
          "The specifics worth seeing named: filling and sanding, caulking gaps at trim, spot priming bare or repaired areas, degreasing kitchens and bathrooms, and how many coats of what.",
          "Paint product and sheen should be named too. Trade and retail lines from the same brand differ in coverage and durability, and substituting down is invisible until the walls start marking.",
        ],
      },
      pitfalls: [
        {
          title: "Paint supplied by the painter, unspecified",
          body: "A quote that includes materials without naming the product leaves the choice with whoever is trying to hit a price. Name the range and the finish in the quote so the comparison is real.",
          ask: "Which paint, which range and what sheen, and how many coats?",
        },
        {
          title: "Protection and making good",
          body: "Floors, furniture and fittings need covering, and paint gets removed from glass, hardware and switches at the end. How thoroughly is a real variable between firms and the main reason one job feels professional and another does not.",
          ask: "How is the room protected, and what cleaning up is included at the end?",
        },
      ],
    },

    exterior: {
      involves: {
        heading: "Substrate, weather window and the repairs that come first",
        paragraphs: [
          "Exterior work starts with washing, scraping back anything failing, treating bare timber or rusted metal, filling and caulking, and priming. Rotten timber has to be repaired or replaced before anything goes over it, and that is frequently discovered once the old paint comes off.",
          "The weather sets the schedule. Paint applied too cold, too hot, in damp conditions or on a surface in direct sun will not form the film it is meant to, whatever the day looks like.",
        ],
        footnote:
          "Check what the paint's own data sheet says about temperature and humidity, including overnight. The overnight minimum is the one that catches people out in spring and autumn.",
      },
      claim: {
        eyebrow: "Lead",
        heading: "On a house painted before the late 1970s, assume lead",
        lead: "Sanding or scraping old exterior paint on an older house releases lead dust into the soil and the air around the property, and the rules on it are not advisory.",
        notes: [
          "Where lead-safe rules apply, the contractor needs specific certification and has to follow containment, cleaning and disposal procedures. It affects the price and the method.",
          "A painter who has not mentioned it on a house of that age either does not know or is planning not to comply, and both are reasons to ask directly before work starts.",
        ],
      },
      pitfalls: [
        {
          title: "Rot found after the price is agreed",
          body: "Nobody can see behind sound-looking paint. Repairs to timber, trim and sills are the standard exterior variation, so the sensible thing is a rate agreed in advance rather than a negotiation once the scaffold is up.",
          ask: "What is the rate for timber repairs, and how much is allowed for in the price?",
        },
        {
          title: "Painting over the problem",
          body: "Coating over failing paint, damp render or unaddressed rot hides it for a season. The new film lifts wherever the old one was letting go, and the guarantee will exclude exactly that.",
          ask: "What is being stripped back to bare, and what is being painted over?",
        },
      ],
    },

    "cabinet-refinishing": {
      involves: {
        heading: "Degreasing, sanding, priming and a finish that can take a fingernail",
        paragraphs: [
          "Refinishing kitchen cabinets is a preparation job with a coat of paint at the end. Kitchen doors carry years of cooking grease, and anything applied over it will peel, so degreasing comes before sanding and both come before a bonding primer.",
          "The finish itself should be a cabinet-grade coating applied by spray where possible. Wall paint on a cabinet door will mark the first time a fingernail catches it.",
        ],
        footnote:
          "Doors and drawer fronts are usually taken away to be sprayed and the frames done in place. That means a kitchen without doors for several days, which is worth knowing when you plan the week.",
      },
      claim: {
        eyebrow: "Against replacing",
        heading: "It works when the boxes are sound and the layout is right",
        lead: "Refinishing costs a fraction of new cabinets and is the right answer more often than people assume, but only for a specific situation.",
        notes: [
          "The test is the carcass. Solid boxes with doors you are tired of are ideal. Swollen particle board, failing hinges and a layout that does not work are not fixed by paint.",
          "Replacing doors and drawer fronts while keeping the boxes sits between the two and is worth pricing alongside, particularly where the existing doors are damaged rather than dated.",
        ],
      },
      pitfalls: [
        {
          title: "Cure time treated as dry time",
          body: "Cabinet coatings are touch dry in hours and fully hard in days or weeks. Loading shelves and closing doors against each other during that window is how a good finish gets marked permanently, and the instruction often gets lost at handover.",
          ask: "How long before I can put everything back and use the doors normally?",
        },
        {
          title: "Brushed where it should be sprayed",
          body: "Brush marks on a flat cabinet door are visible from across the room in side light. Spraying costs more in masking and setup and is what produces the finish people have in mind when they ask for this.",
          ask: "Is this being sprayed or brushed, and can I see an example?",
        },
      ],
    },
  },

  /* --------------------------------------------------------- pest control */
  "pest-control": {
    termites: {
      involves: {
        heading: "Inspection, identification, then a treatment matched to the species",
        paragraphs: [
          "Termite work begins with an inspection that establishes whether there is an active infestation, what species, and how far it has gone. Subterranean termites reach the building from the soil and are treated with a soil barrier or a baiting system; drywood termites live in the timber itself and need local or whole-structure treatment.",
          "Getting the identification right matters because the treatments are not interchangeable.",
        ],
        footnote:
          "Damage and treatment are separate jobs. A treatment stops the colony; it does not repair weakened timber, and structural repairs are a builder's work priced separately.",
      },
      claim: {
        eyebrow: "The warranty",
        heading: "A termite warranty is either repair or retreatment, and they differ enormously",
        lead: "Almost every termite contract comes with a warranty, and the single most important thing about it is whether it covers damage.",
        notes: [
          "A retreatment warranty means they come back and treat again if termites return. A repair warranty means they also pay to fix the damage. The second is worth substantially more and costs more.",
          "Both usually require annual inspections to stay valid, and both have exclusions for conditions, like earth-to-wood contact or moisture, that you may be expected to correct.",
        ],
      },
      pitfalls: [
        {
          title: "Treating without finding the entry",
          body: "Subterranean termites need a route from the soil, and the conditions that let them in, timber in contact with the ground, mulch against the wall, a leak keeping the frame damp, will bring them back after any treatment. The inspection should name those conditions.",
          ask: "What conditions are letting them in, and what do I need to change?",
        },
        {
          title: "Annual renewals that lapse quietly",
          body: "The warranty depends on an annual inspection that you pay for, and a missed year can void cover built up over a decade. It is worth knowing the renewal date and what happens if a year is skipped.",
          ask: "What does the annual renewal cost, and what happens to the warranty if I miss one?",
        },
      ],
    },

    rodents: {
      involves: {
        heading: "Trapping deals with the ones inside, exclusion stops the next ones",
        paragraphs: [
          "Rodent work has two halves and only one of them is visible. Trapping and removal clears the current population. Exclusion, sealing every gap they can use, is what stops it recurring, and it is the half that is often skipped.",
          "Mice need a gap around the width of a pencil, rats a little more. That means vents, pipe and cable entries, gaps under doors, roofline junctions and the space where the services enter the building.",
        ],
        footnote:
          "Removing the food source matters as much as the traps: pet food, bird feeders, compost and bins are the usual reasons a property keeps attracting them.",
      },
      claim: {
        eyebrow: "Poison",
        heading: "Bait outside is one thing, bait in the roof is another",
        lead: "Rodenticide has a place in a controlled programme, and using it inside a building creates a problem the traps do not.",
        notes: [
          "An animal that dies inside a wall or a roof void cannot be removed, and the smell lasts weeks. Trapping puts the outcome somewhere you can find it.",
          "There is also secondary poisoning of pets, owls and foxes that eat a poisoned rodent, which is why several rodenticides are now restricted to professional use and to tamper-resistant stations.",
        ],
      },
      pitfalls: [
        {
          title: "A treatment with no exclusion",
          body: "A contract that is only visits and bait stations is a subscription to the symptom. Ask what proofing work is included and, if none, treat that as a separate and necessary job rather than an optional extra.",
          ask: "What exclusion and proofing work is included, and where are the entry points?",
        },
        {
          title: "Contaminated insulation left in place",
          body: "A long-standing infestation in a roof space leaves droppings and urine through the insulation, which is both a health matter and a smell that persists. Removal and replacement is real work and it is usually a separate quote.",
          ask: "Does the insulation need replacing, and is that included or separate?",
        },
      ],
    },

    mosquitoes: {
      involves: {
        heading: "Standing water first, treatment second",
        paragraphs: [
          "Mosquito control is mostly water management. They breed in still water and need very little of it: a saucer under a plant pot, a blocked gutter, a tarpaulin fold, a bird bath, a tyre. Removing those sources does more than anything sprayed.",
          "Beyond that, treatments fall into larvicides applied to water that cannot be drained, and barrier sprays applied to the vegetation where adults rest during the day.",
        ],
        footnote:
          "Barrier treatments last a few weeks and are washed off by heavy rain, which is why they are sold as a season-long programme of repeat visits rather than as a single application.",
      },
      claim: {
        eyebrow: "What spraying costs",
        heading: "Barrier sprays are not selective about which insects they kill",
        lead: "The products used on vegetation are broad-spectrum insecticides, and they affect the pollinators and predatory insects in the garden along with the mosquitoes.",
        notes: [
          "If that matters to you, it is worth asking about targeted larviciding, which treats the water rather than the plants, and about not spraying flowering plants.",
          "The other honest limit is that adult mosquitoes fly in from elsewhere. Treating your garden does not treat the neighbourhood, and a property next to standing water somebody else owns will keep being reinfested.",
        ],
      },
      pitfalls: [
        {
          title: "A programme sold before a site survey",
          body: "A contract of monthly sprays agreed over the phone skips the part that would actually reduce the problem, which is somebody walking the garden and finding the water. Insist the first visit is a survey.",
          ask: "Will the first visit identify breeding sites, and will I get the list?",
        },
        {
          title: "Re-entry times and pets",
          body: "Treated areas have a re-entry interval before children and pets should be back on them, and it varies by product. Ponds with fish and beehives need specific precautions. None of this is complicated and all of it needs saying before the sprayer starts.",
          ask: "What is the re-entry time, and what do I need to do about pets, ponds and vegetables?",
        },
      ],
    },
  },

  /* ---------------------------------------------------------- restoration */
  restoration: {
    "water-damage": {
      involves: {
        heading: "Stop it, extract it, dry it, and prove it is dry",
        paragraphs: [
          "Water damage work runs in a fixed order: stop the source, extract standing water, remove materials that cannot be saved, then dry the structure with air movers and dehumidifiers until moisture readings return to normal.",
          "The drying is the part that takes days and the part people want to shorten. Structural drying is measured rather than judged, and the readings are what say when it is finished.",
        ],
        footnote:
          "Water is categorised by how contaminated it is, from clean supply water through to sewage, and the category decides what can be dried and kept and what has to be removed. It escalates with time, so clean water left for days stops being clean water.",
      },
      claim: {
        eyebrow: "Insurance",
        heading: "Document before anybody starts, because the claim is built on it",
        lead: "Mitigation has to happen fast, and the documentation has to happen faster, because once the wet carpet is in a skip it cannot be photographed.",
        notes: [
          "Photograph and video everything before removal, keep a list of what was taken out, and keep the daily moisture logs the restoration firm produces. Those logs are what justify the number of days of equipment on the invoice.",
          "Your policy also requires you to mitigate promptly. Waiting for an adjuster before stopping the damage can itself reduce what is paid.",
        ],
      },
      pitfalls: [
        {
          title: "Equipment billed by the day without readings",
          body: "Air movers and dehumidifiers are charged per unit per day, and it is the largest line on most water damage invoices. Without daily moisture readings there is nothing showing how many days were necessary, which is exactly what an adjuster will query.",
          ask: "Will I get daily moisture readings for every affected area?",
        },
        {
          title: "Drying around what should come out",
          body: "Wet insulation inside a wall and saturated chipboard do not dry usefully in place. Drying the surfaces while leaving them produces a room that reads dry and smells wrong two months later.",
          ask: "What is being removed rather than dried, and how was that decided?",
        },
      ],
    },

    "fire-smoke": {
      involves: {
        heading: "Soot, odour and the water the fire brigade used",
        paragraphs: [
          "Fire restoration deals with three separate problems. Soot, which is corrosive and moves through the building well beyond the burnt area. Odour, which penetrates porous materials. And water damage from firefighting, which is frequently the larger part of the loss.",
          "The order matters: securing and drying come first, because moisture plus soot accelerates corrosion on everything metal in the building.",
        ],
        footnote:
          "Different fuels leave different residues. A protein fire from a kitchen leaves an almost invisible film with a powerful smell; a plastics fire leaves acidic smoke that attacks wiring and fittings. They need different cleaning methods.",
      },
      claim: {
        eyebrow: "Odour",
        heading: "Sealing and masking are not the same as removing",
        lead: "Smoke odour is the hardest part of fire restoration to finish properly, and it is the part where shortcuts are least visible on handover.",
        notes: [
          "Thorough cleaning of every affected surface, replacing what cannot be cleaned, and then sealing porous substrates is the process. Fogging or ozone treatment alone masks the smell for a period and it returns in warm, humid weather.",
          "If a firm's odour plan is a machine rather than a cleaning schedule, ask what happens in the first warm month, and get the guarantee in writing.",
        ],
      },
      pitfalls: [
        {
          title: "Contents cleaning scoped vaguely",
          body: "Cleaning and storing contents, pack-out, is a large part of a fire claim and it is often handled loosely. Insist on an itemised inventory with condition recorded before anything leaves the property.",
          ask: "Is there an itemised inventory with photographs before anything is packed out?",
        },
        {
          title: "Electrical and HVAC not assessed",
          body: "Soot in the ductwork redistributes smoke through the building every time the system runs, and corrosive residues on wiring and connections cause faults months later. Both need specific assessment rather than being assumed fine.",
          ask: "Have the ducts and the electrical system been assessed for soot and corrosion?",
        },
      ],
    },

    mold: {
      involves: {
        heading: "Find the water, fix the water, then remove the growth",
        paragraphs: [
          "Mould is a symptom. It grows where there is moisture, and removing it without correcting the moisture source guarantees it returns, usually in the same place.",
          "Remediation itself is containment of the working area, negative air pressure so spores do not spread, removal of porous materials that cannot be cleaned, cleaning what can be, and drying. Painting over it is not remediation.",
        ],
        footnote:
          "Small areas of surface mould on hard, non-porous surfaces from an obvious cause, a bathroom without ventilation, are often a homeowner job. Large areas, anything inside a wall, and anything where the cause is unclear are not.",
      },
      claim: {
        eyebrow: "Testing",
        heading: "The firm that tests should not be the firm that remediates",
        lead: "If the same company decides how much mould there is and then quotes for removing it, the incentive is obvious and the conflict is real.",
        notes: [
          "Use an independent assessor for testing and a separate contractor for the work, and use the assessor again afterwards for clearance testing. That final test is what tells you the job worked.",
          "Be sceptical of free mould inspections from remediation companies, and of dramatic claims about health effects made by somebody quoting for the remedy.",
        ],
      },
      pitfalls: [
        {
          title: "No containment",
          body: "Cutting out mouldy material without sealing the area and running negative air spreads spores through the rest of the house, which turns one affected room into several. The containment is not optional and it is visible when it is being done properly.",
          ask: "What containment and negative air are you using, and how is the waste bagged?",
        },
        {
          title: "No clearance test at the end",
          body: "Without post-remediation verification, there is nothing but the contractor's word that the work succeeded. An independent clearance test is a modest cost and it is the only objective end point the job has.",
          ask: "Is there an independent clearance test at the end, and who pays for it?",
        },
      ],
    },
  },

  /* -------------------------------------------------------- windows doors */
  "windows-doors": {
    "window-replacement": {
      involves: {
        heading: "Full frame or insert, and what the glass is doing",
        paragraphs: [
          "A replacement either takes out the whole frame back to the opening, or fits a new unit inside the existing frame. Full frame replacement lets the opening be inspected, insulated and flashed properly, and costs more. Inserts are quicker, cheaper, and keep whatever is behind the old frame, including any rot.",
          "The glass itself is specified by the number of panes, the low-emissivity coating and the gas fill, and the right specification depends on the climate and which way the window faces.",
        ],
        options: [
          {
            name: "Full frame",
            note: "Out to the structural opening",
            rows: [
              { label: "Opening inspected", value: "Yes", tone: "for" },
              { label: "New flashing", value: "Yes", tone: "for" },
              { label: "Keeps glass area", value: "Yes", tone: "for" },
              { label: "Cost and disruption", value: "Higher", tone: "mixed" },
            ],
          },
          {
            name: "Insert",
            note: "New unit inside the old frame",
            rows: [
              { label: "Opening inspected", value: "No", tone: "against" },
              { label: "New flashing", value: "No", tone: "against" },
              { label: "Keeps glass area", value: "Slightly less", tone: "mixed" },
              { label: "Cost and disruption", value: "Lower", tone: "for" },
            ],
          },
        ],
        footnote:
          "Inserts lose a little glass area on every window, because the new frame sits inside the old one. On small windows, and across a whole house, that is more noticeable than people expect.",
      },
      claim: {
        eyebrow: "Performance",
        heading: "Installation decides more than the rating does",
        lead: "A high-performance window fitted without proper flashing, insulation and air sealing around it will underperform a modest window fitted well.",
        notes: [
          "Air leakage around the frame is invisible and is the most common defect. So is water getting behind the frame where the flashing was not lapped correctly, which shows as damage below the sill years later.",
          "That is why the specification worth comparing is how the perimeter is sealed and flashed, not only the numbers on the glass.",
        ],
      },
      pitfalls: [
        {
          title: "High-pressure selling",
          body: "Replacement windows is one of the last strongholds of the long in-home sales appointment, the price that halves if you sign today, and the finance agreement presented as part of the deal. A price that is only available during the visit is not a price.",
          ask: "Can I have this quote in writing, valid for two weeks, so I can compare it?",
        },
        {
          title: "Warranty that depends on the installer existing",
          body: "The glass unit, the frame and the installation are typically covered by different warranties for different periods. The installation one is the one you will use, and it is only as good as the company behind it.",
          ask: "What are the three warranty periods, and who honours the installation one?",
        },
      ],
    },

    "entry-doors": {
      involves: {
        heading: "The slab, the frame and the threshold, which usually go together",
        paragraphs: [
          "Replacing an entry door can mean just the slab, or a pre-hung unit with a new frame and threshold. A slab-only swap depends on the existing frame being square and sound, and on the new door matching the hinge and lock positions exactly.",
          "Most exterior replacements are pre-hung, because the frame, the sill and the weatherstripping are usually the reason the old door draughts and sticks.",
        ],
        footnote:
          "Fibreglass and steel doors are more stable than timber in a position that takes weather and sun, and they hold their finish longer. Timber looks better and needs maintaining, particularly on a south or west elevation with no porch.",
      },
      claim: {
        eyebrow: "Security",
        heading: "The lock is the part people buy, and the frame is the part that fails",
        lead: "Spending on the door and the lock while leaving the strike fixed into thin trim is the same mistake as on any other door, and the front door is where it matters most.",
        notes: [
          "A reinforced strike plate with screws long enough to reach the framing behind is a small item on the invoice and moves the failure point from the frame to the lock itself.",
          "Glazing beside or in the door is the other consideration, because a thumb turn reachable through broken glass makes the lock irrelevant. Laminated glass or a different lock arrangement solves it.",
        ],
      },
      pitfalls: [
        {
          title: "The threshold and the sill pan",
          body: "Water getting under an entry door damages the floor and the framing below, and the defence is a properly detailed sill pan and threshold. It is hidden work, it is left out routinely, and it is the most common cause of rot at a front door.",
          ask: "Is a sill pan being installed under the threshold?",
        },
        {
          title: "Finishing left to the owner",
          body: "Many doors arrive primed rather than finished, and the manufacturer's warranty often requires all six edges, including the top and bottom, to be sealed within a period. Doors left primed over a winter are a warranty problem and a swelling problem.",
          ask: "Is the door supplied finished, and if not, what does the warranty require and by when?",
        },
      ],
    },

    "patio-doors": {
      involves: {
        heading: "Sliding or hinged, and what each needs from the opening",
        paragraphs: [
          "Sliding doors run on rollers in a track and take no space to open, which suits a small room or a tight terrace. Hinged doors seal better, because a compression seal beats a sliding one, and they need clearance to swing.",
          "Both are large glass areas in a structural opening, which means the header above has to be right and the sill below has to shed water.",
        ],
        options: [
          {
            name: "Sliding",
            note: "Runs on a track",
            rows: [
              { label: "Space to operate", value: "None", tone: "for" },
              { label: "Air sealing", value: "Good", tone: "mixed" },
              { label: "Maintenance", value: "Rollers", tone: "mixed" },
              { label: "Full opening width", value: "Half", tone: "against" },
            ],
          },
          {
            name: "Hinged",
            note: "Swings on hinges",
            rows: [
              { label: "Space to operate", value: "Clearance", tone: "against" },
              { label: "Air sealing", value: "Better", tone: "for" },
              { label: "Maintenance", value: "Seals", tone: "for" },
              { label: "Full opening width", value: "All of it", tone: "for" },
            ],
          },
        ],
        footnote:
          "Sliding doors need their tracks kept clean and their rollers adjusted, and a door that has become hard to slide is usually rollers rather than the door. It is a cheap service that people leave until something breaks.",
      },
      claim: {
        eyebrow: "Glass",
        heading: "Safety glazing is required, and the coating is worth choosing",
        lead: "Any large glazed door is required to use safety glass, and beyond that the coating on it is a decision rather than a default.",
        notes: [
          "Low-emissivity coatings come in variants tuned for keeping heat in or keeping solar gain out, and the right one depends on the climate and which direction the doors face. West-facing glass in a warm climate is the clearest case for the second.",
          "It is also worth asking about the spacer between the panes. Warm-edge spacers reduce condensation at the bottom of the glass, which is where large doors show it first.",
        ],
      },
      pitfalls: [
        {
          title: "The header above the opening",
          body: "Widening an opening or replacing a unit with something larger puts load on a header that may need to change. That is structural work with its own permit and engineering, and it is a very different project from swapping like for like.",
          ask: "Does the structural opening change, and if so who is specifying the header?",
        },
        {
          title: "Drainage at the sill",
          body: "Patio door sills have weep channels that let water that gets into the track drain out. Blocked, badly installed or set below the outside level, they deliver water into the floor instead. It is the main reason these doors leak.",
          ask: "How does the sill drain, and is the outside level low enough for it to work?",
        },
      ],
    },
  },
};
