/**
 * Tier presentation + grouping — client-safe (US-016).
 *
 * This module holds ONLY pure helpers and presentation constants for the
 * S/A/B/C/X tier bands, so it can be imported from both server components and
 * `"use client"` components. It must NOT import `db`/Prisma runtime code (the
 * `Tier` import below is type-only and erased at build), otherwise the client
 * bundle would pull in the PrismaClient. The DB-backed queries live in
 * `src/server/queries/tierlist.ts`, which re-exports `groupCompsByTier` from
 * here to keep a single source of truth.
 */
import type { Tier } from "@prisma/client";

/** Tier bands in display order (S is strongest, X is situational). */
export const TIER_ORDER: readonly Tier[] = ["S", "A", "B", "C", "X"] as const;

export interface TierGroup<T> {
  tier: Tier;
  comps: T[];
}

/**
 * Group a flat list of comps (anything with a `tier`) into the fixed S/A/B/C/X
 * bands. Every band is always present (possibly empty) and in display order.
 */
export function groupByTier<T extends { tier: Tier }>(
  comps: T[],
): TierGroup<T>[] {
  return TIER_ORDER.map((tier) => ({
    tier,
    comps: comps.filter((comp) => comp.tier === tier),
  }));
}

export interface TierMeta {
  /** Human label for the band (e.g. "S Tier", "Situacional"). */
  label: string;
  /** Full Tailwind class for the tier chip background (never interpolated). */
  chipClass: string;
  /** Full Tailwind class for the tier-colored left border (never interpolated). */
  borderClass: string;
}

/**
 * Per-tier presentation. Class names are written out in full (never
 * interpolated) so Tailwind's content scanner keeps `bg-tier-*`/`border-tier-*`
 * in the build. `X` is the situational band.
 */
export const TIER_META: Record<Tier, TierMeta> = {
  S: { label: "S Tier", chipClass: "bg-tier-s", borderClass: "border-l-tier-s" },
  A: { label: "A Tier", chipClass: "bg-tier-a", borderClass: "border-l-tier-a" },
  B: { label: "B Tier", chipClass: "bg-tier-b", borderClass: "border-l-tier-b" },
  C: { label: "C Tier", chipClass: "bg-tier-c", borderClass: "border-l-tier-c" },
  X: {
    label: "Situacional",
    chipClass: "bg-tier-x",
    borderClass: "border-l-tier-x",
  },
};
