import { Disclosure } from "./Disclosure";

/** The standard disclosures, written once and reused across every template. */

export function GoogleReviewDisclosure() {
  return (
    <Disclosure label="About this rating" title="Google review data">
      <p>
        Star ratings and review counts come from each company&apos;s Google Business Profile and are
        shown with the date we last read them. They are Google&apos;s numbers, not ours.
      </p>
      <p>
        We do not blend them into a score of our own, and a high rating does not by itself move a
        company up a ranking. Review volume varies enormously between companies of similar quality,
        so we read the pattern in what customers describe rather than the number alone.
      </p>
    </Disclosure>
  );
}

export function SponsoredDisclosure() {
  return (
    <Disclosure label="Why am I seeing this?" title="Sponsored placement">
      <p>
        This is a paid placement. The company bought a labelled Featured Partner slot on this page.
      </p>
      <p>
        Sponsorship does not determine TenBestFind editorial rankings. The ten ranked positions are
        set by the editorial team against published criteria, and sponsors do not see a ranking
        before it publishes or influence how criteria are applied.
      </p>
    </Disclosure>
  );
}

export function PricingDisclosure() {
  return (
    <Disclosure label="How to read these ranges" title="Pricing methodology">
      <p>
        Figures are installed prices including materials and labour, collected from contractor
        pricing in the markets we cover and checked against published permit and fee schedules.
      </p>
      <p>
        Ranges move with roof or project size, access, material grade and season. Where we have no
        sourced figure we say &quot;Quoted per project&quot; rather than publishing an estimate we
        cannot support. Nothing here is a quote, and nothing here is financial advice.
      </p>
    </Disclosure>
  );
}

export function MethodologyDisclosure() {
  return (
    <Disclosure label="How this ranking was made" title="Ranking methodology">
      <p>
        Every list starts with the companies that genuinely serve the area. We then check licensing
        or registration against the issuing authority, years in the local market, the range of work
        actually performed, warranty terms in writing, and patterns in public feedback.
      </p>
      <p>
        Businesses never need to pay to be considered, and no position is set by an automated
        system. A named editor reads every page before it publishes.
      </p>
    </Disclosure>
  );
}

export function CredentialDisclosure() {
  return (
    <Disclosure label="How credentials are checked" title="Credential verification">
      <p>
        Verified means we found the credential in the issuing authority&apos;s own register and noted
        the date. Reported means the business told us and we could not independently confirm it.
        Expired means the record exists but has lapsed.
      </p>
      <p>
        Licensing differs by trade and jurisdiction. Some trades are not licensed at all in some
        places, in which case insurance certificates and manufacturer certification do the work a
        licence would do elsewhere.
      </p>
    </Disclosure>
  );
}

export function BusinessProvidedDisclosure() {
  return (
    <Disclosure label="Where this comes from" title="Business-provided information">
      <p>
        Fields in this section were supplied by the business, either through a claimed profile or a
        submission. We publish them as provided and label them as reported.
      </p>
      <p>
        Details we checked against a primary source are marked verified with the date we checked.
        Everything else in this section is the company describing itself.
      </p>
    </Disclosure>
  );
}

export function CoverageDisclosure() {
  return (
    <Disclosure label="How to read coverage" title="Service coverage">
      <p>
        Coverage areas are as the business describes them, cross-checked against where its recent
        documented work actually is.
      </p>
      <p>
        A company listing a wide area does not always serve all of it equally. Confirm your address
        before scheduling, particularly at the edges of a service area.
      </p>
    </Disclosure>
  );
}

export function EditorialDisclosure() {
  return (
    <Disclosure label="Editorial disclosure" title="Editorial independence">
      <p>
        TenBestFind makes money from business subscriptions and clearly labelled sponsored
        placements. Neither buys a position on an editorial list.
      </p>
      <p>
        The people who research and write rankings do not sell advertising and are not told which
        companies are subscribers when a ranking is finalized.
      </p>
    </Disclosure>
  );
}

export function AiAssistanceDisclosure() {
  return (
    <Disclosure label="How this page was researched" title="Research and AI assistance">
      <p>
        We use software to help gather and organize public records: licence registers, business
        registrations, permit data and published pricing.
      </p>
      <p>
        No ranking position is ever set by an automated system, and every page is read by a named
        editor before it publishes.
      </p>
    </Disclosure>
  );
}

/**
 * Explains the badges shown alongside it. On a company profile only the badges
 * that company actually holds are described, and the whole disclosure
 * disappears when it holds none, so nobody is invited to look for a "Featured
 * Partner" mark that is not on the page. The explainer pages pass nothing and
 * get all four.
 */
export function BadgeDisclosure({
  verified = true,
  ranked = true,
  claimed = true,
  sponsored = true,
}: {
  verified?: boolean;
  ranked?: boolean;
  claimed?: boolean;
  sponsored?: boolean;
} = {}) {
  if (!verified && !ranked && !claimed && !sponsored) return null;
  return (
    <Disclosure label="What do these badges mean?" title="Badge definitions">
      {verified ? (
        <p>
          <strong>Verified details</strong> means we checked the company&apos;s registration and
          credentials against a primary source on the date shown.
        </p>
      ) : null}
      {ranked ? (
        <p>
          <strong>Top 10 ranked</strong> means the company holds an editorial position on a
          published ranking. It cannot be bought.
        </p>
      ) : null}
      {claimed ? (
        <p>
          <strong>Claimed profile</strong> means the owner has verified ownership and manages the
          listing. Claiming never affects ranking position.
        </p>
      ) : null}
      {sponsored ? (
        <p>
          <strong>Featured Partner</strong> is a paid, labelled placement. A Featured Partner never
          earns a ranking position by paying, and a company holding this badge may hold no
          editorial position at all.
        </p>
      ) : null}
    </Disclosure>
  );
}
