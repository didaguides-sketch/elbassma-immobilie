import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /search is intentionally absent here — it uses a page-level
        // `noindex` (see search/page.tsx via buildPageMetadata) instead of
        // a robots.txt disallow, so it stays crawlable and the noindex
        // directive is actually seen and honored. Disallowing it here
        // would make that directive unreachable.
        disallow: [
          "/admin",
          "/publisher",
          "/account",
          "/notifications",
          "/api",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
