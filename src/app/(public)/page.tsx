import { Suspense } from "react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { TierBands } from "@/components/tier-bands";
import { TierListFilters } from "@/components/tier-list-filters";
import { groupByTier } from "@/lib/tiers";
import { getSiteConfig } from "@/server/queries/config";
import { getPublishedComps } from "@/server/queries/tierlist";

/**
 * Tier-list page (US-014, filters in US-016) — served at `/`.
 *
 * Statically rendered with ISR: every PUBLISHED comp is fetched on the server
 * (wrapped in `unstable_cache` tagged `tierlist`, so publishing/unpublishing a
 * comp — US-038 — can refresh it via `revalidateTag("tierlist")`) and shipped
 * to the client, where `TierListFilters` filters it by tier/synergy/champion/
 * search entirely from the URL query string. Because the server component reads
 * no request-time APIs and the client filter is wrapped in `<Suspense>`, the
 * route stays static.
 */
export const revalidate = 3600;

/** Canonical URL for the tier-list homepage (US-023). */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Cached flat list of PUBLISHED comps plus the current patch id used to derive
 * the Novo/Atualizado badges on each card. Both are read under the `tierlist`
 * tag so a publish or patch change (US-038/US-039) refreshes the badges too.
 */
const getTierListData = unstable_cache(
  async () => {
    const [comps, config] = await Promise.all([
      getPublishedComps(),
      getSiteConfig(),
    ]);
    return { comps, currentPatchId: config?.currentPatchId ?? null };
  },
  ["tierlist-page-data"],
  { tags: ["tierlist"] },
);

export default async function TierListPage() {
  const { comps, currentPatchId } = await getTierListData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tier List
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As melhores composições de TFT no patch atual, agrupadas por força.
        </p>
      </header>

      {/*
        The Suspense boundary is required because TierListFilters reads the URL
        via `useSearchParams`; the fallback prerenders the full, unfiltered tier
        list so the static HTML still contains all comps.
      */}
      <Suspense
        fallback={
          <TierBands
            groups={groupByTier(comps)}
            currentPatchId={currentPatchId}
          />
        }
      >
        <TierListFilters comps={comps} currentPatchId={currentPatchId} />
      </Suspense>
    </div>
  );
}
