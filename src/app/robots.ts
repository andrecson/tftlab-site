import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * robots.txt (US-023). Everything public is crawlable; the (future) admin area
 * under /admin (US-030+) is disallowed. Points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
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
