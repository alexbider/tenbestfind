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
    question: "What does a subscription actually buy?",
    answer:
      "Profile management and listing maintenance: your details, your hours, your services, your coverage, plus a dashboard showing what the listing does. It does not buy a ranking position, and it never will.",
  },
  {
    question: "How much is it?",
    answer:
      "Claiming and adding are both $29 a month per location. A Top 10 featured placement is $199 a month per city and trade. Advertising across multiple markets is quoted against coverage.",
  },
  {
    question: "When am I charged?",
    answer:
      "A claim is charged at submission and refunded in full if we cannot verify your ownership. A new listing holds the card and charges only on the day the listing publishes, never if it is declined.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Any time. Cancellation takes effect at the end of the current period, and your listing reverts to an unclaimed editorial profile rather than being removed.",
  },
  {
    question: "Does paying more move me up a list?",
    answer:
      "No. There is no price at which an editorial position is for sale. A Top 10 featured placement is a labelled slot outside the ranked ten, and it says Sponsored wherever it appears.",
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
