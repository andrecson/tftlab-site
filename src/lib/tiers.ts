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

/** Tier bands in display order (S is strongest). All five are assignable. */
export const TIER_ORDER: readonly Tier[] = ["S", "A", "B", "C", "X"] as const;

/**
 * Type guard for a tier band — accepts only the S/A/B/C/X strings. Lets a server
 * action validate an untrusted `tier` argument before writing it (US-046
 * `setCompTier`). Pure/client-safe like the rest of this module.
 */
export function isTier(value: unknown): value is Tier {
  return (
    typeof value === "string" &&
    (TIER_ORDER as readonly string[]).includes(value)
  );
}

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
  /** Small caption shown under the big letter in the tier badge. */
  badgeSub: string;
  /** Full Tailwind class for the tier color background (badge + hex rim). */
  chipClass: string;
  /** Full Tailwind class for the tier-colored left border (never interpolated). */
  borderClass: string;
  /** Full Tailwind class for the tier-colored row container border. */
  containerClass: string;
}

/**
 * Per-tier presentation. Class names are written out in full (never
 * interpolated) so Tailwind's content scanner keeps `bg-tier-*`/`border-tier-*`
 * in the build. `X` is the situational band.
 */
export const TIER_META: Record<Tier, TierMeta> = {
  S: {
    label: "S Tier",
    badgeSub: "TIER",
    chipClass: "bg-tier-s",
    borderClass: "border-l-tier-s",
    containerClass: "border-tier-s",
  },
  A: {
    label: "A Tier",
    badgeSub: "TIER",
    chipClass: "bg-tier-a",
    borderClass: "border-l-tier-a",
    containerClass: "border-tier-a",
  },
  B: {
    label: "B Tier",
    badgeSub: "TIER",
    chipClass: "bg-tier-b",
    borderClass: "border-l-tier-b",
    containerClass: "border-tier-b",
  },
  C: {
    label: "C Tier",
    badgeSub: "TIER",
    chipClass: "bg-tier-c",
    borderClass: "border-l-tier-c",
    containerClass: "border-tier-c",
  },
  X: {
    label: "X Tier",
    badgeSub: "TIER",
    chipClass: "bg-tier-x",
    borderClass: "border-l-tier-x",
    containerClass: "border-tier-x",
  },
};
