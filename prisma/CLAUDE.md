# prisma/ — schema, migrations & seed

## Seed runner
- The seed (`prisma/seed.ts`) is TypeScript, run by **tsx** (`prisma.seed` in package.json = `tsx prisma/seed.ts`).
- Run it with **`npm run db:seed`** (alias for `prisma db seed`). Do NOT run `./node_modules/.bin/prisma db seed` directly — Prisma spawns `tsx` without `node_modules/.bin` on PATH, so it fails with `spawn tsx ENOENT`. The npm script fixes PATH.
- Needs a live DB (embedded Postgres on :5432) and `.env` `DATABASE_URL`; the migrations must already be applied (`prisma migrate status` clean).
- The `package.json#prisma` deprecation warning is expected on Prisma 6 — ignore it (do not migrate to `prisma.config.ts`, that's a Prisma 7 change we deliberately avoid).

## Seed conventions (catalog, US-009)
- Catalog data comes from `src/server/ddragon.ts` `getCatalog()` (Community Dragon TFT export — see `src/server/CLAUDE.md`). The seed only upserts; all parsing lives in ddragon.ts.
- **Idempotency**: every entity upserts on its natural key `@@unique([apiId, set])` (Prisma `where: { apiId_set: { apiId, set } }`), so re-running never duplicates. Counts are scoped per `set`.
- **Stable foreign keys**: resolve `ChampionTrait` via a deterministic map. Champions reference traits by display NAME, and some names (Set 17 "Stargazer") map to many trait apiIds. Pin each name to one canonical apiId (shortest apiId, then lexicographic) and look the trait id up by apiId — NOT by name. Keying the lookup on a name whose winner is chosen under concurrent batch writes silently accumulates duplicate ChampionTrait rows on every re-seed (verified: 133 → 139). Prove idempotency by seeding twice and diffing the printed counts.
- Future seed stories (US-010 patch/SiteConfig/sample comps) should stamp `set` = the catalog's `set` token (`getCatalog().set`, e.g. `"TFTSet17"`) so SiteConfig/Comp/catalog all agree.

## Seed conventions (patch / SiteConfig / sample comps, US-010)
- `seed.ts` runs `seedCatalog()` first (returns `{ set, setNumber }`) then `seedSampleData(set, setNumber)`. Patches are versioned `${setNumber}.1` (previous) / `${setNumber}.2` (current) and upserted on `version`; SiteConfig is upserted on `id: 1` with `currentPatchId` = current patch.
- **Sample comps reference REAL catalog rows** queried back from the DB (champions ordered by `apiId`, items `type: "COMPLETED"`, augments) — never hardcoded apiIds, so it follows whatever set the catalog seed loaded. Each comp takes a disjoint 12-champion window sorted by `cost` → cheapest become EARLY (off-board, null board coords), most expensive 2 become carries (CORE, on-board, `isCarry`, items); CompTrait levels are the unit-count per trait among the comp's units.
- **Idempotency without upsert**: comps have no natural key besides `slug`, so each is `db.comp.deleteMany({ where: { slug } })` (cascades all children) then a single nested `db.comp.create`. Slugs are deduped within a run (`uniqueSlug`). Re-seeding yields identical comps (verified: 3 comps, same slugs, no drift).
- **Badges depend on patch wiring** (matches US-011 logic): a comp introduced in the current patch ⇒ "Novo"; a comp introduced in the previous patch but `patchUpdated` = current ⇒ "Atualizado". The seed always creates one of each plus one with neither, so the public UI / badge service has data to exercise both states.
- `releasedAt`/`publishedAt` use fixed ISO dates (`2026-06-01` / `2026-06-15`) so re-seeds are stable — don't use `new Date()` (now) for seed timestamps.
