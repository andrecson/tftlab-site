"use server";

/**
 * Comp mutation server actions (US-034).
 *
 * `createComp` / `updateComp` persist a comp's BASE fields + guide text from the
 * admin form. `updateCompComposition` (US-035) persists the trait list + the
 * off-board EARLY/FLEX unit lists. Item/augment priority is US-036 and the CORE
 * board via the builder is US-037. `publishComp` / `unpublishComp` /
 * `archiveComp` (US-038) own a comp's moderation status: `publishComp` enforces
 * FR-20 (name, tier, ≥1 trait, ≥1 carry, non-empty board) before a comp can go
 * live, and all three `revalidateTag` the public tier list + comp page so the
 * change appears immediately.
 *
 * Every mutation is guarded by `requireRole("EDITOR")` (server-only) so an
 * unauthenticated caller can't invoke the action directly. The admin comps list
 * is `force-dynamic`, so it re-reads on navigation — no explicit revalidation is
 * needed here (public-page ISR revalidation on publish is US-038's concern).
 */
import { revalidateTag } from "next/cache";
import { UnitRole } from "@prisma/client";
import type { Tier, Difficulty, AugmentCategory } from "@prisma/client";
import { requireRole } from "@/auth";
import { db } from "@/server/db";
import { clampStars, MAX_ITEMS } from "@/lib/builder";
import { slugify } from "@/lib/slug";
import { isTier } from "@/lib/tiers";

/**
 * Base-field payload submitted by the admin comp form.
 *
 * NOTE: `status` is intentionally NOT here — a comp's moderation state is owned
 * exclusively by the `publishComp`/`unpublishComp`/`archiveComp` lifecycle
 * actions (US-038), which enforce FR-20 before a comp can go live. The base form
 * only edits identity/classification/guide/patch fields.
 */
export interface CompFormInput {
  name: string;
  /** Desired slug; blank falls back to a slug derived from `name`. */
  slug: string;
  tier: Tier;
  situational: boolean;
  playstyle: string;
  difficulty: Difficulty;
  patchIntroducedId: string;
  patchUpdatedId: string | null;
  whenToPlay: string;
  earlyGame: string;
  midGame: string;
  lateGame: string;
  tips: string;
  /** Champion whose icon represents the comp on the tier list (null = none). */
  coverChampionId: string | null;
}

/** Result of a create/update action — a discriminated union for the client. */
export type CompActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

const TIERS: readonly Tier[] = ["S", "A", "B", "C", "X"];
const DIFFICULTIES: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];

