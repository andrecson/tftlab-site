# src/actions/ — server actions (mutations)

Write-side counterpart to `src/server/queries/` (reads). Every file starts with
`"use server"` and holds the admin form mutations. Conventions (established in
US-034, reuse for US-035..039):

- **Guard first.** Every exported action calls `await requireRole("EDITOR")` (from
  `@/auth`) at the top before touching the DB — a `"use server"` function is a
  public POST endpoint, so it must re-check auth even though the admin layout
  already guards the page. Use `requireRole("ADMIN")` for privileged actions.
- **Return a discriminated result, don't throw for validation.** Actions return
  `{ ok: true; ... } | { ok: false; error: string }` (e.g. `CompActionResult`).
  The client form (`"use client"`, `useState` — React 18.3 has no
  `useActionState`) awaits the action, shows `result.error` inline on `!ok`, and
  `router.push(...)` + `router.refresh()` on `ok`. Mirror the login-form pattern.
- **Client imports the action + its input type directly.** A `"use server"` file
  can export `interface`/`type` (e.g. `CompFormInput`) alongside the async
  functions; the client `import { createComp, type CompFormInput }`s them. This
  is the only sanctioned way a client component talks to Prisma — NEVER import
  `@/server/db` or `@/server/queries/*` into a `"use client"` component.
- **Stable + unique slugs:** `slugify(base)` (from `@/lib/slug`, pure/client-safe
  so the form previews the same value the action writes) then loop appending
  `-2`, `-3`, … on a `db.comp.findUnique({ where: { slug } })` collision;
  `resolveUniqueSlug(base, excludeId?)` lets an update keep its own slug. Empty
  optional text fields are stored as `null` (`nullifyBlank`), not `""`.
- **A comp's `set` follows its `patchIntroduced.set`** (fetch the patch — this
  also validates it exists), so every comp stays aligned to a real current-set
  patch without a separate set field on the form. `updateComp` leaves `set`
  untouched.
- **Status is owned by the lifecycle actions, NOT the base form (US-038).**
  `CompFormInput` has NO `status` field — `createComp` always creates a `DRAFT`
  (schema default; a fresh comp has no composition so it can't be publishable),
  and `updateComp` never touches `status`/`publishedAt`. A comp's moderation
  state is changed only by `publishComp` / `unpublishComp` / `archiveComp`
  (below). This closes the FR-20 bypass (the old form Status select could set
  `PUBLISHED` unvalidated) and avoids the classic "stale client `status` state
  after `router.refresh()` re-writes the old status on the next base save" bug.
- **Publish/unpublish/archive + ISR revalidation (US-038).** `publishComp(id)`
  enforces FR-20 via `collectPublishBlockers(comp)` — returns the list of missing
  requirements (name, tier, `db.compTrait.count ≥ 1`, `db.compUnit.count` with
  `isCarry ≥ 1`, and `db.compUnit.count` with `role: CORE` + non-null
  `boardRow/boardCol ≥ 1` = non-empty final board); a non-empty list ⇒
  `{ ok: false, error: "Não é possível publicar. Faltam: …" }` so the UI shows
  exactly what to fill in. On success it sets `PUBLISHED` (stamping `publishedAt`
  only the first time) and revalidates. `unpublishComp`→`DRAFT`,
  `archiveComp`→`ARCHIVED` (no validation). ALL THREE call the shared
  `revalidateComp(slug)` helper = `revalidateTag("tierlist")` +
  `revalidateTag("comp:"+slug)` (from `next/cache`) so the public tier list (`/`)
  and the comp page (`/comps/[slug]`) refresh immediately — unpublish/archive
  make the comp drop off the list and its page 404 (the cached `getCompBySlug`
  refetch now returns null for a non-PUBLISHED slug). `updateComp` ALSO calls
  `revalidateComp` after a save when `existing.status === "PUBLISHED"`, so editing
  a live comp's guide/tier reflects on the public site (a tier change re-buckets
  it via the `tierlist` tag). GOTCHA verified in the browser: `revalidateTag`
  cleaned up a *stale phantom* comp that had been deleted straight from the DB
  (its `tierlist` cache entry regenerated from the live DB) — direct DB writes
  don't revalidate, only these actions do. UI: the `"use client"`
  `<CompStatusControls comp={{id,slug,status}}>` (`src/components/admin/`) on the
  edit page renders context-aware buttons (Publicar / Despublicar / Arquivar /
  Voltar para rascunho) and shows the blocker error inline; it keeps `status` in
  local `useState` (source of truth for which buttons show — `router.refresh()`
  re-runs the force-dynamic page but does NOT reinit client state) and flips it
  optimistically on success.
