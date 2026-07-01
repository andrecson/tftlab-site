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

/**
 * A champion placed on a builder hex. `id` is a stable local identity for React
 * keys and (US-027) per-unit items/stars; it survives moves and undo/redo. The
 * board never persists server-side, so ids are ephemeral client values.
 */
export interface PlacedUnit {
  id: string;
  championId: string;
  row: number;
  col: number;
}

/**
 * Drag payload prefixes (set as `text/plain` on dragstart) identifying what is
 * being dragged: a champion from the palette, or a unit already on the board.
 */
export const CHAMPION_DND_PREFIX = "metacomps/champion:";
export const UNIT_DND_PREFIX = "metacomps/unit:";

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
