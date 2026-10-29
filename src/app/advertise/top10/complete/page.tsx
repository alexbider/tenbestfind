import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import { SiteChrome } from "@/components/site/SiteChrome";
import { routes } from "@/lib/urls";

export const metadata: Metadata = withSocial({
  title: "Top 10 order received",
  description: "Your Top 10 featured placement order is being confirmed.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/advertise/top10/complete/" },
});

export default function Top10CompletePage() {
  return (
    <SiteChrome active="business" skin>
      <div className="bc2" style={{ maxWidth: "720px", margin: "0 auto", padding: "96px 24px" }}>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", lineHeight: "1.1", letterSpacing: "-0.03em" }}>Thanks, your order is in</h1>
        <p style={{ marginTop: "18px", fontSize: "17px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
          We are confirming your payment. The Featured Partner box appears on the chosen ranking once the payment clears, and it stays labelled Sponsored. Questions go to hello@tenbestfind.com.
        </p>
        <p style={{ marginTop: "24px" }}>
          <a href={routes.advertisingDisclosure()} style={{ color: "var(--color-primary)", fontWeight: "600" }}>Read the advertising disclosure</a>
        </p>
      </div>
    </SiteChrome>
  );
}
