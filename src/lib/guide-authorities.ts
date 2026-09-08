// The only places a guide may cite that were not in the research.
//
// The writer's standing rule is that it cites what the search results gave it,
// because a model asked for a licensing board will produce a plausible URL and
// a plausible URL is indistinguishable from a real one until somebody clicks
// it. That rule is right for publishers and competitors and wrong for
// regulators: the whole argument of a guide about permits is weaker without a
// link to whoever issues them.
//
// So the rule is relaxed exactly this far. A source may come from outside the
// brief only when its host is on this list, and even then the URL is fetched
// before the guide is created. The list is deliberately institutional: bodies
// that publish rules, not sites that publish opinions.
//
// No imports, so the admin can read the list without pulling the writer in.

export type Authority = { host: string; name: string; note: string };

export const AUTHORITIES: Authority[] = [
  // United States, federal
  { host: "cpsc.gov", name: "Consumer Product Safety Commission", note: "Recalls and product safety" },
  { host: "epa.gov", name: "Environmental Protection Agency", note: "Lead paint, asbestos, refrigerants, radon" },
  { host: "osha.gov", name: "Occupational Safety and Health Administration", note: "Site safety rules" },
  { host: "energystar.gov", name: "Energy Star", note: "Efficiency ratings and eligibility" },
  { host: "energy.gov", name: "Department of Energy", note: "Efficiency standards and rebates" },
  { host: "irs.gov", name: "Internal Revenue Service", note: "Home improvement tax credits" },
  { host: "hud.gov", name: "Department of Housing and Urban Development", note: "Housing programmes" },
  { host: "fema.gov", name: "FEMA", note: "Flood zones and disaster repair" },
  { host: "nist.gov", name: "NIST", note: "Measurement and building standards" },
  { host: "usa.gov", name: "USA.gov", note: "Routing to the right state agency" },
  { host: "consumerfinance.gov", name: "Consumer Financial Protection Bureau", note: "Home improvement financing" },
  { host: "ftc.gov", name: "Federal Trade Commission", note: "Contractor fraud and cooling-off rules" },

  // United States, standards and trade bodies with a testable standard
  { host: "nfpa.org", name: "National Fire Protection Association", note: "Electrical and fire codes" },
  { host: "iccsafe.org", name: "International Code Council", note: "The model building codes states adopt" },
  { host: "ashrae.org", name: "ASHRAE", note: "HVAC standards" },
  { host: "ansi.org", name: "ANSI", note: "Standards accreditation" },
  { host: "ul.com", name: "UL Solutions", note: "Product listing and certification" },
  { host: "nrca.net", name: "National Roofing Contractors Association", note: "Roofing practice" },
  { host: "iapmo.org", name: "IAPMO", note: "Plumbing and mechanical codes" },
  { host: "phcc.org", name: "PHCC", note: "Plumbing and HVAC trade standards" },
  { host: "nadca.com", name: "NADCA", note: "Duct cleaning standards" },
  { host: "csia.org", name: "Chimney Safety Institute of America", note: "Chimney certification" },
  { host: "iicrc.org", name: "IICRC", note: "Restoration and cleaning certification" },
  { host: "necanet.org", name: "NECA", note: "Electrical contracting standards" },

  // Canada, federal
  { host: "canada.ca", name: "Government of Canada", note: "Federal programmes and regulations" },
  { host: "cmhc-schl.gc.ca", name: "CMHC", note: "Housing standards and programmes" },
  { host: "nrcan.gc.ca", name: "Natural Resources Canada", note: "Energy efficiency and rebates" },
  { host: "csagroup.org", name: "CSA Group", note: "Canadian product and installation standards" },
  { host: "nrc.canada.ca", name: "National Research Council", note: "The national model codes" },
  { host: "competitionbureau.gc.ca", name: "Competition Bureau", note: "Deceptive marketing" },

  // Consumer protection with a complaints record rather than an opinion
  { host: "bbb.org", name: "Better Business Bureau", note: "Complaint records. Not an endorsement" },
];

/** Hosts indexed for lookup, including the www and subdomain cases. */
const HOSTS = AUTHORITIES.map((authority) => authority.host);

/** True when a URL points at a body on the list. */
export function isAuthorityUrl(url: string): boolean {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  // A state board lives on a subdomain of the body it belongs to as often as
  // not, so an exact match is too strict and a substring match is too loose.
  return HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** The list as the writer reads it, for the end of the system prompt. */
export function authorityPromptBlock(): string {
  // No em dash as the separator. The rules above this list forbid them, and a
  // prompt that breaks its own rule thirty times teaches the model to break it.
  const lines = AUTHORITIES.map((authority) => `  ${authority.host} (${authority.name}). ${authority.note}.`);
  return [
    "AUTHORITIES YOU MAY CITE WITHOUT THE BRIEF",
    "These are the only hosts you may link to that the research did not hand you, and only where they are genuinely relevant to the sentence they support. Link the section you are certain of rather than a deep link you are guessing at. Every one of these is fetched before the guide is created, and anything that does not resolve is removed.",
    ...lines,
    "Anything else must have come from the research brief.",
  ].join("\n");
}
