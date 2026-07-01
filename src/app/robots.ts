import type { MetadataRoute } from "next";

import { absoluteUrl, NOINDEX } from "@/lib/site";

/**
 * robots.txt (US-023). Everything public is crawlable; the (future) admin area
 * under /admin (US-030+) is disallowed. Points crawlers at the sitemap.
 *
 * On a hidden/test deploy (`NEXT_PUBLIC_NOINDEX=true`) it disallows EVERYTHING so
 * the test site never gets crawled/indexed alongside the live site.
 */
export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(),
  };
}
