import { db } from "./db";
import { getCatalog, type CdragonChannel } from "./ddragon";

/**
 * On-demand TFT catalog import.
 *
 * `importCatalog` re-fetches the current set's Champion / Item / Trait / Augment
 * catalog from the Data Dragon (Community Dragon TFT export) and upserts it into
 * the DB, plus the champion↔trait links. Idempotent — upserts key on `apiId`+
 * `set`, so it is safe to run repeatedly (the seed uses it, an admin action uses
 * it, and a CLI script uses it).
 *
 * NOTE: callers that serve a CACHED catalog (the builder wraps it in
 * `unstable_cache` tagged `catalog`) must `revalidateTag("catalog")` afterwards
 * so the change shows immediately; the admin editors are `force-dynamic` and
 * pick it up on the next navigation with no revalidation needed.
 */

/** Counts written by a catalog import (for logging / the admin toast). */
export interface CatalogImportResult {
  /** Which Community Dragon channel the data came from. */
  channel: CdragonChannel;
  set: string;
  setNumber: number;
  champions: number;
  items: number;
  traits: number;
  augments: number;
  championTraits: number;
}

/** Run an async op over `rows` in bounded-concurrency batches. */
async function inBatches<T>(
  rows: T[],
  size: number,
  op: (row: T) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await Promise.all(rows.slice(i, i + size).map(op));
  }
}

export async function importCatalog(
  channel: CdragonChannel = "latest",
): Promise<CatalogImportResult> {
  const catalog = await getCatalog({ channel });
  const { set } = catalog;

  // Traits first so champions can resolve their trait ids. Upsert is keyed by
  // apiId, so each trait's row id is stable across runs; build apiId -> id.
  const traitIdByApiId = new Map<string, string>();
  await inBatches(catalog.traits, 25, async (t) => {
    const row = await db.trait.upsert({
      where: { apiId_set: { apiId: t.apiId, set } },
      create: {
        apiId: t.apiId,
        name: t.name,
        iconUrl: t.iconUrl,
        set,
        breakpoints: t.breakpoints,
      },
      update: { name: t.name, iconUrl: t.iconUrl, breakpoints: t.breakpoints },
    });
    traitIdByApiId.set(t.apiId, row.id);
  });

  // Champions reference traits by display NAME, and a few names map to several
  // trait variants. Pin each name to one canonical apiId deterministically
  // (shortest apiId, then lexicographic => the base trait) so champion<->trait
  // links are identical on every re-import (idempotency).
  const canonicalApiIdByTraitName = new Map<string, string>();
  for (const t of catalog.traits) {
    const current = canonicalApiIdByTraitName.get(t.name);
    if (
      current === undefined ||
      t.apiId.length < current.length ||
      (t.apiId.length === current.length && t.apiId < current)
    ) {
      canonicalApiIdByTraitName.set(t.name, t.apiId);
    }
  }

  await inBatches(catalog.items, 25, (it) =>
    db.item.upsert({
      where: { apiId_set: { apiId: it.apiId, set } },
      create: {
        apiId: it.apiId,
        name: it.name,
        iconUrl: it.iconUrl,
        type: it.type,
        set,
      },
      update: { name: it.name, iconUrl: it.iconUrl, type: it.type },
    }),
  );

  await inBatches(catalog.augments, 25, (a) =>
    db.augment.upsert({
      where: { apiId_set: { apiId: a.apiId, set } },
      create: {
        apiId: a.apiId,
        name: a.name,
        iconUrl: a.iconUrl,
        tier: a.tier,
        set,
      },
      update: { name: a.name, iconUrl: a.iconUrl, tier: a.tier },
    }),
  );

  // Champions + their ChampionTrait edges.
  await inBatches(catalog.champions, 20, async (c) => {
    const champion = await db.champion.upsert({
      where: { apiId_set: { apiId: c.apiId, set } },
      create: {
        apiId: c.apiId,
        name: c.name,
        cost: c.cost,
        iconUrl: c.iconUrl,
        set,
      },
      update: { name: c.name, cost: c.cost, iconUrl: c.iconUrl },
    });
    for (const traitName of c.traitNames) {
      const apiId = canonicalApiIdByTraitName.get(traitName);
      const traitId = apiId ? traitIdByApiId.get(apiId) : undefined;
      if (!traitId) continue;
      await db.championTrait.upsert({
        where: { championId_traitId: { championId: champion.id, traitId } },
        create: { championId: champion.id, traitId },
        update: {},
      });
    }
  });

  const [champions, items, traits, augments, championTraits] = await Promise.all(
    [
      db.champion.count({ where: { set } }),
      db.item.count({ where: { set } }),
      db.trait.count({ where: { set } }),
      db.augment.count({ where: { set } }),
      db.championTrait.count(),
    ],
  );

  return {
    channel,
    set,
    setNumber: catalog.setNumber,
    champions,
    items,
    traits,
    augments,
    championTraits,
  };
}
