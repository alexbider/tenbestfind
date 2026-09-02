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
    return [
      { source: "/.well-known/tdmrep.json", destination: "/api/tdmrep/" },
      // OAuth discovery. RFC 9728 also defines a path-suffixed form, so a client
      // that appends the resource path finds the same document.
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/wellknown/oauth-protected-resource/",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/wellknown/oauth-protected-resource/",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/wellknown/oauth-authorization-server/",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/wellknown/oauth-authorization-server/",
      },
      // Some clients look for the OpenID document at the issuer instead.
      {
        source: "/.well-known/openid-configuration",
        destination: "/api/wellknown/oauth-authorization-server/",
      },
    ];
  },
};

export default config;
