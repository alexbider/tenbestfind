import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SetPasswordForm } from "@/components/auth/AccountForms";
import { Section } from "@/components/ui/primitives";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your password",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

/** Where the welcome email lands. The owner chooses a password here. */
export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Create your password" },
        ]}
      />
      <Section ruleTop labelledBy="pw-h1" ruleBottom={false}>
        <div className="card" style={{ padding: "40px 42px", maxWidth: 640 }}>
          <h1 id="pw-h1" style={{ fontSize: 28, marginBottom: 12 }}>
            Create your password
          </h1>
          {token ? (
            <>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 22 }}>
                Choose a password for your TenBestFind dashboard. You can also sign in with an emailed link any time.
              </p>
              <SetPasswordForm token={token} />
            </>
          ) : (
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              This page needs the link from your email. Open the link again, or ask for a new one on the{" "}
              <Link href="/login/">sign-in page</Link>.
            </p>
          )}
        </div>
      </Section>
    </SiteChrome>
  );
}
