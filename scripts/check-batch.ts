// What the batch path does with an answer, without spending anything.
//
// The wave itself cannot be exercised here: it needs a key and it costs money.
// What can be checked is everything that happens to a result once it arrives,
// which is where the pipeline would silently lose a listing: a refusal, a
// truncated answer, prose where JSON was asked for, and a well-formed object
// that fails the schema anyway.

import { readBatchMessage, jsonRequest, ContentError } from "../src/lib/anthropic";
import { listingSchema, writerAsk, type Brief } from "../src/lib/listing-writer";
import { extractionSchema } from "../src/lib/site-extract";

const say = (label: string, value: unknown) => console.log(`  ${label}: ${String(value)}`);

function message(text: string, stopReason = "end_turn") {
  return { stop_reason: stopReason, content: [{ type: "text", text }] };
}

/** Says whether the thing that should have happened is what happened. */
function attempt(label: string, expect: "parses" | "rejected", run: () => unknown): void {
  try {
    run();
    console.log(`  ${expect === "parses" ? "ok   " : "WRONG"} ${label}`);
  } catch (error) {
    const content = error instanceof ContentError;
    const right = expect === "rejected" && content;
    console.log(`  ${right ? "ok   " : "WRONG"} ${label}: ${(error as Error).message}`);
  }
}

const listing = {
  tagline: "Roofing that outlasts the next storm",
  overview: "They roof houses in Plano and they answer the phone. ".repeat(12),
  description: "Hail is the reason most of this work exists in Collin County. ".repeat(40),
  editorialTake: "They answer the phone, and the estimate arrives when they said it would. ".repeat(3),
  bestFor: "Homeowners after hail",
  strengths: ["Insurance claim work", "Metal roof installs", "Same-week repair starts"],
  considerations: ["Books up in storm season", "No weekend crews in winter"],
  services: ["Roof replacement", "Storm repairs", "Metal roofing", "Gutter replacement"],
  faqs: Array.from({ length: 5 }, (unused, index) => ({
    question: `Question number ${index + 1} about the roof?`,
    answer: "Yes, and here is the sentence of detail that makes it an actual answer.",
  })),
  seoTitle: "Bluebonnet Exteriors Roofing in Plano Reviewed",
  seoDescription:
    "Bluebonnet Exteriors is a Plano roofer that handles hail claims end to end, with metal and shingle installs and same-week starts for repairs.",
  extraKeywords: ["plano roofer", "hail damage", "metal roofing"],
};

const extraction = {
  staff: [],
  yearFounded: 0,
  employeeCount: "",
  licenseNumbers: [],
  certifications: [],
  paymentMethods: [],
  awards: [],
  brands: [],
  insured: "yes",
  warrantyTerms: "",
  services: [],
  specialties: [],
  areasServed: [],
  serviceRadiusKm: 0,
  hours: [],
  bbbRating: "",
  bbbAccreditedSince: 0,
  inspectionFee: "",
  manufacturerWarranty: "",
  bestFor: "",
  tagline: "",
  postalCode: "",
  emergency: "unknown",
  financing: "no",
  freeEstimates: "yes",
  phone: "",
  email: "office@bluebonnetexteriors.com",
  addressLine: "",
  summary: "",
};

console.log("reading a batch answer:");
attempt("a well formed listing parses", "parses", () => {
  const value = readBatchMessage(message(JSON.stringify(listing)), listingSchema);
  if (value.tagline !== listing.tagline) throw new Error("wrong value came back");
});
attempt("prose instead of JSON is rejected", "rejected", () =>
  readBatchMessage(message("Sure, here is the listing you asked for."), listingSchema),
);
attempt("an empty answer is rejected", "rejected", () => readBatchMessage(message(""), listingSchema));
attempt("a refusal is rejected", "rejected", () =>
  readBatchMessage(message(JSON.stringify(listing), "refusal"), listingSchema),
);
attempt("a truncated answer is rejected", "rejected", () =>
  readBatchMessage(message(JSON.stringify(listing), "max_tokens"), listingSchema),
);
attempt("a listing short of an FAQ is rejected", "rejected", () =>
  readBatchMessage(message(JSON.stringify({ ...listing, faqs: listing.faqs.slice(0, 2) })), listingSchema),
);
attempt("an extraction of sentinels parses", "parses", () => {
  const value = readBatchMessage(message(JSON.stringify(extraction)), extractionSchema);
  if (value.yearFounded !== null) throw new Error("the sentinel did not become null");
  if (value.freeEstimates !== true) throw new Error("the claim did not become a boolean");
});

console.log("\nthe request one wave sends:");
const brief: Brief = {
  name: "Bluebonnet Exteriors",
  focusKeyword: "bluebonnet exteriors",
  category: "Roofing",
  serviceName: "roofer",
  city: "Plano",
  region: "Texas",
  country: "United States",
  address: "1 Main St",
  phone: "+1 972 555 0100",
  website: "https://bluebonnetexteriors.com",
  email: "office@bluebonnetexteriors.com",
  rating: 4.9,
  reviewCount: 214,
  ratingReadOn: "4 September 2026",
  gmbRank: 1,
  gmbCategory: "Roofing contractor",
  hours: null,
  site: null,
  avoidOpenings: [],
};

const ask = writerAsk(brief, { effort: "medium" });
const request = jsonRequest(ask);
say("model", request.model);
say("effort", request.output_config.effort);
say("system blocks cached", request.system.filter((block) => block.cache_control).length);
say("system characters", request.system[0]!.text.length);
say("prompt characters", request.messages[0]!.content.length);
say("schema is a json_schema format", request.output_config.format.type === "json_schema");

// The same builder feeds both tiers, so a batched request and a direct one are
// the same bytes. That is the whole reason it is one function.
const again = jsonRequest(writerAsk(brief, { effort: "medium" }));
say("identical on both paths", JSON.stringify(request) === JSON.stringify(again));
