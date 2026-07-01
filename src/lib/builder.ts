/**
 * Builder board geometry + placed-unit model — client-safe (US-025).
 *
 * Pure constants/types with no imports, shared by the builder board, the main
 * builder client component and (later) the share-code encoder (US-028). Keeping
 * the hex geometry and the `PlacedUnit` shape here means the board layout and the
 * board state have a single source of truth.
 */

/** TFT board is 4 rows × 7 columns of hexes. */
export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;

/** Pointy-top hexagon clip-path — offset + overlapped cells form a honeycomb. */
export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

/** Star levels a placed unit can have (US-026). */
export const MIN_STARS = 1;
export const MAX_STARS = 3;

/** Max items equippable on a single unit, and max board augments (US-027). */
export const MAX_ITEMS = 3;
export const MAX_AUGMENTS = 3;

/**
 * A champion placed on a builder hex. `id` is a stable local identity for React
 * keys and per-unit items; it survives moves and undo/redo. The board never
 * persists server-side, so ids are ephemeral client values. `stars` is the
 * unit's 1–3 star level (US-026), defaulting to 1 when the unit is placed.
 * `items` holds up to `MAX_ITEMS` equipped item ids in slot order (US-027).
 */
export interface PlacedUnit {
  id: string;
  championId: string;
  row: number;
  col: number;
  stars: number;
  items: string[];
}

/**
 * Append an item to a unit's item list, capped at `MAX_ITEMS` (US-027). Returns
 * the list unchanged (a copy) when the unit is already full so callers can skip a
 * no-op history snapshot by comparing lengths.
 */
export function addUnitItem(items: readonly string[], itemId: string): string[] {
  if (items.length >= MAX_ITEMS) return [...items];
  return [...items, itemId];
}

/** Remove the item at `index` from a unit's item list (US-027). */
export function removeUnitItemAt(
  items: readonly string[],
  index: number,
): string[] {
  return items.filter((_, i) => i !== index);
}

/**
 * Toggle a board augment (US-027): remove it if already picked, otherwise add it
 * unless `MAX_AUGMENTS` are already selected (in which case the list is returned
 * unchanged).
 */
export function toggleAugment(
  augments: readonly string[],
  augmentId: string,
): string[] {
  if (augments.includes(augmentId)) {
    return augments.filter((id) => id !== augmentId);
  }
  if (augments.length >= MAX_AUGMENTS) return [...augments];
  return [...augments, augmentId];
}

/** Clamp an arbitrary number to a valid 1–3 star level (rounded, NaN → 1). */
export function clampStars(stars: number): number {
  if (!Number.isFinite(stars)) return MIN_STARS;
  return Math.min(MAX_STARS, Math.max(MIN_STARS, Math.round(stars)));
}

/**
 * Total gold value of the board (US-026). A unit's value scales with its star
 * level the way TFT combines copies: a 2★ unit is worth 3 base copies and a 3★
 * is worth 9, i.e. `cost × 3^(stars-1)`. `costOf` resolves a champion id to its
 * gold cost; unknown/invalid costs are skipped.
 */
export function teamGoldValue(
  units: readonly PlacedUnit[],
  costOf: (championId: string) => number,
): number {
  let total = 0;
  for (const unit of units) {
    const base = costOf(unit.championId);
    if (!Number.isFinite(base) || base <= 0) continue;
    total += base * 3 ** (clampStars(unit.stars) - 1);
  }
  return total;
}

/**
 * Drag payload prefixes (set as `text/plain` on dragstart) identifying what is
 * being dragged: a champion from the palette, a unit already on the board, or an
 * item from the item panel (US-027).
 */
export const CHAMPION_DND_PREFIX = "metacomps/champion:";
export const UNIT_DND_PREFIX = "metacomps/unit:";
export const ITEM_DND_PREFIX = "metacomps/item:";

/** Map key for a hex position. */
export function hexKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Index placed units by their hex position for O(1) lookup while rendering. */
export function unitsByHex(units: readonly PlacedUnit[]): Map<string, PlacedUnit> {
  const map = new Map<string, PlacedUnit>();
  for (const unit of units) map.set(hexKey(unit.row, unit.col), unit);
  return map;
}
