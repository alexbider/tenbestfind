import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar } from "@/components/site/blocks";
import { BusinessCentreNav } from "@/components/site/business-centre";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Check } from "@/components/ui/Icon";
import { Badge, Section } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submission received",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ session?: string }> };

export default async function AddCompletePage({ searchParams }: Props) {
  const { session } = await searchParams;

  // Only the session in the return link identifies the buyer; without it the
  // page shows nothing rather than someone else's latest subscription.
  const subscription = session
    ? await db.subscription.findFirst({
        where: { stripeCheckoutId: session },
        include: { plan: true, business: true },
      })
    : null;

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Submission received" },
        ]}
      />
      <BusinessCentreNav active="add" />

      <Section ruleTop labelledBy="done-h1" ruleBottom={false}>
        <div className="card" style={{ padding: "40px 42px", maxWidth: 720 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--green-50)",
              color: "var(--green-600)",
              marginBottom: 20,
            }}
          >
            <Check size={28} color="currentColor" />
          </span>
          <h1 id="done-h1" style={{ fontSize: 28, marginBottom: 12 }}>
            Submission received
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 22 }}>
            Payment received and your listing is live. Your dashboard login is on its way by email.
            We also check every new listing against the business&apos;s own website; if something does
            not match, an editor takes a look, and a declined listing is refunded in full.
          </p>

          {subscription ? (
            <dl className="transparency__grid" style={{ marginBottom: 26 }}>
              <div>
                <dt>Business</dt>
                <dd>{subscription.business.name}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>
                  {subscription.plan.name} ·{" "}
                  {money(subscription.plan.priceCents, subscription.plan.currency)}/month
                </dd>
              </div>
              <div>
                <dt>Paid today</dt>
                <dd>{money(subscription.plan.priceCents * subscription.quantity, subscription.plan.currency)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge tone="warning">In editorial review</Badge>
                </dd>
              </div>
            </dl>
          ) : null}

          <Link href={routes.forBusinesses()} className="btn btn--secondary btn--sm">
            Back to the business centre
          </Link>
        </div>
      </Section>
    </SiteChrome>
  );
}
