import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/urls";

/** Fields a claimed owner edits directly. */
export const OWNER_FIELDS = [
  "Business name, phone, email and website",
  "Opening hours and emergency availability",
  "Services offered and service area",
  "Business description and photos",
  "Credentials you provide, labelled as reported until verified",
  "Financing, free estimates and warranty terms",
];

/** Fields the editorial team owns, whatever a business pays. */
export const EDITORIAL_FIELDS = [
  "Ranking position",
  "Top 10 status",
  "The editorial summary and our take",
  "Best for designation",
  "The reasoning published alongside a ranking",
  "Whether a credential is marked verified",
];

export const BILLING_FAQS = [
  {
    question: "What does each option buy?",
    answer:
      "Claim & Manage ($29 a month per location) lets you verify ownership and keep your listing details current. Directory Listing ($29 a month per published location) adds a business we do not cover yet, once it passes editorial review. A Top 10 featured placement ($199 a month per city and trade) adds a labelled box beside one ranking. A sponsored guest post ($99 once) is one article with two paid links. Advertising across several markets is quoted.",
  },
  {
    question: "Does paying change a ranking?",
    answer:
      "Never. Payment cannot add, remove, move or protect a company in any ranked list. Paid placements sit beside the list and carry a Sponsored label wherever they appear.",
  },
  {
    question: "When am I charged?",
    answer:
      "A claim is charged at checkout and refunded in full if we cannot verify your ownership. A new listing holds the card and charges only on the day it publishes, never if it is declined. A Top 10 placement is charged at checkout and then monthly. A guest post is charged once at checkout, before an editor reviews it.",
  },
  {
    question: "How do I cancel?",
    answer:
      "Any time, from your billing portal or by writing to hello@tenbestfind.com. Cancellation takes effect at the end of the current period. A Top 10 box stops showing when its subscription ends, and a claimed profile reverts to an unclaimed editorial listing rather than being removed.",
  },
  {
    question: "How is a guest post reviewed?",
    answer:
      "After payment, an editor checks the topic against our editorial standards and checks both links. We may ask you to change the topic or a link before publishing. The published post carries a Sponsored label in the article and the byline, and both links are marked rel=\"sponsored\". If an editor declines the post, we tell you why.",
  },
  {
    question: "Will people know I am a subscriber?",
    answer:
      "A claimed profile is marked as claimed, which tells readers the owner maintains the details. A paid placement is labelled Sponsored. A plain subscription is not otherwise advertised.",
  },
  {
    question: "What if my details are wrong and I have not claimed?",
    answer:
      "Report it through the corrections form and we will check it against the primary source and fix it. You do not need to pay us to correct an error.",
  },
];

const TABS = [
  { key: "landing", label: "Overview", href: routes.forBusinesses(), icon: "grid" as const },
  { key: "claim", label: "Claim", href: routes.claim(), icon: "key" as const },
  { key: "add", label: "Add a business", href: routes.addBusiness(), icon: "plus" as const },
  { key: "advertise", label: "Advertise", href: routes.advertise(), icon: "megaphone" as const },
];

/** Navigation bar across the four business-centre states. */
export function BusinessCentreNav({ active }: { active: "landing" | "claim" | "add" | "advertise" }) {
  return (
    <div className="centre-nav">
      <div className="shell centre-nav__inner">
        <span className="centre-nav__label">Business centre</span>
        <nav aria-label="Business centre">
          <ul>
            {TABS.map((tab) => (
              <li key={tab.key}>
                <Link href={tab.href} data-on={tab.key === active} aria-current={tab.key === active ? "page" : undefined}>
                  <Icon name={tab.icon} size={16} strokeWidth={1.9} />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