- **Lean single-field mutation + tier list retier (US-046).** `setCompTier(compId,
  tier)` in `comps.ts` is a focused action for the admin tier-list editor
  (`/admin/tier-list`, US-047): it validates `tier` against the S/A/B/C/X bands
  via `isTier` (from `@/lib/tiers`, a pure client-safe type guard added in US-046),
  `requireRole("EDITOR")`, then updates ONLY `Comp.tier`. It reuses the exact
  publish/update revalidation shape — when the comp is `PUBLISHED` it calls
  `revalidateTag("tierlist")` + `revalidateTag("comp:"+slug)` so the live tier
  list re-buckets it immediately (a draft's retier touches no public page, so no
  revalidate). Returns `CompActionResult`: `{ ok:false, error }` for an invalid
  tier or a missing comp. Do NOT fold tier-only edits into `updateComp` — this
  bulk-retier path must not load/rewrite the whole base form. The query feeding
  the editor is `getAdminTierListComps()` in `src/server/queries/admin.ts`.
- **Replace-all child collections in a `$transaction` (US-035).**
  `updateCompComposition(compId, { traits, earlyUnitIds, flexUnitIds })` replaces
  the comp's `CompTrait`s and its off-board EARLY/FLEX `CompUnit`s by
  `deleteMany` + `createMany` inside `db.$transaction`, with `order` = list
  index. CRITICAL: scope the unit delete to `role: { in: [UnitRole.EARLY,
  UnitRole.FLEX] }` — CORE (on-board) units, their stars/carry/board coords and
  `CompUnitItem`s belong to the builder (US-037), so a traits/units save must NOT
  wipe them (verified: a CORE carry + its item survive a composition save).
  Multiple off-board units share `boardRow/boardCol = null`, which the
  `@@unique([compId,boardRow,boardCol])` index allows (Postgres NULLs are
  distinct). VALIDATE every id against the comp's OWN `set` (`db.trait.count` /
  `db.champion.count` with `id: { in }` === deduped length) before writing, and
  dedupe ids + require integer `level >= 1`, so a stale/cross-set id can't trip an
  FK or create a phantom row. US-036 (item/augment priority) follows the same
  replace-all-in-a-transaction shape.
- **Item/augment priority (US-036).** `updateCompPriority(compId, { itemIds,
  augmentPriority })` replaces the comp's `CompItemPriority` (`deleteMany` +
  `createMany`, `order` = list index) AND overwrites the scalar
  `Comp.augmentPriority` array — both in one `db.$transaction`. Validate `itemIds`
  against the comp's own `set` (`db.item.count` `id: { in }` === deduped length)
  and validate each augment category against the `AugmentCategory` enum
  (`["ECON","ITEMS","COMBAT"]`), deduping while preserving first-seen order.
  CRITICAL: this action only touches the comp-wide `CompItemPriority` rows and the
  `augmentPriority` column — it must NOT touch per-unit `CompUnitItem`s or the
  recommended-augment `CompAugment` list (those are the builder's, US-037;
  verified a CORE carry's equipped item + a `CompAugment` survive a priority
  save). `augmentPriority` is a subset/ordering of the 3 categories (can be
  empty), NOT a fixed length-3 array.
