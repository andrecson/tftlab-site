import assert from "node:assert/strict";
import { test } from "node:test";

import { groupByTier, isTier, TIER_ORDER } from "./tiers";

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

test("groupByTier returns all five bands in display order, even when empty", () => {
  const groups = groupByTier<{ tier: (typeof TIER_ORDER)[number] }>([]);
  assert.deepEqual(
    groups.map((g) => g.tier),
    ["S", "A", "B", "C", "X"],
  );
  assert.ok(groups.every((g) => g.comps.length === 0));
});

test("groupByTier buckets comps into their tier band", () => {
  const comps = [
    { id: "1", tier: "S" as const },
    { id: "2", tier: "B" as const },
    { id: "3", tier: "S" as const },
    { id: "4", tier: "X" as const },
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
  assert.deepEqual(
    byTier.X.map((c) => c.id),
    ["4"],
  );
  assert.deepEqual(byTier.A, []);
  assert.deepEqual(byTier.C, []);
});
