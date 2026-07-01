/**
 * CLI: re-import the TFT catalog on demand.
 *
 *   npm run catalog:import
 *
 * Upserts champions/items/traits/augments from the source (Community Dragon TFT
 * export) into the DB — the SAME `importCatalog()` the seed and the admin
 * "Re-importar catálogo" button use. Idempotent.
 *
 * Refresh note: the admin comp editors are force-dynamic and pick up the new
 * catalog on the next load. The PUBLIC builder caches the catalog (`unstable_cache`
 * tag `catalog`); a CLI run cannot revalidate a running server's cache, so use
 * the admin button (it revalidates) or restart/redeploy the app to refresh the
 * builder immediately — otherwise it refreshes on its ISR interval.
 */
import { importCatalog } from "../src/server/catalog-import";

async function main(): Promise<void> {
  console.log("Re-importando catálogo TFT (Community Dragon)...");
  const r = await importCatalog();
  console.log(
    `OK — set ${r.set} (#${r.setNumber}): ${r.champions} campeões, ` +
      `${r.items} itens, ${r.augments} augments, ${r.traits} traits, ` +
      `${r.championTraits} vínculos campeão↔trait.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha ao importar catálogo:", err);
    process.exit(1);
  });