- **Final board via the builder (US-037).** `saveCompBoard(compId, { units,
  augmentIds })` (in `src/actions/comp-builder.ts`) persists the admin builder's
  board: it replaces the comp's **CORE** `CompUnit`s (position/stars/carry) with
  their nested `CompUnitItem`s and its `CompAugment` list, all in one
  `$transaction`. CRITICAL scope symmetry with US-035: delete `role: CORE` only
  (`deleteMany({ where: { compId, role: UnitRole.CORE } })`) so the composition
  editor's EARLY/FLEX units, `CompTrait`s and `CompItemPriority` survive; deleting
  a `CompUnit` cascades its `CompUnitItem`s so a plain replace works. Create units
  with `db`-nested `items: { create: [...] }` (loop `tx.compUnit.create` — nested
  create can't go through `createMany`); `order` = list index, `carryOrder` = a
  counter incremented only for carries, `boardRow/boardCol` = hex coords,
  `starLevel` = stars. VALIDATE every id against the comp's OWN `set`
  (`db.champion.count`/`db.item.count`/`db.augment.count` `id: { in }` === deduped
  length) and clamp/normalize positions (in-bounds via `BOARD_ROWS`/`BOARD_COLS`,
  one unit per hex last-wins, `clampStars`, items sliced to `MAX_ITEMS`) so a
  malformed payload can't write bad rows. Reuses `CompActionResult` (import the
  type from `@/actions/comps`). Saving the CORE board + per-unit items +
  `CompAugment`s is exactly what the public comp page reads (board view, carries,
  per-unit items, recommended augments) → parity by construction.
- **Patch flow (US-039).** `src/actions/patches.ts` owns the patch lifecycle,
  returning the shared `PatchActionResult` (`{ ok: true; id; snapshotCount? } |
  { ok: false; error }`). `createPatch({ version, releasedAt, set })` validates a
  non-empty version/set + a valid `yyyy-mm-dd` release date (`parseIsoDate` →
  UTC-midnight `Date`, so stored dates are timezone-stable and match the UI's UTC
  formatting) and rejects a duplicate `version` with a friendly message instead
  of letting the `@@unique(version)` constraint throw a raw P2002; it does NOT
  revalidate (a new patch touches no public page; the admin page is
  force-dynamic). `setCurrentPatch(patchId)` is the core action: it reads the
  OUTGOING patch id from `SiteConfig` and, when there is a real, DIFFERENT
  outgoing patch, upserts a `CompTierSnapshot` (key `compId_patchId`, so it's
  idempotent) pinned to the outgoing patch id for every PUBLISHED comp of the
  outgoing set — freezing that patch's tier history — then repoints the
  `SiteConfig` singleton (`upsert` on `id: 1`, `currentSet` follows the patch's
  set), all in ONE `$transaction`. It finishes with a single
  `revalidateTag("tierlist")`: the tier list (`/`) AND every comp page carry that
  tag and both read `currentPatchId` for the Novo/Atualizado badges, so one
  revalidate re-derives all badges from the new state (verified end-to-end: after
  switching the current patch, the previously-Novo/Atualizado cards lose their
  badges; switching back restores them). GOTCHA: snapshot only when
  `previousPatchId !== null && previousPatchId !== patchId` — the first-ever set
  or re-selecting the same patch has nothing to freeze. `snapshotCount` in the
  result lets the UI report how many comps were stamped. UI: the `"use client"`
  `<PatchForm currentSet>` (create) + `<PatchList patches currentPatchId
  publishedCompCount>` (list with a per-row "Definir como atual" button;
  `current` in local `useState` is the source of truth for which row shows the
  "Patch atual" badge — `router.refresh()` re-runs the force-dynamic page but
  does NOT reinit client state, so flip it optimistically), both under
  `src/components/admin/`, mounted at `/admin/patches`.
