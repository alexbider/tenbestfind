import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar } from "@/components/site/blocks";
import { ClaimCodeForm } from "@/components/site/ClaimCodeForm";
import { BusinessCentreNav } from "@/components/site/business-centre";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Check } from "@/components/ui/Icon";
import { Badge, Section } from "@/components/ui/primitives";
import { fullDate, money } from "@/lib/format";
import { maskEmail } from "@/lib/claim-codes";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim submitted",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ session?: string }> };

export default async function ClaimCompletePage({ searchParams }: Props) {
  const { session } = await searchParams;

  // The webhook is the source of truth for activation. This page reads whatever
  // has landed, and says plainly when confirmation is still in flight.
  const subscription = session
    ? await db.subscription.findFirst({
        where: { stripeCheckoutId: session },
        include: { plan: true, business: true },
      })
    : null;

  // Only the session in the return link identifies the buyer. Without it there
  // is nothing to show, rather than someone else's most recent subscription.
  const record = subscription;
  const confirmed = record?.status === "ACTIVE";

  const claim = record
    ? await db.claimRequest.findFirst({ where: { subscriptionId: record.id }, orderBy: { submittedAt: "desc" } })
    : null;
  const needsCode = claim?.verificationMethod === "EMAIL" && !claim.emailVerifiedAt && claim.status !== "REJECTED";

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Claim submitted" },
        ]}
      />
      <BusinessCentreNav active="claim" />

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
            {confirmed ? "Subscription active, claim submitted" : "Claim submitted"}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 22 }}>
            {confirmed
              ? "Payment confirmed. Verification usually completes within two business days, and the charge is refunded in full if we cannot confirm ownership."
              : "Stripe is confirming the payment. That normally takes a few seconds; the subscription activates as soon as it lands, and you will get a receipt by email either way."}
          </p>

          {needsCode && claim ? (
            <div style={{ margin: "0 0 26px", padding: "22px 24px", borderRadius: 16, border: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
              <h2 style={{ fontSize: 19, marginBottom: 12 }}>Confirm your email</h2>
              <ClaimCodeForm claimId={claim.id} maskedEmail={maskEmail(claim.ownerEmail)} />
            </div>
          ) : null}

          {record ? (
            <dl className="transparency__grid" style={{ marginBottom: 26 }}>
              <div>
                <dt>Business</dt>
                <dd>{record.business.name}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>
                  {record.plan.name} · {money(record.plan.priceCents, record.plan.currency)}/month
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge tone={confirmed ? "positive" : "warning"}>
                    {confirmed ? "Verification pending" : "Confirming payment"}
                  </Badge>
                </dd>
              </div>
              {record.currentPeriodEnd ? (
                <div>
                  <dt>Next charge</dt>
                  <dd>{fullDate(record.currentPeriodEnd)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={routes.forBusinesses()} className="btn btn--secondary btn--sm">
              Back to the business centre
            </Link>
            <Link href={routes.contact()} className="btn btn--ghost btn--sm">
              Contact business support
            </Link>
          </div>
        </div>
      </Section>
    </SiteChrome>
  );
}
