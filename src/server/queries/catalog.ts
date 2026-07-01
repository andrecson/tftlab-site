/**
 * Catalog reads for the builder (US-025).
 *
 * The public builder needs the champion palette of the current set: each
 * champion with its cost, icon and traits (traits drive palette sorting by
 * origin/class and, later, the live synergy panel in US-026). Uses the shared
 * PrismaClient singleton and falls back to SiteConfig for the current set.
 *
 * The return shape is a plain, serializable object (no Prisma model instances,
 * no Date fields) so it can be passed straight from the server page into the
 * `"use client"` builder and cached with `unstable_cache` without surprises.
 */
import { db } from "@/server/db";
import { getCurrentSet } from "@/server/queries/config";

/** A trait attached to a champion in the palette. */
export interface BuilderTrait {
  id: string;
  name: string;
  iconUrl: string;
}

/** A champion in the builder palette, with the traits used for sorting/synergy. */
export interface BuilderChampion {
  /** Surrogate id (cuid) — the stable key used when placing a unit. */
  id: string;
  /** Data Dragon apiId (stable across reseeds within a set). */
  apiId: string;
  name: string;
  cost: number;
  iconUrl: string;
  /** Traits sorted by name; drives the "origem"/"classe" palette sort. */
  traits: BuilderTrait[];
}

/**
 * Fetch every champion of the given set (defaults to the current set from
 * SiteConfig) for the builder palette, with each champion's traits. Ordered by
 * cost then name so the default palette layout is stable. Returns an empty array
 * when no set is configured.
 */
export async function getBuilderChampions(
  set?: string,
): Promise<BuilderChampion[]> {
  const resolvedSet = set ?? (await getCurrentSet());
  if (!resolvedSet) return [];

  const champions = await db.champion.findMany({
    where: { set: resolvedSet },
    orderBy: [{ cost: "asc" }, { name: "asc" }],
    select: {
      id: true,
      apiId: true,
      name: true,
      cost: true,
      iconUrl: true,
      traits: {
        select: {
          trait: { select: { id: true, name: true, iconUrl: true } },
        },
      },
    },
  });

  return champions.map((champion) => ({
    id: champion.id,
    apiId: champion.apiId,
    name: champion.name,
    cost: champion.cost,
    iconUrl: champion.iconUrl,
    traits: champion.traits
      .map(({ trait }) => trait)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
