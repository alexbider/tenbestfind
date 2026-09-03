import type { ReactNode } from "react";
import type { NavKey } from "@/lib/navigation";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, main and footer wrapper shared by every public template. */
export function SiteChrome({
  children,
  active = "none",
}: {
  children: ReactNode;
  active?: NavKey;
}) {
  return (
    <div style={{ background: "var(--surface-card)" }}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader active={active} />
      <main id="main" className="site-page">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
