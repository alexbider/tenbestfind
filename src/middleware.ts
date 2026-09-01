import { NextResponse, type NextRequest } from "next/server";

/**
 * The site canonicalises on trailing slashes. Next's built-in redirect is
 * disabled (see next.config.ts) so this can apply it to pages while leaving API
 * routes tolerant of either spelling: Stripe does not follow redirects on
 * webhook delivery, so a POST to /api/stripe/webhook has to be answered
 * directly rather than bounced to /api/stripe/webhook/.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith("/")) return NextResponse.next();

  // API routes: serve the trailing-slash handler without a redirect.
  if (pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/`;
    return NextResponse.rewrite(url);
  }

  // Anything that looks like a file (favicon.ico, robots.txt, sitemap.xml) is
  // left alone; everything else is a page and gets the canonical redirect.
  if (pathname.includes(".")) return NextResponse.next();

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
