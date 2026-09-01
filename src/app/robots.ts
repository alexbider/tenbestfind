import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Search results are infinite and thin; the admin is private.
        disallow: ["/admin", "/search"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
