/**
 * Badge derivation for comps (US-011).
 *
 * A comp is "Novo" (new) when it was introduced in the current patch, and
 * "Atualizado" (updated) when it was touched in the current patch but NOT
 * introduced in it. "Novo" takes precedence over "Atualizado" — a comp that
 * is both introduced and updated in the current patch only shows "Novo".
 */

/** Minimal shape needed to derive badges; a full Prisma `Comp` satisfies this. */
export interface BadgeComp {
  /** Patch the comp was introduced in (required relation, never null). */
  patchIntroducedId: string;
  /** Patch the comp was last updated in, if any. */
  patchUpdatedId: string | null;
}

export interface CompBadges {
  isNew: boolean;
  isUpdated: boolean;
}

/**
 * Derive the `{ isNew, isUpdated }` badge state for a comp relative to the
 * current patch.
 *
 * - `isNew`     = comp introduced in the current patch.
 * - `isUpdated` = comp updated in the current patch AND not new (Novo wins).
 *
 * When `currentPatchId` is null/undefined (no patch configured yet) both
 * badges are false — this also avoids a `null === null` false-positive when a
 * comp has no `patchUpdatedId`.
 */
export function getCompBadges(
  comp: BadgeComp,
  currentPatchId: string | null | undefined,
): CompBadges {
  if (currentPatchId == null) {
    return { isNew: false, isUpdated: false };
  }

  const isNew = comp.patchIntroducedId === currentPatchId;
  const isUpdated = comp.patchUpdatedId === currentPatchId && !isNew;

  return { isNew, isUpdated };
}
