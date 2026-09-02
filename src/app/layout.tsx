import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/primitives";
import { globalMetadata, publisherSchema } from "@/lib/seo";
import "@/styles/globals.css";

// Read from the database rather than hard-coded, so the Global SEO screen in
// the admin controls the site title, the social defaults, the verification
// codes and the site-wide index switch without a deploy.
export async function generateMetadata(): Promise<Metadata> {
  return globalMetadata();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const schema = await publisherSchema();

  return (
    <html lang="en">
      <head>
        {/* Inter, per the design system. Loaded from the Google Fonts CDN;
            swap for self-hosted woff2 if you need offline rendering. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {schema.length > 0 ? <JsonLd data={schema} /> : null}
        {children}
      </body>
    </html>
  );
}