/** An empty text field is stored as NULL, not "" (matches seed/optional cols). */
function nullifyBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a stable, unique slug. The base is derived deterministically from the
 * provided slug (or the name as a fallback), so the same input yields the same
 * slug; on a collision with a DIFFERENT comp we append `-2`, `-3`, … until free.
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
async function resolveUniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "comp";
  let candidate = root;
  let n = 2;
  // Bounded by the number of existing collisions; each miss adds a suffix.
  for (;;) {
    const existing = await db.comp.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

/** Shared validation of the enum + required fields; returns an error string. */
function validateInput(input: CompFormInput): string | null {
  if (input.name.trim().length === 0) return "O nome é obrigatório.";
  if (!TIERS.includes(input.tier)) return "Tier inválido.";
  if (!DIFFICULTIES.includes(input.difficulty)) return "Dificuldade inválida.";
  if (!input.patchIntroducedId)
    return "Selecione o patch de introdução.";
  return null;
}

/** Columns shared by create + update (everything except slug/set). */
function baseData(input: CompFormInput) {
  return {
    name: input.name.trim(),
    tier: input.tier,
    situational: input.situational,
    difficulty: input.difficulty,
    playstyle: nullifyBlank(input.playstyle),
    patchIntroducedId: input.patchIntroducedId,
    patchUpdatedId: input.patchUpdatedId || null,
    whenToPlay: nullifyBlank(input.whenToPlay),
    earlyGame: nullifyBlank(input.earlyGame),
    midGame: nullifyBlank(input.midGame),
    lateGame: nullifyBlank(input.lateGame),
    tips: nullifyBlank(input.tips),
    coverChampionId: input.coverChampionId || null,
  };
}

/** Create a new comp from the admin form's base fields. */
export async function createComp(
  input: CompFormInput,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const error = validateInput(input);
  if (error) return { ok: false, error };

  // The comp's set follows its introducing patch (which also proves the patch
  // exists) — keeps every comp aligned to a real, current-set patch.
  const patch = await db.patch.findUnique({
    where: { id: input.patchIntroducedId },
    select: { set: true },
  });
  if (!patch) return { ok: false, error: "Patch de introdução inválido." };

  if (input.patchUpdatedId) {
    const updated = await db.patch.findUnique({
      where: { id: input.patchUpdatedId },
      select: { id: true },
    });
    if (!updated) return { ok: false, error: "Patch de atualização inválido." };
  }

  const slug = await resolveUniqueSlug(input.slug || input.name);

  const comp = await db.comp.create({
    data: {
      ...baseData(input),
      slug,
      set: patch.set,
      // New comps always start as DRAFT (schema default) — publishing requires a
      // complete composition and goes through `publishComp` (FR-20).
    },
    select: { id: true, slug: true },
  });

  return { ok: true, id: comp.id, slug: comp.slug };
}

/** Update an existing comp's base fields. */
export async function updateComp(
  id: string,
  input: CompFormInput,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const existing = await db.comp.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Comp não encontrada." };

  const error = validateInput(input);
  if (error) return { ok: false, error };

  if (input.patchUpdatedId) {
    const updated = await db.patch.findUnique({
      where: { id: input.patchUpdatedId },
      select: { id: true },
    });
    if (!updated) return { ok: false, error: "Patch de atualização inválido." };
  }

  const slug = await resolveUniqueSlug(input.slug || input.name, id);

  // Base/guide fields only — a comp's status/publishedAt are owned by the
  // publish/unpublish/archive lifecycle actions below (US-038).
  await db.comp.update({
    where: { id },
    data: { ...baseData(input), slug },
  });

  // A published comp's public pages are ISR-cached; refresh them when its
  // base/guide/tier fields change so the live site reflects the edit.
  if (existing.status === "PUBLISHED") {
    revalidateTag("tierlist");
    revalidateTag(`comp:${slug}`);
  }

  return { ok: true, id, slug };
}

/**
 * Reassign a single comp's tier (US-046) — the lean mutation behind the admin
 * tier-list editor. Deliberately NOT part of `updateComp`: it touches only
 * `Comp.tier`, so a curator can drag/retier comps in bulk without loading the
 * whole base form. Validates `tier` against the S/A/B/C/X bands (`isTier`) and
 * guards with `requireRole("EDITOR")` like every other action. When the comp is
 * PUBLISHED it revalidates the public tier list + its comp page (same pattern as
 * `updateComp`) so the live site re-buckets it immediately.
 */
export async function setCompTier(
  compId: string,
  tier: Tier,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  if (!isTier(tier)) return { ok: false, error: "Tier inválido." };

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, status: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  await db.comp.update({ where: { id: compId }, data: { tier } });

  // A published comp's public pages are ISR-cached; re-bucket it on the live
  // tier list (and refresh its comp page) when its tier changes.
  if (comp.status === "PUBLISHED") {
    revalidateTag("tierlist");
    revalidateTag(`comp:${comp.slug}`);
  }

  return { ok: true, id: comp.id, slug: comp.slug };
}

/** A trait row submitted by the composition editor: trait + its active level. */
export interface CompTraitInput {
  traitId: string;
  level: number;
}

/**
 * Payload for `updateCompComposition` (US-035). Traits carry a level; the
 * EARLY/FLEX unit lists are just ordered champion ids (off-board units have no
 * board position, stars or items — those belong to the CORE builder, US-037).
 */
export interface CompCompositionInput {
  traits: CompTraitInput[];
  earlyUnitIds: string[];
  flexUnitIds: string[];
}

/** Drop duplicate ids while keeping first-seen order. */
function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Replace a comp's trait list and its off-board EARLY/FLEX unit lists (US-035).
 *
 * Traits are fully replaced; the EARLY/FLEX units are replaced too, but CORE
 * (on-board) units are left untouched — the builder (US-037) owns board
 * positioning/stars/carry/items, so this editor must not clobber them. All ids
 * are validated against the comp's own `set` so a stale/cross-set id can't
 * create a phantom row or trip an FK. `order` follows list position.
 */
export async function updateCompComposition(
  compId: string,
  input: CompCompositionInput,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, set: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  // Traits: dedupe, validate levels, validate they belong to the comp's set.
  const traitEntries = input.traits.filter(
    (t, i, arr) => arr.findIndex((o) => o.traitId === t.traitId) === i,
  );
  for (const t of traitEntries) {
    if (!Number.isInteger(t.level) || t.level < 1) {
      return { ok: false, error: "Nível de sinergia inválido." };
    }
  }
  const traitIds = traitEntries.map((t) => t.traitId);
  if (traitIds.length > 0) {
    const found = await db.trait.count({
      where: { set: comp.set, id: { in: traitIds } },
    });
    if (found !== traitIds.length) {
      return { ok: false, error: "Uma ou mais sinergias são inválidas." };
    }
  }

  // Units: dedupe per role, validate they belong to the comp's set.
  const earlyIds = dedupe(input.earlyUnitIds);
  const flexIds = dedupe(input.flexUnitIds);
  const championIds = dedupe([...earlyIds, ...flexIds]);
  if (championIds.length > 0) {
    const found = await db.champion.count({
      where: { set: comp.set, id: { in: championIds } },
    });
    if (found !== championIds.length) {
      return { ok: false, error: "Uma ou mais unidades são inválidas." };
    }
  }

  await db.$transaction(async (tx) => {
    // Replace all traits (comp-wide).
    await tx.compTrait.deleteMany({ where: { compId } });
    if (traitEntries.length > 0) {
      await tx.compTrait.createMany({
        data: traitEntries.map((t, i) => ({
          compId,
          traitId: t.traitId,
          level: t.level,
          order: i,
        })),
      });
    }

    // Replace only EARLY/FLEX units — CORE (board) units are US-037's domain.
    await tx.compUnit.deleteMany({
      where: { compId, role: { in: [UnitRole.EARLY, UnitRole.FLEX] } },
    });
    const unitData = [
      ...earlyIds.map((championId, i) => ({
        compId,
        championId,
        role: UnitRole.EARLY,
        order: i,
      })),
      ...flexIds.map((championId, i) => ({
        compId,
        championId,
        role: UnitRole.FLEX,
        order: earlyIds.length + i,
      })),
    ];
    if (unitData.length > 0) {
      await tx.compUnit.createMany({ data: unitData });
    }
  });

  return { ok: true, id: comp.id, slug: comp.slug };
}

/** The valid augment-priority categories (matches the `AugmentCategory` enum). */
const AUGMENT_CATEGORIES: readonly AugmentCategory[] = [
  "ECON",
  "ITEMS",
  "COMBAT",
];

/**
 * Payload for `updateCompPriority` (US-036): the overall item-priority list
 * (ordered item ids) and the ordered augment-category preference. Both are just
 * ordered lists — `order` follows list position.
 */
export interface CompPriorityInput {
  itemIds: string[];
  augmentPriority: AugmentCategory[];
}

/**
 * Replace a comp's general item priority (`CompItemPriority`) and set its
 * `augmentPriority` category order (US-036).
 *
 * Item ids are deduped and validated against the comp's own `set` (so a
 * stale/cross-set id can't trip an FK or create a phantom row); the augment
 * categories are deduped and validated against the `AugmentCategory` enum. The
 * `CompItemPriority` rows are fully replaced (`deleteMany` + `createMany`, order
 * = list index) and `augmentPriority` is overwritten — both inside one
 * `$transaction`. The comp's per-unit equipped items and recommended augments
 * (`CompUnitItem` / `CompAugment`) are untouched — those belong to the builder
 * (US-037).
 */
export async function updateCompPriority(
  compId: string,
  input: CompPriorityInput,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, set: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  // Items: dedupe, validate they belong to the comp's set.
  const itemIds = dedupe(input.itemIds);
  if (itemIds.length > 0) {
    const found = await db.item.count({
      where: { set: comp.set, id: { in: itemIds } },
    });
    if (found !== itemIds.length) {
      return { ok: false, error: "Um ou mais itens são inválidos." };
    }
  }

  // Augment categories: validate against the enum, dedupe (keep first order).
  const seenCategory = new Set<string>();
  const augmentPriority: AugmentCategory[] = [];
  for (const category of input.augmentPriority) {
    if (!AUGMENT_CATEGORIES.includes(category)) {
      return { ok: false, error: "Categoria de augment inválida." };
    }
    if (!seenCategory.has(category)) {
      seenCategory.add(category);
      augmentPriority.push(category);
    }
  }

  await db.$transaction(async (tx) => {
    // Replace the whole item-priority list (comp-wide).
    await tx.compItemPriority.deleteMany({ where: { compId } });
    if (itemIds.length > 0) {
      await tx.compItemPriority.createMany({
        data: itemIds.map((itemId, i) => ({ compId, itemId, order: i })),
      });
    }

    // Overwrite the augment-category preference.
    await tx.comp.update({
      where: { id: compId },
      data: { augmentPriority },
    });
  });

  return { ok: true, id: comp.id, slug: comp.slug };
}

/** Payload for one carry in `updateCompCarries`. */
export interface CompCarryInput {
  championId: string;
  starLevel: number;
  /** Recommended item ids in build order (capped at MAX_ITEMS). */
  itemIds: string[];
}

/**
 * Replace a comp's editable carries (`CompCarry` + `CompCarryItem`): each carry
 * is a champion + star level + its recommended items, independent of the board
 * builder. Champions/items are validated against the comp's own set. Rows are
 * fully replaced in one transaction (order = list position). Revalidates the
 * public comp page.
 */
export async function updateCompCarries(
  compId: string,
  carries: CompCarryInput[],
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, set: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  const clean = carries.filter((c) => c.championId);

  const championIds = dedupe(clean.map((c) => c.championId));
  if (championIds.length > 0) {
    const found = await db.champion.count({
      where: { set: comp.set, id: { in: championIds } },
    });
    if (found !== championIds.length) {
      return { ok: false, error: "Um ou mais campeões são inválidos." };
    }
  }

  const allItemIds = dedupe(clean.flatMap((c) => c.itemIds));
  if (allItemIds.length > 0) {
    const found = await db.item.count({
      where: { set: comp.set, id: { in: allItemIds } },
    });
    if (found !== allItemIds.length) {
      return { ok: false, error: "Um ou mais itens são inválidos." };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.compCarry.deleteMany({ where: { compId } }); // cascades items
    for (let i = 0; i < clean.length; i += 1) {
      const carry = clean[i];
      await tx.compCarry.create({
        data: {
          compId,
          championId: carry.championId,
          starLevel: clampStars(carry.starLevel),
          order: i,
          items: {
            create: carry.itemIds
              .slice(0, MAX_ITEMS)
              .map((itemId, j) => ({ itemId, order: j })),
          },
        },
      });
    }
  });

  revalidateComp(comp.slug);
  return { ok: true, id: comp.id, slug: comp.slug };
}

/**
 * Replace a comp's recommended augments (`CompAugment`) — UNLIMITED and owned by
 * this dedicated editor, not the board builder. Augments are validated against
 * the comp's set and fully replaced (order = list position). Revalidates the
 * public comp page.
 */
export async function updateCompAugments(
  compId: string,
  augmentIds: string[],
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, set: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  const ids = dedupe(augmentIds);
  if (ids.length > 0) {
    const found = await db.augment.count({
      where: { set: comp.set, id: { in: ids } },
    });
    if (found !== ids.length) {
      return { ok: false, error: "Um ou mais augments são inválidos." };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.compAugment.deleteMany({ where: { compId } });
    if (ids.length > 0) {
      await tx.compAugment.createMany({
        data: ids.map((augmentId, i) => ({ compId, augmentId, order: i })),
      });
    }
  });

  revalidateComp(comp.slug);
  return { ok: true, id: comp.id, slug: comp.slug };
}

/**
 * FR-20 (revised): a comp may only be PUBLISHED when it has a name, a tier, at
 * least one carry (`CompCarry`) and a non-empty final board (≥1 on-board CORE
 * unit). Returns the list of missing requirements (empty ⇒ publishable).
 */
async function collectPublishBlockers(comp: {
  id: string;
  name: string;
  tier: Tier;
}): Promise<string[]> {
  const [carryCount, boardCount] = await Promise.all([
    db.compCarry.count({ where: { compId: comp.id } }),
    db.compUnit.count({
      where: {
        compId: comp.id,
        role: UnitRole.CORE,
        boardRow: { not: null },
        boardCol: { not: null },
      },
    }),
  ]);

  const blockers: string[] = [];
  if (comp.name.trim().length === 0) blockers.push("nome");
  if (!TIERS.includes(comp.tier)) blockers.push("tier");
  if (carryCount < 1) blockers.push("ao menos 1 carry");
  if (boardCount < 1) blockers.push("board montado no builder");
  return blockers;
}

/** Revalidate the ISR caches a comp's public presence depends on. */
function revalidateComp(slug: string): void {
  // The tier list at `/` (tag `tierlist`) and the comp page `/comps/[slug]`
  // (tag `comp:<slug>`, which also carries `tierlist`).
  revalidateTag("tierlist");
  revalidateTag(`comp:${slug}`);
}

/**
 * Publish a comp (US-038). Enforces FR-20 (`collectPublishBlockers`) so an
 * incomplete comp can't go live, stamps `publishedAt` the first time, and
 * revalidates the public tier list + comp page so the change appears immediately.
 */
export async function publishComp(id: string): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, tier: true, publishedAt: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  const blockers = await collectPublishBlockers(comp);
  if (blockers.length > 0) {
    return {
      ok: false,
      error: `Não é possível publicar. Faltam: ${blockers.join(", ")}.`,
    };
  }

  await db.comp.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      // Stamp the first time the comp goes live; keep the original date after.
      publishedAt: comp.publishedAt ?? new Date(),
    },
  });

  revalidateComp(comp.slug);
  return { ok: true, id, slug: comp.slug };
}

/**
 * Unpublish a comp back to DRAFT (US-038). Revalidates so it disappears from the
 * public tier list and its comp page 404s (the cached data refetch now returns
 * null for a non-PUBLISHED slug).
 */
export async function unpublishComp(id: string): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  await db.comp.update({ where: { id }, data: { status: "DRAFT" } });

  revalidateComp(comp.slug);
  return { ok: true, id, slug: comp.slug };
}

/**
 * Archive a comp (US-038). Like unpublishing it leaves the public surfaces, but
 * keeps the comp out of the curator's active DRAFT queue. Revalidates the public
 * caches so an archived comp no longer appears on the tier list.
 */
export async function archiveComp(id: string): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  await db.comp.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidateComp(comp.slug);
  return { ok: true, id, slug: comp.slug };
}
