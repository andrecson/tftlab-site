/**
 * Champion cost colours — client-safe (US-025).
 *
 * TFT convention colours a champion by its gold cost (1 gray → 5 gold). Class
 * names are written out in full (never interpolated) so Tailwind's content
 * scanner keeps them. This lives in `src/lib/*` (no server imports) so both the
 * server comp-detail unit list (`comp-units.tsx`) and the `"use client"` builder
 * palette can share ONE source instead of re-declaring the map.
 */

/** Border + text colour classes per cost tier; cost > 5 falls back to gold. */
const COST_STYLE: Record<number, string> = {
  1: "border-slate-400/70 text-slate-200",
  2: "border-emerald-400/70 text-emerald-300",
  3: "border-sky-400/70 text-sky-300",
  4: "border-fuchsia-400/70 text-fuchsia-300",
  5: "border-amber-400/70 text-amber-300",
};

/** Full Tailwind border+text classes for a champion of the given cost. */
export function costClass(cost: number): string {
  return COST_STYLE[cost] ?? "border-amber-400/70 text-amber-300";
}

/** Solid border colour per cost tier, for the palette image outline; > 5 → gold. */
const COST_BORDER: Record<number, string> = {
  1: "border-slate-400",
  2: "border-emerald-400",
  3: "border-sky-400",
  4: "border-fuchsia-400",
  5: "border-amber-400",
};

/** Border-colour class that outlines a champion image by its cost (US: palette). */
export function costBorderClass(cost: number): string {
  return COST_BORDER[cost] ?? "border-amber-400";
}
