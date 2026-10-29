import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import { CentreHero, SearchBand } from "@/components/site/centre/parts";
import { GuestPostForm } from "@/components/site/GuestPostForm";
import { SiteChrome } from "@/components/site/SiteChrome";

export const metadata: Metadata = withSocial({
  title: "Sponsored guest post",
  description:
    "A sponsored guest post with two paid links for $99, labelled Sponsored and reviewed by an editor before it is published.",
  alternates: { canonical: "/advertise/guest-post/" },
});

export default function GuestPostPage() {
  return (
    <SiteChrome active="business" skin>
      <div className="bc2">
        <CentreHero crumb="Guest post" active="advertise">
          <div style={{ maxWidth: "820px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "12px" }}>Sponsored guest post</p>
            <h1 style={{ fontSize: "clamp(34px, 4.5vw, 52px)", lineHeight: "1.06", letterSpacing: "-0.04em" }}>
              One post, two links, <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: "400" }}>$99</span>
            </h1>
            <p style={{ marginTop: "18px", fontSize: "18px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              Paid placements never change a ranking. The post is labelled Sponsored in the article and in the byline, and both links are marked rel="sponsored".
            </p>
          </div>
        </CentreHero>
        <section style={{ padding: "64px 24px", maxWidth: "860px", margin: "0 auto" }}>
          <GuestPostForm />
        </section>
        <SearchBand />
      </div>
    </SiteChrome>
  );
}
