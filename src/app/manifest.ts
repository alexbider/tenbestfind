import type { MetadataRoute } from "next";
import { loadSeoSettings } from "@/lib/seo-settings";

// What a phone reads when somebody adds the site to their home screen.
//
// Without this the icons in this folder are a browser-tab favicon and nothing
// else: iOS falls back to a screenshot of the page and Android to the letter T
// in a circle. The two square marks in public/ are the same tile the favicon
// is cut from, so whatever the device picks, it is the same icon.
//
// Names come from the SEO settings rather than a literal, because the site name
// is editable and having it right in one place and stale in another is how a
// home screen ends up saying something nobody uses any more.

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await loadSeoSettings();
  const name = settings.text("seo.siteName") || "TenBestFind";

  return {
    name,
    short_name: name,
    description: settings.text("seo.homeDescription") || undefined,
    start_url: "/",
    display: "standalone",
    // The navy the mark sits on, so the status bar and the splash match the
    // icon rather than flashing white before the page paints.
    background_color: "#101f3d",
    theme_color: "#101f3d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
