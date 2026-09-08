import { NextResponse, type NextRequest } from "next/server";

/**
 * The two things that have to be true of every URL before it reaches a page:
 * it is on the canonical hostname, and it ends in a slash.
 *
 * Both are redirects rather than rewrites, because a page that answers at more
 * than one address is a page whose authority is split between them. They are
 * applied together so a www URL without a trailing slash is fixed in one hop
 * instead of bouncing the browser twice.
 *
 * API routes are the exception on both counts. Next's built-in trailing-slash
 * redirect is disabled (see next.config.ts) so this can leave them tolerant of
 * either spelling: Stripe does not follow redirects on webhook delivery, so a
 * POST to /api/stripe/webhook has to be answered rather than bounced, whichever
 * hostname it arrives on.
 */

/** The hostname everything canonicalises onto, if one is configured. */
const CANONICAL = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return null;
  try {
    return new URL(configured);
  } catch {
    return null;
  }
})();

/** True for a path that should end in a slash but does not. */
function needsSlash(pathname: string): boolean {
  if (pathname.endsWith("/")) return false;
  // Anything that looks like a file (favicon.ico, robots.txt, sitemap.xml) is
  // an address in its own right; everything else is a page.
  return !pathname.includes(".");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // /mcp is the address most people expect an MCP server to answer on, and the
  // one they will type from memory. It is the same endpoint, rewritten rather
  // than redirected so a POST arrives with its body intact and in one hop.
  if (pathname === "/mcp" || pathname === "/mcp/") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/mcp/";
    return NextResponse.rewrite(url);
  }

  // Somebody pasted the bare domain into a connector. Nothing else posts JSON
  // to the front page, and the alternative is an HTML 405 that reads like the
  // site is broken rather than like one wrong character in a URL.
  if (
    request.method === "POST" &&
    (pathname === "/" || pathname === "") &&
    (request.headers.get("content-type") ?? "").includes("application/json")
  ) {
    const endpoint = new URL("/mcp", CANONICAL ?? request.url).toString();
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: `This is the website, not the connector. Use ${endpoint} as the server URL.`,
        },
      },
      { status: 404, headers: { "access-control-allow-origin": "*" } },
    );
  }

  // The www host answers on the same certificate and serves the same app, so
  // without this every page exists at two addresses. The canonical tags
  // already name the apex; this makes the server say the same thing. Built
  // from the configured origin rather than from the request so the redirect
  // lands on https even when TLS was terminated upstream.
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (!isApi && CANONICAL && host.startsWith("www.") && host.slice(4) === CANONICAL.hostname) {
    const path = needsSlash(pathname) ? `${pathname}/` : pathname;
    return NextResponse.redirect(new URL(`${path}${search}`, CANONICAL).toString(), 308);
  }

  if (pathname.endsWith("/")) return NextResponse.next();

  // API routes: serve the trailing-slash handler without a redirect.
  if (isApi) {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/`;
    return NextResponse.rewrite(url);
  }

  if (!needsSlash(pathname)) return NextResponse.next();

  // Built from request.url rather than nextUrl: NextURL re-applies the
  // trailingSlash setting when it serializes, which would strip the slash we
  // just added and send the browser round in a loop.
  const target = new URL(request.url);
  target.pathname = `${pathname}/`;
  return NextResponse.redirect(target.toString(), 308);
}

export const config = {
  // Skip Next internals and static assets.
  matcher: "/((?!_next/static|_next/image).*)",
};
