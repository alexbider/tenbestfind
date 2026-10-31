import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { JsonLd } from "@/components/ui/primitives";
import { globalMetadata, publisherSchema } from "@/lib/seo";
import "@/styles/globals.css";

// Self-hosted at build time, so no stylesheet from Google blocks the first paint.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-inter" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", variable: "--font-instrument-serif" });

// Read from the database rather than hard-coded, so the Global SEO screen in
// the admin controls the site title, the social defaults, the verification
// codes and the site-wide index switch without a deploy.
export async function generateMetadata(): Promise<Metadata> {
  return globalMetadata();
}

/**
 * The colour a phone paints around the page.
 *
 * The same navy the mark sits on, so the status bar, the splash screen and the
 * icon are one thing rather than a white bar above a dark header.
 */
export const viewport: Viewport = {
  themeColor: "#101f3d",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const schema = await publisherSchema();

  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        {/* One graph, one @context, so the two entities are related to each
            other rather than sitting beside each other as two islands. */}
        {schema.length > 0 ? <JsonLd data={{ "@context": "https://schema.org", "@graph": schema }} /> : null}
        {children}
      </body>
    </html>
  );
}
