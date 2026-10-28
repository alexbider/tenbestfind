/**
 * The hiring checklist under each ranking. The generic list suits builders and
 * roofers; a locksmith or a mover is hired differently, and a checklist that
 * talks about permits and insurance deductibles on a lockout page reads as
 * boilerplate. Trades listed here get their own version; every other trade
 * keeps the generic one in the template.
 */

export type HiringGuidance = {
  steps: { title: string; body: string }[];
  questions: string[];
  redFlags: string[];
};

const GUIDANCE: Record<string, HiringGuidance> = {
  locksmiths: {
    steps: [
      { title: "Get a firm price on the phone", body: "Ask for the full cost of the job, call-out included, before anyone drives over. A real shop can quote a lockout or a rekey in one call." },
      { title: "Ask for the business name", body: "Write down the registered name and the address. Many listings are call centres that pass the job to whoever is closest." },
      { title: "Check ID when they arrive", body: "The technician should match the company you called, with a marked vehicle or ID. A reputable locksmith will also ask for proof that you live there." },
      { title: "Ask about the method", body: "Most lockouts can be opened without drilling. If the first move is to drill and replace the lock, ask why before you agree." },
      { title: "Get a written invoice", body: "The invoice should name the company, the parts used and the labour. Keep it in case the new lock fails." },
      { title: "Ask about the warranty", body: "New hardware usually carries a manufacturer warranty, and the work should carry the locksmith's own. Get both lengths in writing." },
    ],
    questions: [
      "What will the total be, including the call-out fee?",
      "What is the name and street address of your business?",
      "Will the technician be an employee of your company?",
      "Can you open this lock without drilling it?",
      "Do you rekey, or only replace?",
      "What brands of lock do you stock?",
      "Is there an extra charge after hours or on weekends?",
      "What warranty comes with the new lock and the work?",
    ],
    redFlags: [
      "A very low quote on the phone that grows once the door is open",
      "No business name, only a generic 'locksmith service' answer",
      "Drilling the lock as the first and only option",
      "An unmarked car and no ID",
      "Cash only, with no invoice",
    ],
  },

  "appliance-repair": {
    steps: [
      { title: "Have the model number ready", body: "It is on a sticker inside the door or on the back. With it, a technician can tell you on the phone whether they service the brand and stock the part." },
      { title: "Ask about the diagnostic fee", body: "Most companies charge one. Ask how much it is and whether it is taken off the repair if you go ahead." },
      { title: "Check the warranty first", body: "If the appliance is still under the manufacturer's warranty, an unauthorized repair can void it. Ask whether the company is an authorized servicer." },
      { title: "Get the repair priced before work starts", body: "Parts and labour should be quoted once the fault is found, not added up at the end." },
      { title: "Compare repair against replacement", body: "On an older machine, a repair that costs more than half of a new one is rarely worth it. A good technician will tell you so." },
      { title: "Ask what the repair warranty covers", body: "Parts and labour are often warrantied separately, for different lengths of time." },
    ],
    questions: [
      "Do you service this brand and model?",
      "What is the diagnostic fee, and is it credited to the repair?",
      "Are you authorized by the manufacturer for warranty work?",
      "Do you carry common parts on the truck, or order them?",
      "How long will a part take to arrive if you have to order it?",
      "What warranty do you give on parts and on labour?",
      "Is the repair worth it on a machine this age?",
      "When is your earliest appointment?",
    ],
    redFlags: [
      "A refusal to say what the diagnostic visit costs",
      "Pressure to replace the appliance before it has been looked at",
      "A repair price that changes after the work is done",
      "No warranty on the repair at all",
      "Payment demanded for a part before it is ordered, with no receipt",
    ],
  },

  "moving-companies": {
    steps: [
      { title: "Get an in-home or video survey", body: "A price given without anyone seeing your belongings is a guess. Ask for a survey, in person or by video, before you compare quotes." },
      { title: "Ask for a binding estimate", body: "A binding or not-to-exceed estimate caps what you pay. A non-binding one can grow on moving day." },
      { title: "Check the registration", body: "Long-distance movers in the US need a USDOT number you can look up. In Canada, check the company's provincial registration and reviews." },
      { title: "Understand the valuation coverage", body: "Basic coverage often pays by weight, not by value. Ask what full-value protection costs and what it excludes." },
      { title: "Read the contract before moving day", body: "Stairs, long carries, packing materials and storage are the usual extra charges. They should be on the page in advance." },
      { title: "Keep a list of what goes on the truck", body: "The inventory is what any damage claim will rest on, so check it before you sign it." },
    ],
    questions: [
      "Is your estimate binding or not to exceed?",
      "What are your registration or USDOT numbers?",
      "Will your own crew do the move, or a subcontractor?",
      "What coverage is included, and what does full-value protection cost?",
      "What would add extra charges on the day?",
      "How much deposit do you take, and when is the rest due?",
      "How are damage claims handled and how long do they take?",
      "Can you give me two recent local references?",
    ],
    redFlags: [
      "A quote given over the phone with no survey",
      "A large cash deposit before the move",
      "No physical address or registration number",
      "A price that rises once your things are on the truck",
      "Blank spaces in a contract you are asked to sign",
    ],
  },

  electricians: {
    steps: [
      { title: "Check the licence", body: "Electrical work needs a licensed contractor in every state and province. Look the licence up with the issuing authority, not on the company's website." },
      { title: "Ask who pulls the permit", body: "Panel upgrades, new circuits and rewires usually need a permit and an inspection. The electrician should handle both." },
      { title: "Get a written quote", body: "It should list the materials, the panel or breaker brand and whether patching walls afterwards is included." },
      { title: "Compare two or three quotes", body: "On the same scope. A much lower number often leaves out the permit or the drywall repair." },
      { title: "Ask about the warranty", body: "Separate the warranty on the work from the manufacturer's warranty on parts, and get both in writing." },
      { title: "Confirm insurance", body: "Ask for a current certificate of insurance and, in Canada, proof of workers compensation coverage." },
    ],
    questions: [
      "What is your licence number, and who issued it?",
      "Will you pull the permit and book the inspection?",
      "Is drywall patching included after the work?",
      "Who will do the work, and are they licensed too?",
      "What warranty do you give on the work?",
      "Do you charge extra for emergency or after-hours calls?",
      "How long will the power be off?",
      "Can you send your certificate of insurance?",
    ],
    redFlags: [
      "An offer to skip the permit to save money",
      "No licence number, or one that does not check out",
      "Cash only, with no written quote",
      "A quote that does not say what panel or parts will be used",
      "Pressure to replace a panel that has not been inspected",
    ],
  },

  plumbers: {
    steps: [
      { title: "Check the licence", body: "Plumbing is licensed in most states and provinces. Look the licence up with the issuing authority before you book." },
      { title: "Ask how they charge", body: "Flat rate or hourly, plus any call-out fee. For an emergency, ask what the after-hours rate is before they come." },
      { title: "Get the price before work starts", body: "Once the problem is found, the cost of the fix should be agreed before any pipe is cut." },
      { title: "Ask about permits", body: "Water heaters, new lines and sewer work often need a permit. The plumber should say whether this job does." },
      { title: "Understand the warranty", body: "Ask how long the work is guaranteed and what the manufacturer covers on any new fixture or heater." },
      { title: "Get an itemized invoice", body: "Parts and labour listed separately, so you can check what was charged." },
    ],
    questions: [
      "What is your licence number?",
      "Do you charge by the job or by the hour, and is there a call-out fee?",
      "What is your rate after hours or on weekends?",
      "Will you give me the price before you start the repair?",
      "Does this job need a permit?",
      "What warranty do you give on the work?",
      "Do you use your own plumbers or subcontractors?",
      "Can you send a certificate of insurance?",
    ],
    redFlags: [
      "No price until the work is finished",
      "A large upsell on a small leak, such as replacing all the pipes",
      "No licence number",
      "Cash only, with no invoice",
      "A water heater swap with no mention of a permit where one is required",
    ],
  },

  hvac: {
    steps: [
      { title: "Check the licence and certification", body: "HVAC work is licensed in most places, and gas work carries its own certification. Look both up with the issuing authority." },
      { title: "Ask for a load calculation", body: "Sizing a new furnace or air conditioner by square footage alone often gets it wrong. A proper quote is based on a load calculation for your home." },
      { title: "Compare quotes on the same equipment", body: "Brand, model, efficiency rating and warranty should all be named so the quotes can be compared fairly." },
      { title: "Ask about rebates", body: "Utilities and governments often offer rebates on high-efficiency systems. A good contractor will know which apply." },
      { title: "Understand both warranties", body: "The manufacturer's parts warranty often needs registering. The contractor's labour warranty is separate." },
      { title: "Get the permit question answered", body: "A new system usually needs a permit. Ask who pulls it." },
    ],
    questions: [
      "What licences and gas certifications do you hold?",
      "Will you do a load calculation before quoting?",
      "What brand, model and efficiency rating are you quoting?",
      "Which rebates does this system qualify for?",
      "Who registers the manufacturer warranty?",
      "What labour warranty do you give?",
      "Is a maintenance plan included or extra?",
      "Will you pull the permit?",
    ],
    redFlags: [
      "A replacement quote with no visit to the house",
      "A quote that names no brand or model",
      "Pressure to replace a system that only needs a repair",
      "A promise of rebates the contractor will not put in writing",
      "No licence or gas certification",
    ],
  },

  "garage-doors": {
    steps: [
      { title: "Ask for a price on the phone", body: "Springs, cables and openers have standard prices. A company should give you a range before it sends anyone." },
      { title: "Ask about the parts", body: "Spring quality varies a lot. Ask for the cycle rating and the brand, and whether both springs will be replaced." },
      { title: "Leave springs to the technician", body: "Torsion springs are under high tension. This is not a job to try yourself." },
      { title: "Check the business is local", body: "Garage door searches are crowded with lead brokers. Make sure the company has a real address in your area." },
      { title: "Get the warranty in writing", body: "Parts and labour warranties are often different lengths." },
      { title: "Get an itemized invoice", body: "Each part and the labour listed separately." },
    ],
    questions: [
      "What will the repair cost, including the service call?",
      "What cycle rating are the springs you install?",
      "Do you replace both springs at once?",
      "What opener brands do you install and service?",
      "Where is your shop?",
      "What warranty do you give on parts and labour?",
      "Can you come today if the door will not open?",
      "Is there a charge if I decide not to go ahead?",
    ],
    redFlags: [
      "A very low service call price that hides an expensive repair",
      "Pressure to replace the whole door for a spring problem",
      "No local address",
      "Springs with no brand or cycle rating named",
      "No written invoice",
    ],
  },

  "chimney-services": {
    steps: [
      { title: "Ask for a certified sweep", body: "In the US look for CSIA certification, and in Canada for WETT. Ask for the certificate number and check it." },
      { title: "Know what the inspection level means", body: "A Level 1 inspection is a visual check. Level 2 uses a camera and is needed after a sale, a chimney fire or a change of appliance." },
      { title: "Ask to see the problem", body: "A reputable sweep will show you photos or video of any damage before recommending a repair." },
      { title: "Get repairs quoted separately", body: "Sweeping and repairs should be priced separately, in writing." },
      { title: "Get a second opinion on big repairs", body: "A relining or rebuild is a large cost. A second inspection is worth it before you agree." },
      { title: "Book outside the rush", body: "Late spring and summer are quieter, and cheaper to book, than the weeks before winter." },
    ],
    questions: [
      "Are you CSIA or WETT certified, and what is the number?",
      "Which inspection level are you doing?",
      "Can you show me photos or video of anything you find?",
      "What does the sweep cost, and what do repairs cost separately?",
      "Do you carry liability insurance?",
      "How long will the visit take?",
      "Will you give me a written report?",
      "What warranty comes with any repair?",
    ],
    redFlags: [
      "A cheap sweep that turns into an urgent, expensive repair",
      "Refusal to show photos of the damage",
      "No certification number",
      "Pressure to agree to a relining on the same visit",
      "Cold calls or flyers offering a very cheap inspection",
    ],
  },
};

export function hiringGuidanceFor(categorySlug: string): HiringGuidance | null {
  return GUIDANCE[categorySlug] ?? null;
}
