/**
 * Public tier-list reads (US-012).
 *
 * `getPublishedComps` returns the PUBLISHED comps of the current set with just
 * the data a CompCard needs (main traits + carries), ready to be grouped into
 * tier bands. Drafts and archived comps are never returned. Uses the shared
 * PrismaClient singleton and falls back to SiteConfig for the current set.
 */
import { Prisma } from "@prisma/client";

import { groupByTier, TIER_ORDER } from "@/lib/tiers";
import type { TierGroup } from "@/lib/tiers";
import { db } from "@/server/db";
import { getCurrentSet } from "@/server/queries/config";

// Re-exported so existing importers of the tier order/grouping via this module
// keep working; the presentation-agnostic helpers themselves live in
// `src/lib/tiers.ts` so client components can use them without pulling in Prisma.
export { TIER_ORDER };

// Only what a card renders: the comp's headline fields (scalars come for free,
// including patchIntroducedId/patchUpdatedId for the badge service), its main
// traits in display order, and its carries with their champion icon.
const compCardInclude = Prisma.validator<Prisma.CompInclude>()({
  traits: {
    orderBy: { order: "asc" },
    include: {
      trait: { select: { id: true, name: true, iconUrl: true } },
    },
  },
  units: {
    where: { isCarry: true },
    orderBy: { carryOrder: "asc" },
    include: {
      champion: { select: { id: true, name: true, iconUrl: true, cost: true } },
    },
  },
  // Champion whose icon represents the comp on the tier list (US: cover).
  coverChampion: { select: { id: true, name: true, iconUrl: true } },
});

/** A PUBLISHED comp shaped for the tier-list card (traits + carries). */
export type CompCard = Prisma.CompGetPayload<{ include: typeof compCardInclude }>;

/**
 * Fetch every PUBLISHED comp of the given set (defaults to the current set from
 * SiteConfig) with its card data, sorted by tier then most-recently published.
 * Returns an empty array when no set is configured. Drafts/archived excluded.
 */
export async function getPublishedComps(set?: string): Promise<CompCard[]> {
  const resolvedSet = set ?? (await getCurrentSet());
  if (!resolvedSet) return [];

  return db.comp.findMany({
    where: { set: resolvedSet, status: "PUBLISHED" },
    include: compCardInclude,
    // Enum order in the DB follows S,A,B,C,X (declaration order); tie-break on
    // recency then name so the list is stable across requests.
    orderBy: [{ tier: "asc" }, { publishedAt: "desc" }, { name: "asc" }],
  });
}

/**
 * Group a flat list of cards into the fixed S/A/B/C/X bands (each band always
 * present, possibly empty) so the tier-list page can render every row. Thin
 * wrapper over the shared `groupByTier` helper.
 */
export function groupCompsByTier(comps: CompCard[]): TierGroup<CompCard>[] {
  return groupByTier(comps);
}
