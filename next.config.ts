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
};

export default config;
