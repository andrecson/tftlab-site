"use server";

/**
 * Final-board mutation server action (US-037).
 *
 * `saveCompBoard` persists the admin builder's board for one comp: the on-board
 * CORE units (position + star level + carry flag), each unit's equipped items
 * (`CompUnitItem`) and the comp's recommended augments (`CompAugment`). Writing
 * these makes the admin builder the authoritative editor of the "final board"
 * that the public comp page renders (board view, carries, per-unit items,
 * recommended augments) — parity by construction.
 *
 * It touches ONLY CORE units and the augment list: the off-board EARLY/FLEX
 * units and their trait/item priority belong to the composition/priority editors
 * (US-035/036), so it must not clobber them. Guarded by `requireRole` like every
 * mutation, and every catalog id is validated against the comp's OWN set before
 * writing so a stale/cross-set id can't trip an FK or place a phantom unit.
 */
import { UnitRole } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { requireRole } from "@/auth";
import {
  BOARD_COLS,
  BOARD_ROWS,
  clampStars,
  MAX_ITEMS,
} from "@/lib/builder";
import { db } from "@/server/db";
import type { CompActionResult } from "@/actions/comps";

/** One on-board CORE unit as submitted by the admin builder. */
export interface CompBoardUnitInput {
  championId: string;
  /** 0-based board row (0–3). */
  row: number;
  /** 0-based board column (0–6). */
  col: number;
  /** 1–3 star level. */
  stars: number;
  isCarry: boolean;
  /** Equipped item ids, in slot order (capped at `MAX_ITEMS`). */
  items: string[];
}

/** Payload for `saveCompBoard` (US-037): the CORE board + recommended augments. */
export interface CompBoardInput {
  units: CompBoardUnitInput[];
  augmentIds: string[];
}

/** Drop duplicate ids while keeping first-seen order. */
function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/** Keep only non-empty string ids. */
function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Persist the admin builder's final board for a comp (US-037). Replaces the
 * comp's CORE `CompUnit`s (and their `CompUnitItem`s, via cascade) and its
 * `CompAugment` list wholesale inside one `$transaction`; EARLY/FLEX units,
 * traits and item priority are left untouched.
 */
export async function saveCompBoard(
  compId: string,
  input: CompBoardInput,
): Promise<CompActionResult> {
  await requireRole("EDITOR");

  const comp = await db.comp.findUnique({
    where: { id: compId },
    select: { id: true, slug: true, set: true },
  });
  if (!comp) return { ok: false, error: "Comp não encontrada." };

  // Normalize + validate units. Board positions must be in-bounds; a hex holds
  // at most one unit (last wins, like the share-code decoder), matching the
  // `@@unique([compId, boardRow, boardCol])` constraint. Stars are clamped and
  // items capped defensively so a malformed payload can't write bad rows.
  const byHex = new Map<string, CompBoardUnitInput>();
  for (const unit of input.units) {
    if (
      typeof unit.championId !== "string" ||
      unit.championId.length === 0
    ) {
      return { ok: false, error: "Unidade inválida no tabuleiro." };
    }
    if (
      !Number.isInteger(unit.row) ||
      !Number.isInteger(unit.col) ||
      unit.row < 0 ||
      unit.row >= BOARD_ROWS ||
      unit.col < 0 ||
      unit.col >= BOARD_COLS
    ) {
      return { ok: false, error: "Posição de tabuleiro inválida." };
    }
    byHex.set(`${unit.row}-${unit.col}`, {
      championId: unit.championId,
      row: unit.row,
      col: unit.col,
      stars: clampStars(unit.stars),
      isCarry: Boolean(unit.isCarry),
      items: cleanIds(unit.items).slice(0, MAX_ITEMS),
    });
  }
  const units = Array.from(byHex.values());

  // Validate every referenced catalog id against the comp's OWN set.
  const championIds = dedupe(units.map((u) => u.championId));
  if (championIds.length > 0) {
    const found = await db.champion.count({
      where: { set: comp.set, id: { in: championIds } },
    });
    if (found !== championIds.length) {
      return { ok: false, error: "Uma ou mais unidades são inválidas." };
    }
  }

  const itemIds = dedupe(units.flatMap((u) => u.items));
  if (itemIds.length > 0) {
    const found = await db.item.count({
      where: { set: comp.set, id: { in: itemIds } },
    });
    if (found !== itemIds.length) {
      return { ok: false, error: "Um ou mais itens são inválidos." };
    }
  }

  // Recommended augments for the comp guide are uncapped (unlimited).
  const augmentIds = dedupe(cleanIds(input.augmentIds));
  if (augmentIds.length > 0) {
    const found = await db.augment.count({
      where: { set: comp.set, id: { in: augmentIds } },
    });
    if (found !== augmentIds.length) {
      return { ok: false, error: "Um ou mais augments são inválidos." };
    }
  }

  await db.$transaction(async (tx) => {
    // Replace only CORE (on-board) units — deleting a CompUnit cascades its
    // CompUnitItems. EARLY/FLEX units are the composition editor's domain.
    await tx.compUnit.deleteMany({ where: { compId, role: UnitRole.CORE } });
    // Replace the recommended augments wholesale.
    await tx.compAugment.deleteMany({ where: { compId } });

    let carryOrder = 0;
    for (let i = 0; i < units.length; i += 1) {
      const unit = units[i];
      await tx.compUnit.create({
        data: {
          compId,
          championId: unit.championId,
          role: UnitRole.CORE,
          isCarry: unit.isCarry,
          carryOrder: unit.isCarry ? carryOrder++ : null,
          starLevel: unit.stars,
          boardRow: unit.row,
          boardCol: unit.col,
          order: i,
          items: {
            create: unit.items.map((itemId, slot) => ({
              itemId,
              order: slot,
            })),
          },
        },
      });
    }

    if (augmentIds.length > 0) {
      await tx.compAugment.createMany({
        data: augmentIds.map((augmentId, i) => ({
          compId,
          augmentId,
          order: i,
        })),
      });
    }
  });

  // Board edits change what the public comp page renders (board, carries,
  // per-unit items, recommended augments) — refresh its ISR cache + tier list.
  revalidateTag(`comp:${comp.slug}`);
  revalidateTag("tierlist");

  return { ok: true, id: comp.id, slug: comp.slug };
}
