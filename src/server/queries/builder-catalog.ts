/**
 * Cached catalog bundle for the builder (US-028).
 *
 * Both `/builder` and the shared `/builder/[code]` route need the same
 * champion/trait/item/augment catalog. Wrapping it in one `unstable_cache` entry
 * (tag `catalog`, so a reseed refreshes it) keeps a single source and one cache
 * key across both routes. All four queries return plain, Date-free objects, so
 * the JSON cache is safe.
 */
import { unstable_cache } from "next/cache";

import {
  getBuilderAugments,
  getBuilderChampions,
  getBuilderItems,
  getBuilderTraits,
} from "@/server/queries/catalog";

export const getBuilderCatalog = unstable_cache(
  async () => ({
    champions: await getBuilderChampions(),
    traits: await getBuilderTraits(),
    items: await getBuilderItems(),
    augments: await getBuilderAugments(),
  }),
  ["builder-catalog"],
  { tags: ["catalog"] },
);
