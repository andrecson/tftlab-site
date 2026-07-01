import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { getPublishedCompsForSitemap } from "@/server/queries/comp";

/**
 * sitemap.xml (US-023) — the homepage plus one entry per PUBLISHED comp.
 *
 * Only published comps are listed (the query filters `status: "PUBLISHED"`), so
 * drafts/archived never leak into the sitemap. `lastModified` uses each comp's
 * `updatedAt`. Regenerated on the same ISR cadence as the pages it lists so a
 * newly published comp shows up without a full rebuild.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const comps = await getPublishedCompsForSitemap();

  const compEntries: MetadataRoute.Sitemap = comps.map((comp) => ({
    url: absoluteUrl(`/comps/${comp.slug}`),
    lastModified: comp.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    ...compEntries,
  ];
}
