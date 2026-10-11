import type { ReactNode } from "react";
import type { NavKey } from "@/lib/navigation";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { V2Motion } from "./V2Motion";

/**
 * Header, main and footer wrapper shared by every public template.
 *
 * `skin` turns on the October 2026 design's skin for secondary pages
 * (v2-skin.css); the home page, the city hub, the Top 10 page and the company
 * profile are drawn in the new style directly and leave it off. `phoneLayer`
 * is the design's shared phone layer (v2-mobile.css), on everywhere except the
 * company profile, which carries its own.
 */
export function SiteChrome({
  children,
  active = "none",
  skin = false,
  phoneLayer = true,
}: {
  children: ReactNode;
  active?: NavKey;
  skin?: boolean;
  phoneLayer?: boolean;
}) {
  return (
    <div style={{ background: "var(--surface-card)" }}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader active={active} />
      <main
        id="main"
        className="site-page"
        data-skin={skin ? "v2" : undefined}
        data-mskin={phoneLayer ? "" : undefined}
      >
        {children}
      </main>
      <SiteFooter />
      <V2Motion />
    </div>
  );
}
