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
import type { ItemType } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentSet } from "@/server/queries/config";

/** A trait attached to a champion in the palette. */
export interface BuilderTrait {
  id: string;
  name: string;
  iconUrl: string;
}

/** An item for the builder item panel (US-027). */
export interface BuilderItem {
  id: string;
  apiId: string;
  name: string;
  iconUrl: string;
  /** Drives the item panel tabs (craftables/radiants/artifacts/…). */
  type: ItemType;
}

/** An augment for the builder augment picker (US-027). */
export interface BuilderAugment {
  id: string;
  apiId: string;
  name: string;
  iconUrl: string;
  tier: string | null;
}

/** A trait with its activation breakpoints, for the builder synergy panel (US-026). */
export interface BuilderTraitInfo {
  id: string;
  name: string;
  iconUrl: string;
  /** Unit counts that activate successive tiers, e.g. `[2, 4, 6]`. */
  breakpoints: number[];
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

/** Coerce a `Trait.breakpoints` Json value into a numeric breakpoint array. */
function toBreakpoints(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((n): n is number => typeof n === "number" && n > 0);
}

/**
 * Fetch every trait of the given set (defaults to the current set) with its
 * activation breakpoints, keyed by the same `id` that `getBuilderChampions`
 * exposes on each champion trait. The builder's synergy panel (US-026) maps
 * these into `TraitInfo` (`key = id`) for `computeSynergies`. Returns plain
 * serializable objects (no Prisma instances / Dates) so it survives
 * `unstable_cache` and can be handed to a `"use client"` component as props.
 */
export async function getBuilderTraits(
  set?: string,
): Promise<BuilderTraitInfo[]> {
  const resolvedSet = set ?? (await getCurrentSet());
  if (!resolvedSet) return [];

  const traits = await db.trait.findMany({
    where: { set: resolvedSet },
    orderBy: { name: "asc" },
    select: { id: true, name: true, iconUrl: true, breakpoints: true },
  });

  return traits.map((trait) => ({
    id: trait.id,
    name: trait.name,
    iconUrl: trait.iconUrl,
    breakpoints: toBreakpoints(trait.breakpoints),
  }));
}

/**
 * Fetch every item of the given set (defaults to the current set) for the
 * builder item panel (US-027), ordered by name. Returns plain serializable
 * objects (no Prisma instances / Dates) so it survives `unstable_cache` and can
 * be handed to the `"use client"` builder as props. The `type` field drives the
 * panel's tabs (craftables/radiants/artifacts/components/others).
 */
/**
 * Champion-token / placeholder rows that live in the Item table but are NOT
 * equippable items — they must not appear in the builder/guide item pickers:
 *  - "Chosen champion" items (apiId `..._ChampionItem_...`), named like champions
 *    ("1-cost: Aatrox") — these made the item list look like the champion list.
 *  - Champion loot tokens ("2-star 1-cost: Veigar", "3-star Illaoi").
 *  - Untranslated placeholder keys ("TFT_item_name_Yuumi").
 */
function isEquippableItem(item: { apiId: string; name: string }): boolean {
  if (item.apiId.includes("ChampionItem")) return false;
  if (/cost:/i.test(item.name)) return false;
  if (/^\d+-star\b/i.test(item.name)) return false;
  if (/^TFT[\w]*_/i.test(item.name)) return false;
  return true;
}

/** Lower is more canonical: base item preferred over Corrupted/Radiant variants. */
function itemVariantScore(apiId: string): number {
  let score = 0;
  if (/corrupted/i.test(apiId)) score += 2;
  if (/radiant/i.test(apiId)) score += 1;
  return score;
}

/** True if `a` is a more canonical variant than `b` for the same display name. */
function isMoreCanonicalItem(
  a: { apiId: string },
  b: { apiId: string },
): boolean {
  const sa = itemVariantScore(a.apiId);
  const sb = itemVariantScore(b.apiId);
  if (sa !== sb) return sa < sb;
  if (a.apiId.length !== b.apiId.length) return a.apiId.length < b.apiId.length;
  return a.apiId < b.apiId;
}

export async function getBuilderItems(set?: string): Promise<BuilderItem[]> {
  const resolvedSet = set ?? (await getCurrentSet());
  if (!resolvedSet) return [];

  const items = await db.item.findMany({
    where: { set: resolvedSet },
    orderBy: { name: "asc" },
    select: { id: true, apiId: true, name: true, iconUrl: true, type: true },
  });

  // Drop champion tokens / placeholders (issue: item list showed champions),
  // then collapse duplicate display names — Corrupted/Radiant variants share a
  // name — to a single canonical entry (issue: duplicate items in the builder).
  const byName = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    if (!isEquippableItem(item)) continue;
    const existing = byName.get(item.name);
    if (!existing || isMoreCanonicalItem(item, existing)) {
      byName.set(item.name, item);
    }
  }

  return [...byName.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      apiId: item.apiId,
      name: item.name,
      iconUrl: item.iconUrl,
      type: item.type,
    }));
}

/**
 * Fetch every augment of the given set (defaults to the current set) for the
 * builder augment picker (US-027), ordered by name. Returns plain serializable
 * objects so it survives `unstable_cache` and can be passed to a `"use client"`
 * component as props.
 */
export async function getBuilderAugments(
  set?: string,
): Promise<BuilderAugment[]> {
  const resolvedSet = set ?? (await getCurrentSet());
  if (!resolvedSet) return [];

  const augments = await db.augment.findMany({
    where: { set: resolvedSet },
    orderBy: { name: "asc" },
    select: { id: true, apiId: true, name: true, iconUrl: true, tier: true },
  });

  return augments.map((augment) => ({
    id: augment.id,
    apiId: augment.apiId,
    name: augment.name,
    iconUrl: augment.iconUrl,
    tier: augment.tier,
  }));
}
