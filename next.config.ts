import type { NextConfig } from "next";

/**
 * Headers every response carries.
 *
 * HTTPS is a confirmed ranking signal and HSTS is what makes it stick: without
 * it the first request of every session is still plaintext and still
 * redirectable. The max-age is a year, but deliberately without
 * includeSubDomains or preload, because both are promises about hostnames this
 * repository does not know about and preload is painful to undo.
 *
 * The CSP is the safe subset. frame-ancestors and X-Frame-Options say the same
 * thing to new and old browsers, base-uri stops an injected <base> rewriting
 * every relative link on the page, and object-src closes the plugin surface. A
 * script-src policy is not here on purpose: Next inlines its own bootstrap, so
 * a real one needs per-request nonces, and a broken CSP takes the site down
 * rather than degrading.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  // The design's URL model uses trailing slashes throughout. The automatic
  // redirect is disabled so middleware can apply it to pages while letting API
  // routes answer either spelling; Stripe does not follow redirects.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The blog is gone: everything the site publishes is a guide. These are
  // permanent because the old addresses were public, and a 301 is how you tell
  // an engine that the page moved rather than that it vanished.
  async redirects() {
    return [
      { source: "/blog", destination: "/guides/", permanent: true },
      { source: "/blog/:slug", destination: "/guides/:slug/", permanent: true },
    ];
  },
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
