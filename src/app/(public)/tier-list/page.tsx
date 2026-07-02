import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { PageHeading } from "@/components/page-heading";
import { TierBands } from "@/components/tier-bands";
import { groupByTier } from "@/lib/tiers";
import { getSiteConfig } from "@/server/queries/config";
import { getPublishedComps } from "@/server/queries/tierlist";

/**
 * Tier-list page — served at `/tier-list` (moved off `/`, which is now the
 * landing). Statically rendered with ISR: every PUBLISHED comp is fetched on the
 * server (wrapped in `unstable_cache` tagged `tierlist`, refreshed via
 * `revalidateTag("tierlist")` on publish/unpublish) and rendered directly in the
 * S/A/B/C/X bands. Reads no request-time APIs, so it stays static.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tier List",
  description:
    "Tier list de composições de TFT do patch atual — comps por tier (S/A/B/C), com carries, itens, augments e guias.",
  alternates: { canonical: "/tier-list" },
};

/**
 * Cached flat list of PUBLISHED comps plus the current patch id used to derive
 * the Novo/Atualizado badges on each card. Both are read under the `tierlist`
 * tag so a publish or patch change refreshes the badges too.
 */
const getTierListData = unstable_cache(
  async () => {
    try {
      const [comps, config] = await Promise.all([
        getPublishedComps(),
        getSiteConfig(),
      ]);
      return { comps, currentPatchId: config?.currentPatchId ?? null };
    } catch {
      // No DB at build time (e.g. `docker build`) → render empty; ISR refreshes
      // at runtime once the database is reachable.
      return { comps: [], currentPatchId: null };
    }
  },
  ["tierlist-page-data"],
  { tags: ["tierlist"] },
);

export default async function TierListPage() {
  const { comps, currentPatchId } = await getTierListData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeading
        title="Tier List"
        subtitle="As comps mais fortes do patch — ranqueadas por força."
      />

      <TierBands groups={groupByTier(comps)} currentPatchId={currentPatchId} />
    </div>
  );
}
