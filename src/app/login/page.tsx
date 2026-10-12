import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrumbBar } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { LoginOptions } from "@/components/auth/AccountForms";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/google-login";
import { PORTAL_PATH } from "@/lib/client-accounts";
import { Section } from "@/components/ui/primitives";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to your dashboard",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  google: "Google sign-in did not finish. Try again, or use one of the other options below.",
  "no-account":
    "We could not find a business dashboard for that Google account. Use the email address you claimed with, or sign in another way below.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect(PORTAL_PATH);

  const { error } = await searchParams;
  const googleEnabled = await googleConfigured();

  return (
    <SiteChrome active="business" skin>
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Sign in" },
        ]}
      />
      <Section ruleTop labelledBy="login-h1" ruleBottom={false}>
        <div className="card" style={{ padding: "40px 42px", maxWidth: 640 }}>
          <h1 id="login-h1" style={{ fontSize: 28, marginBottom: 12 }}>
            Sign in to your dashboard
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 26 }}>
            Choose whichever way suits you. Your listing, leads and billing are all in the dashboard.
          </p>
          <LoginOptions googleEnabled={googleEnabled} notice={error ? NOTICES[error] : undefined} />
        </div>
      </Section>
    </SiteChrome>
  );
}
