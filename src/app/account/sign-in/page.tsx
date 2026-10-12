import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ConfirmSignInForm } from "@/components/auth/AccountForms";
import { Section } from "@/components/ui/primitives";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

/**
 * Where the sign-in email lands. The link is spent by a button press rather
 * than by loading this page, so email scanners that open links cannot use it up.
 */
export default async function SignInLinkPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Sign in" },
        ]}
      />
      <Section ruleTop labelledBy="signin-h1" ruleBottom={false}>
        <div className="card" style={{ padding: "40px 42px", maxWidth: 640 }}>
          <h1 id="signin-h1" style={{ fontSize: 28, marginBottom: 12 }}>
            Sign in to your dashboard
          </h1>
          {token ? (
            <>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 22 }}>
                Press the button to open your dashboard. The link works once.
              </p>
              <ConfirmSignInForm token={token} />
            </>
          ) : (
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              This page needs the link from your email. Open the link again, or request a new one on the{" "}
              <Link href="/login/">sign-in page</Link>.
            </p>
          )}
        </div>
      </Section>
    </SiteChrome>
  );
}
