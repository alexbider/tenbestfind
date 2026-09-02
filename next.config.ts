import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The design's URL model uses trailing slashes throughout. The automatic
  // redirect is disabled so middleware can apply it to pages while letting API
  // routes answer either spelling; Stripe does not follow redirects.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  eslint: { ignoreDuringBuilds: true },
  // The app router skips any directory starting with a dot, so the TDM
  // reservation is served by a normal route and mapped onto its well-known
  // address here.
  async rewrites() {
    return [{ source: "/.well-known/tdmrep.json", destination: "/api/tdmrep/" }];
  },
};

export default config;
