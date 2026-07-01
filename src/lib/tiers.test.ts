import assert from "node:assert/strict";
import { test } from "node:test";

import { bandOf, groupByTier, isTier, TIER_ORDER } from "./tiers";

test("isTier accepts every S/A/B/C/X band", () => {
  for (const tier of TIER_ORDER) {
    assert.equal(isTier(tier), true, `expected ${tier} to be a valid tier`);
  }
});

test("isTier rejects unknown strings, casing and non-strings", () => {
  assert.equal(isTier("D"), false);
  assert.equal(isTier("s"), false); // case-sensitive: only uppercase bands
  assert.equal(isTier("SS"), false);
  assert.equal(isTier(""), false);
  assert.equal(isTier(null), false);
  assert.equal(isTier(undefined), false);
  assert.equal(isTier(1), false);
  assert.equal(isTier({ tier: "S" }), false);
});

test("bandOf routes situational comps to X, others to their tier", () => {
  assert.equal(bandOf({ tier: "S", situational: false }), "S");
  assert.equal(bandOf({ tier: "C", situational: false }), "C");
  // Situational overrides the marked tier — it lives in the X (Situacional) band.
  assert.equal(bandOf({ tier: "A", situational: true }), "X");
});

test("groupByTier returns all five bands in display order, even when empty", () => {
  const groups = groupByTier<{
    tier: (typeof TIER_ORDER)[number];
    situational: boolean;
  }>([]);
  assert.deepEqual(
    groups.map((g) => g.tier),
    ["S", "A", "B", "C", "X"],
  );
  assert.ok(groups.every((g) => g.comps.length === 0));
});

test("groupByTier buckets comps by band: situational -> X, else their tier", () => {
  const comps = [
    { id: "1", tier: "S" as const, situational: false },
    { id: "2", tier: "B" as const, situational: false },
    { id: "3", tier: "S" as const, situational: false },
    { id: "4", tier: "A" as const, situational: true }, // marked A but situational
  ];
  const groups = groupByTier(comps);
  const byTier = Object.fromEntries(groups.map((g) => [g.tier, g.comps]));

  assert.deepEqual(
    byTier.S.map((c) => c.id),
    ["1", "3"],
  );
  assert.deepEqual(
    byTier.B.map((c) => c.id),
    ["2"],
  );
  // The A comp is situational, so it lands in X — not in the A band.
  assert.deepEqual(
    byTier.X.map((c) => c.id),
    ["4"],
  );
  assert.deepEqual(byTier.A, []);
  assert.deepEqual(byTier.C, []);
});
