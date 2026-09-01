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

  const subscription = session
    ? await db.subscription.findFirst({
        where: { stripeCheckoutId: session },
        include: { plan: true, business: true },
      })
    : await db.subscription.findFirst({
        orderBy: { createdAt: "desc" },
        include: { plan: true, business: true },
      });

  return (
    <SiteChrome active="business">
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
            Your card is held and has not been charged. An editor reviews new listings against the
            same standards as everything else, and the first charge happens on the day the listing
            publishes. If it is declined, you are never charged.
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
                  {money(subscription.plan.priceCents, subscription.plan.currency)}/month once live
                </dd>
              </div>
              <div>
                <dt>Due today</dt>
                <dd>{money(0)}</dd>
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
