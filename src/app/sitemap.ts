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
  // Resilient to no DB at build time (docker build): fall back to just the
  // static routes; the comp entries fill in on the next ISR revalidation.
  let comps: Awaited<ReturnType<typeof getPublishedCompsForSitemap>> = [];
  try {
    comps = await getPublishedCompsForSitemap();
  } catch {
    comps = [];
  }

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
    {
      url: absoluteUrl("/tier-list"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: absoluteUrl("/planos"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/loja"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/sobre"), changeFrequency: "yearly", priority: 0.4 },
    ...compEntries,
  ];
}
