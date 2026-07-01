/**
 * Share-code encoder/decoder for a builder board — client-safe (US-028).
 *
 * The public builder is ephemeral: nothing is written to the server or DB. To
 * let a user share a board by link, the whole board state (units with position,
 * star level and items, plus the board-level augment selection) is serialized
 * into a compact, URL-safe string that lives in the `/builder/[code]` path.
 *
 * Pure module with only client-safe imports (types + helpers from `builder.ts`),
 * so both the `"use client"` builder and the Node test runner can use it. The
 * codec is a JSON payload → UTF-8 bytes → base64url, which round-trips exactly
 * and stays safe in a URL path segment. `decodeBoard` is defensive: any
 * malformed input yields `null` instead of throwing so the route degrades to an
 * empty board rather than crashing.
 */
import {
  BOARD_COLS,
  BOARD_ROWS,
  clampStars,
  MAX_AUGMENTS,
  MAX_ITEMS,
} from "@/lib/builder";
import type { PlacedUnit } from "@/lib/builder";

/**
 * A placed unit as it lives in a share code — everything in `PlacedUnit` except
 * the ephemeral local `id` (regenerated when the board is reloaded) and the
 * admin-only `isCarry` flag (US-037), which the public share code doesn't carry.
 */
export type SharedUnit = Omit<PlacedUnit, "id" | "isCarry">;

/** The complete shareable board state. */
export interface SharedBoard {
  units: SharedUnit[];
  augments: string[];
}

/** Bump when the payload shape changes so old codes can be rejected/migrated. */
const CODE_VERSION = 1;

/**
 * Compact payload: each unit is a positional tuple to keep the code short.
 * `[championId, row, col, stars, items[]]`.
 */
type UnitTuple = [string, number, number, number, string[]];
interface CodePayload {
  v: number;
  u: UnitTuple[];
  a: string[];
}

/* ---- base64url helpers (portable across the browser and Node) ---- */

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(bytesToBinary(bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const normalized = code.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    Math.ceil(normalized.length / 4) * 4,
    "=",
  );
  return new TextDecoder().decode(binaryToBytes(atob(padded)));
}

/* ---- public API ---- */

/** Encode a board into a URL-safe share code. */
export function encodeBoard(board: SharedBoard): string {
  const payload: CodePayload = {
    v: CODE_VERSION,
    u: board.units.map((unit) => [
      unit.championId,
      unit.row,
      unit.col,
      clampStars(unit.stars),
      unit.items.slice(0, MAX_ITEMS),
    ]),
    a: board.augments.slice(0, MAX_AUGMENTS),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** True when `value` is a valid on-board hex coordinate. */
function isHex(row: unknown, col: unknown): row is number {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    (row as number) >= 0 &&
    (row as number) < BOARD_ROWS &&
    (col as number) >= 0 &&
    (col as number) < BOARD_COLS
  );
}

/**
 * Decode a share code back into a board. Returns `null` for anything that is not
 * a well-formed, current-version code. Individual malformed units/ids are
 * dropped defensively (out-of-bounds hexes, non-string ids, duplicate hexes —
 * last one wins), so a crafted code can never place a phantom or overlapping
 * unit.
 */
export function decodeBoard(code: string): SharedBoard | null {
  if (!code) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Partial<CodePayload>;
  if (data.v !== CODE_VERSION) return null;

  const byHex = new Map<string, SharedUnit>();
  const rawUnits = Array.isArray(data.u) ? data.u : [];
  for (const raw of rawUnits) {
    if (!Array.isArray(raw)) continue;
    const [championId, row, col, stars, items] = raw;
    if (typeof championId !== "string" || !championId) continue;
    if (!isHex(row, col)) continue;
    const cleanItems = Array.isArray(items)
      ? items.filter((it): it is string => typeof it === "string").slice(0, MAX_ITEMS)
      : [];
    byHex.set(`${row}-${col}`, {
      championId,
      row: row as number,
      col: col as number,
      stars: clampStars(typeof stars === "number" ? stars : 1),
      items: cleanItems,
    });
  }

  const augments = Array.isArray(data.a)
    ? data.a.filter((it): it is string => typeof it === "string").slice(0, MAX_AUGMENTS)
    : [];

  return { units: Array.from(byHex.values()), augments };
}

/**
 * Materialize decoded units into `PlacedUnit`s with deterministic local ids
 * (`u0`, `u1`, …). Deterministic (index-based) ids are SSR-safe — unlike
 * `crypto.randomUUID()` they don't differ between server render and client
 * hydration — and stay unique against the random ids new placements get.
 */
export function toPlacedUnits(units: readonly SharedUnit[]): PlacedUnit[] {
  return units.map((unit, index) => ({ id: `u${index}`, isCarry: false, ...unit }));
}
