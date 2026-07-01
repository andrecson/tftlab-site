/**
 * Synergy engine (US-024) — pure and client-safe.
 *
 * Given the units placed on a board plus each trait's breakpoints (from the
 * catalog), it computes the active traits and their level. It is a plain
 * function with NO imports, so it runs unchanged in server components, the
 * `"use client"` builder (US-025/US-026), and the Node test runner.
 *
 * TFT rule modelled here: a trait counts the number of UNIQUE champions that
 * carry it. Placing the same champion on two hexes, or a champion whose trait
 * list repeats a trait, only counts once toward that trait. A trait is "active"
 * once the unique count reaches its first breakpoint; the active tier is the
 * highest breakpoint reached.
 *
 * The engine is key-agnostic: `SynergyUnit.traits` and `TraitInfo.key` just have
 * to use the SAME string key. The catalog references traits by NAME while the DB
 * references them by id — pick one consistently at the call site and this engine
 * works with either.
 */

/** A champion placed on the board. Position is irrelevant to synergy counting. */
export interface SynergyUnit {
  /** Stable champion identity. Duplicate copies (same id) count once per trait. */
  championId: string;
  /** Trait keys this champion belongs to (matched against `TraitInfo.key`). */
  traits: string[];
}

/** A trait's activation data from the catalog. */
export interface TraitInfo {
  /** Trait key — must match the values used in `SynergyUnit.traits`. */
  key: string;
  /** Display name (e.g. "Mecha"). */
  name: string;
  /** Unit counts that activate successive tiers, e.g. `[2, 4, 6]`. */
  breakpoints: number[];
}

/** An active trait and the level it has reached. */
export interface ActiveTrait {
  key: string;
  name: string;
  /** Unique units carrying the trait — the number shown next to it (e.g. "Mecha 4"). */
  count: number;
  /** The trait's normalized (sorted, distinct, positive) breakpoints. */
  breakpoints: number[];
  /** Highest breakpoint reached, i.e. the active threshold (e.g. 4 for count 5 of `[2,4,6]`). */
  activeBreakpoint: number;
  /** 1-based activation tier = index of `activeBreakpoint` (1 = first style, 2 = second, ...). */
  tier: number;
  /** Next breakpoint above the current count, or null when the top tier is reached. */
  nextBreakpoint: number | null;
  /** Whether the highest breakpoint has been reached. */
  maxed: boolean;
}

/** Sort, drop non-positive, and de-duplicate a trait's breakpoints. */
function normalizeBreakpoints(breakpoints: readonly number[]): number[] {
  return [
    ...new Set(breakpoints.filter((n) => Number.isFinite(n) && n > 0)),
  ].sort((a, b) => a - b);
}

/**
 * Count how many UNIQUE champions carry each trait. Duplicate champions (same
 * `championId`) and repeated traits within one champion are each counted once.
 */
export function countUnitsByTrait(
  units: readonly SynergyUnit[],
): Map<string, number> {
  const seenChampions = new Set<string>();
  const counts = new Map<string, number>();

  for (const unit of units) {
    // A duplicate copy of a champion already on the board adds nothing new.
    if (seenChampions.has(unit.championId)) continue;
    seenChampions.add(unit.championId);

    // `new Set` collapses a trait listed twice on the same champion.
    for (const trait of new Set(unit.traits)) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1);
    }
  }

  return counts;
}

/** Resolve a unique count against a trait's breakpoints; null when inactive. */
function resolveTrait(
  info: TraitInfo,
  count: number,
): ActiveTrait | null {
  const breakpoints = normalizeBreakpoints(info.breakpoints);
  // Inactive: no unit, no breakpoints, or below the first one.
  if (count <= 0 || breakpoints.length === 0 || count < breakpoints[0]) {
    return null;
  }

  let tier = 0;
  for (const bp of breakpoints) {
    if (count >= bp) tier += 1;
    else break;
  }

  const activeBreakpoint = breakpoints[tier - 1];
  const nextBreakpoint = tier < breakpoints.length ? breakpoints[tier] : null;

  return {
    key: info.key,
    name: info.name,
    count,
    breakpoints,
    activeBreakpoint,
    tier,
    nextBreakpoint,
    maxed: nextBreakpoint === null,
  };
}

/**
 * Compute the active traits for a set of placed units.
 *
 * Only traits that reach at least their first breakpoint are returned, sorted
 * for a synergy panel: highest tier first, then highest unit count, then name.
 * Traits present on units but absent from `traits` (unknown breakpoints) are
 * ignored, as are catalog traits with no units.
 */
export function computeSynergies(
  units: readonly SynergyUnit[],
  traits: readonly TraitInfo[],
): ActiveTrait[] {
  const counts = countUnitsByTrait(units);

  const active: ActiveTrait[] = [];
  const seenKeys = new Set<string>();
  for (const info of traits) {
    if (seenKeys.has(info.key)) continue; // ignore duplicate catalog entries
    seenKeys.add(info.key);

    const resolved = resolveTrait(info, counts.get(info.key) ?? 0);
    if (resolved) active.push(resolved);
  }

  active.sort(
    (a, b) =>
      b.tier - a.tier || b.count - a.count || a.name.localeCompare(b.name),
  );

  return active;
}
