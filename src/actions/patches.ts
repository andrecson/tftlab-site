"use server";

/**
 * Patch-flow server actions (US-039).
 *
 * `createPatch` records a new balance version for a set. `setCurrentPatch`
 * switches the site's "current patch" (the singleton `SiteConfig`) and, before
 * doing so, stamps a `CompTierSnapshot` of the OUTGOING patch's tier for every
 * published comp — freezing that patch's tier history. Because the public
 * Novo/Atualizado badges derive from `SiteConfig.currentPatchId`, switching the
 * patch revalidates the `tierlist` tag so the tier list and every comp page
 * (both carry that tag) re-derive their badges from the new state.
 *
 * Like the comp actions, every export is guarded by `requireRole("EDITOR")`
 * (a `"use server"` function is a public endpoint) and returns a discriminated
 * result instead of throwing, so the admin forms can show inline validation.
 */
import { revalidateTag } from "next/cache";
import { requireRole } from "@/auth";
import { db } from "@/server/db";

/** Result of a patch action — a discriminated union for the client forms. */
export type PatchActionResult =
  | { ok: true; id: string; snapshotCount?: number }
  | { ok: false; error: string };

/** Payload for `createPatch` (the admin "new patch" form). */
export interface CreatePatchInput {
  /** Balance version, unique across the DB (e.g. "17.3"). */
  version: string;
  /** Release date as an ISO `yyyy-mm-dd` string (from `<input type="date">`). */
  releasedAt: string;
  /** Set token the patch belongs to (defaults to the current set in the UI). */
  set: string;
}

/**
 * Parse a `yyyy-mm-dd` date string to a UTC-midnight `Date`. Returns null on a
 * malformed/invalid date. UTC midnight keeps the stored value stable regardless
 * of the server timezone (matches the UTC date formatting used across the UI).
 */
function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Create a new patch (US-039). Validates a non-empty version + set and a valid
 * release date, and rejects a duplicate version with a friendly message (rather
 * than letting the `@@unique(version)` constraint throw a raw P2002). Creating a
 * patch changes no public page (no comp references it yet), so no revalidation
 * is needed — the admin page is `force-dynamic` and re-reads on `router.refresh`.
 */
export async function createPatch(
  input: CreatePatchInput,
): Promise<PatchActionResult> {
  await requireRole("EDITOR");

  const version = input.version.trim();
  if (version.length === 0) return { ok: false, error: "A versão é obrigatória." };

  const set = input.set.trim();
  if (set.length === 0) return { ok: false, error: "O set é obrigatório." };

  const releasedAt = parseIsoDate(input.releasedAt);
  if (!releasedAt) return { ok: false, error: "Data de lançamento inválida." };

  const existing = await db.patch.findUnique({
    where: { version },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Já existe um patch com a versão "${version}".` };
  }

  const patch = await db.patch.create({
    data: { version, set, releasedAt },
    select: { id: true },
  });

  return { ok: true, id: patch.id };
}

/**
 * Set the current patch (US-039).
 *
 * Before switching, every published comp of the OUTGOING patch's set gets a
 * `CompTierSnapshot` pinned to the outgoing patch id, capturing its tier at that
 * patch (upsert on the `@@unique([compId, patchId])` key, so re-running is
 * idempotent). Then the `SiteConfig` singleton is repointed at the new patch
 * (keeping `currentSet` aligned to the patch's set). Snapshots + the config
 * update run in ONE `$transaction`.
 *
 * Finally `revalidateTag("tierlist")` refreshes the public tier list AND every
 * comp page (each comp-detail cache entry also carries the `tierlist` tag), so
 * the Novo/Atualizado badges re-derive from the new `currentPatchId`.
 */
export async function setCurrentPatch(
  patchId: string,
): Promise<PatchActionResult> {
  await requireRole("EDITOR");

  const patch = await db.patch.findUnique({
    where: { id: patchId },
    select: { id: true, set: true },
  });
  if (!patch) return { ok: false, error: "Patch não encontrado." };

  const config = await db.siteConfig.findUnique({
    where: { id: 1 },
    select: { currentPatchId: true, currentSet: true },
  });
  const previousPatchId = config?.currentPatchId ?? null;
  const previousSet = config?.currentSet ?? null;

  // Snapshot the outgoing patch's tier ratings — only when there is a real,
  // different outgoing patch (first-ever set or re-selecting the same patch has
  // nothing to freeze).
  const shouldSnapshot = previousPatchId !== null && previousPatchId !== patchId;
  const publishedComps = shouldSnapshot
    ? await db.comp.findMany({
        where: {
          status: "PUBLISHED",
          ...(previousSet ? { set: previousSet } : {}),
        },
        select: { id: true, tier: true },
      })
    : [];

  await db.$transaction(async (tx) => {
    if (shouldSnapshot && previousPatchId) {
      for (const comp of publishedComps) {
        await tx.compTierSnapshot.upsert({
          where: {
            compId_patchId: { compId: comp.id, patchId: previousPatchId },
          },
          create: { compId: comp.id, patchId: previousPatchId, tier: comp.tier },
          update: { tier: comp.tier },
        });
      }
    }

    // Repoint the singleton config at the new patch; its set follows the patch.
    await tx.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1, currentSet: patch.set, currentPatchId: patch.id },
      update: { currentSet: patch.set, currentPatchId: patch.id },
    });
  });

  // The tier list (`/`) and every comp page carry the `tierlist` cache tag, and
  // both read `currentPatchId` for the badges — one revalidate refreshes all.
  revalidateTag("tierlist");

  return { ok: true, id: patch.id, snapshotCount: publishedComps.length };
}
