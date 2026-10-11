import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar } from "@/components/site/blocks";
import { BusinessCentreNav } from "@/components/site/business-centre";
import { ClaimCodeForm } from "@/components/site/ClaimCodeForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Section } from "@/components/ui/primitives";
import { maskEmail } from "@/lib/claim-codes";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your claim",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ c?: string }> };

/** Where the link in the verification email lands. */
export default async function ClaimVerifyPage({ searchParams }: Props) {
  const { c } = await searchParams;
  const claim = c ? await db.claimRequest.findUnique({ where: { id: c } }) : null;

  let body: React.ReactNode;
  if (!claim || claim.verificationMethod !== "EMAIL") {
    body = (
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)" }}>
        We could not find a claim waiting for an email code at this link. Open the link from the email again, or
        contact business support and quote the reference from your email.
      </p>
    );
  } else if (claim.emailVerifiedAt) {
    body = (
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)" }}>
        Email verified for {claim.businessName}. An editor confirms the match against the listing and
        approves the claim, usually within two business days.
      </p>
    );
  } else if (claim.status === "APPROVED" || claim.status === "REJECTED") {
    body = (
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)" }}>
        This claim for {claim.businessName} has already been decided. Contact business support if you have questions.
      </p>
    );
  } else {
    body = (
      <>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 22 }}>
          Enter the code we sent about your claim for <strong>{claim.businessName}</strong>.
        </p>
        <ClaimCodeForm claimId={claim.id} maskedEmail={maskEmail(claim.ownerEmail)} />
      </>
    );
  }

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Confirm your claim" },
        ]}
      />
      <BusinessCentreNav active="claim" />

      <Section ruleTop labelledBy="verify-h1" ruleBottom={false}>
        <div className="card" style={{ padding: "40px 42px", maxWidth: 720 }}>
          <h1 id="verify-h1" style={{ fontSize: 28, marginBottom: 12 }}>
            Confirm your claim
          </h1>
          {body}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
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
