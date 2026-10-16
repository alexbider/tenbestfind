import type { Metadata } from "next";

const BRAND = "TenBestFind";

/**
 * Open Graph and Twitter tags for a page whose metadata is a constant.
 *
 * A static `metadata` export that sets only a title and a canonical inherits
 * the root layout's Open Graph block, which describes the homepage: og:url was
 * https://tenbestfind.com/ on /home-services/ and /locations/, so a share of
 * either one previewed as the homepage and told crawlers the two were the same
 * page. This copies the page's own title, description and canonical across.
 */
export function withSocial(meta: Metadata): Metadata {
  const raw = meta.title;
  const title =
    typeof raw === "string"
      ? `${raw} | ${BRAND}`
      : raw && typeof raw === "object" && "absolute" in raw && raw.absolute
        ? raw.absolute
        : undefined;
  const description = meta.description ?? undefined;
  const canonical = typeof meta.alternates?.canonical === "string" ? meta.alternates.canonical : undefined;

  return {
    ...meta,
    // Next replaces the parent's openGraph object rather than merging into it,
    // so the shared card image and locale have to be restated here.
    openGraph: {
      type: "website",
      siteName: BRAND,
      locale: "en_US",
      images: ["/social-card.png"],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...meta.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      images: ["/social-card.png"],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...meta.twitter,
    },
  };
}
