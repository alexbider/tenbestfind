// The house rules an editor can switch on, and what each one tells the writer.
//
// Deliberately its own module with no imports. The admin form needs the labels
// and the admin form is a client component, so anything it reaches through
// would be dragged into the browser bundle: guide-writer pulls in the Anthropic
// client, which pulls in the secret store, which reads node:crypto, and webpack
// tries to follow that into the browser and fails the build.

/**
 * The switches an editor can turn on per template.
 *
 * Named rather than free text so the admin can offer them as checkboxes and so
 * two templates asking for the same thing ask for it the same way.
 */
export const SKILLS: Record<string, string> = {
  "cost-ranges":
    "Where the research supports a price range, give it as a range with what moves it up and down, and name the unit it is priced by. Where it does not, say that the number depends on the job and what to ask for in a quote instead. Never publish a single national figure.",
  "local-variation":
    "Say explicitly where rules, licensing or pricing differ by state or province, and name at least two places that differ from each other. Do not imply a national rule that does not exist.",
  "questions-to-ask":
    "Include a block of questions a reader should put to a company, and for each one say what a good answer sounds like and what a bad one sounds like. The point is the discrimination, not the question.",
  "red-flags":
    "Include a flags block of the things that should end the conversation, each one specific enough to recognise in a real exchange.",
  "checklist":
    "Include a checklist a reader can work through in order, before the work starts and before the final payment.",
  "comparison-table":
    "Include a compare block lining up the factors that make two quotes differ, so a reader can put two documents side by side.",
  "aeo-first":
    "Write for extraction as well as for reading: every heading is a question or a claim, the paragraph under it answers that heading in its first sentence, and no answer depends on having read an earlier section.",
  "eeat-signals":
    "Name what is verifiable and how to verify it: which register to search, which certificate comes from which party, what a document should say. Verifiability is the expertise.",
  "no-fluff":
    "Cut anything that would survive being cut. No section that only restates the section above it. Prefer being 200 words shorter than padding.",
};

export const SKILL_LABELS: Record<string, string> = {
  "cost-ranges": "Handle prices as ranges, never one national figure",
  "local-variation": "Call out where rules differ by state or province",
  "questions-to-ask": "Include questions, with good and bad answers",
  "red-flags": "Include a walk-away list",
  "checklist": "Include a checklist to work through",
  "comparison-table": "Include a comparison table",
  "aeo-first": "Write for extraction: every heading answered in its first sentence",
  "eeat-signals": "Name what is verifiable and how to verify it",
  "no-fluff": "Cut anything that would survive being cut",
};
