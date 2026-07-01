import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeSynergies,
  countUnitsByTrait,
  type SynergyUnit,
  type TraitInfo,
} from "./synergy";

const TRAITS: TraitInfo[] = [
  { key: "mecha", name: "Mecha", breakpoints: [2, 4, 6] },
  { key: "sniper", name: "Sniper", breakpoints: [2, 4] },
  { key: "duelist", name: "Duelist", breakpoints: [2, 4, 6, 8] },
  { key: "loner", name: "Loner", breakpoints: [1] },
  { key: "meta", name: "Meta", breakpoints: [] }, // meta-trait, never activates
];

const unit = (championId: string, traits: string[]): SynergyUnit => ({
  championId,
  traits,
});

/** N distinct champions all carrying `trait`. */
const units = (trait: string, n: number): SynergyUnit[] =>
  Array.from({ length: n }, (_, i) => unit(`${trait}-${i}`, [trait]));

test("empty board has no active traits", () => {
  assert.deepEqual(computeSynergies([], TRAITS), []);
});

test("below the first breakpoint the trait is inactive", () => {
  // A single Mecha unit does not reach the [2,4,6] threshold.
  assert.deepEqual(computeSynergies(units("mecha", 1), TRAITS), []);
});

test("activation: reaching the first breakpoint activates tier 1", () => {
  const active = computeSynergies(units("mecha", 2), TRAITS);
  assert.equal(active.length, 1);
  assert.deepEqual(active[0], {
    key: "mecha",
    name: "Mecha",
    count: 2,
    breakpoints: [2, 4, 6],
    activeBreakpoint: 2,
    tier: 1,
    nextBreakpoint: 4,
    maxed: false,
  });
});

test("breakpoints: a count between thresholds keeps the lower tier and points at the next", () => {
  const active = computeSynergies(units("mecha", 3), TRAITS);
  assert.equal(active[0].count, 3);
  assert.equal(active[0].activeBreakpoint, 2);
  assert.equal(active[0].tier, 1);
  assert.equal(active[0].nextBreakpoint, 4);
  assert.equal(active[0].maxed, false);
});

test("breakpoints: exactly on a higher threshold advances the tier", () => {
  const active = computeSynergies(units("mecha", 4), TRAITS);
  assert.equal(active[0].activeBreakpoint, 4);
  assert.equal(active[0].tier, 2);
  assert.equal(active[0].nextBreakpoint, 6);
  assert.equal(active[0].maxed, false);
});

test("breakpoints: the top tier is maxed with no next breakpoint", () => {
  const active = computeSynergies(units("mecha", 6), TRAITS);
  assert.equal(active[0].activeBreakpoint, 6);
  assert.equal(active[0].tier, 3);
  assert.equal(active[0].nextBreakpoint, null);
  assert.equal(active[0].maxed, true);
});

test("breakpoints: a count above the top threshold stays maxed but shows the raw count", () => {
  const active = computeSynergies(units("mecha", 7), TRAITS);
  assert.equal(active[0].count, 7);
  assert.equal(active[0].activeBreakpoint, 6);
  assert.equal(active[0].tier, 3);
  assert.equal(active[0].nextBreakpoint, null);
  assert.equal(active[0].maxed, true);
});

test("a single-breakpoint trait activates at one unit", () => {
  const active = computeSynergies([unit("solo", ["loner"])], TRAITS);
  assert.equal(active.length, 1);
  assert.deepEqual(active[0], {
    key: "loner",
    name: "Loner",
    count: 1,
    breakpoints: [1],
    activeBreakpoint: 1,
    tier: 1,
    nextBreakpoint: null,
    maxed: true,
  });
});

test("duplicates: the same champion on two hexes counts once", () => {
  // Two copies of the same Mecha champion + one distinct Mecha = 2 unique units.
  const board = [
    unit("blitz", ["mecha"]),
    unit("blitz", ["mecha"]),
    unit("aatrox", ["mecha"]),
  ];
  assert.equal(countUnitsByTrait(board).get("mecha"), 2);
  const active = computeSynergies(board, TRAITS);
  assert.equal(active.length, 1);
  assert.equal(active[0].count, 2);
  assert.equal(active[0].tier, 1);
});

test("duplicates: two copies of one champion alone do NOT activate", () => {
  const board = [unit("blitz", ["mecha"]), unit("blitz", ["mecha"])];
  assert.deepEqual(computeSynergies(board, TRAITS), []);
});

test("duplicates: a trait repeated on one champion counts once", () => {
  const board = [unit("weird", ["mecha", "mecha"]), unit("aatrox", ["mecha"])];
  assert.equal(countUnitsByTrait(board).get("mecha"), 2);
});

test("a champion contributes to every one of its traits", () => {
  const board = [
    unit("a", ["mecha", "sniper"]),
    unit("b", ["mecha", "sniper"]),
    unit("c", ["mecha"]),
  ];
  const counts = countUnitsByTrait(board);
  assert.equal(counts.get("mecha"), 3);
  assert.equal(counts.get("sniper"), 2);
});

test("a trait with no breakpoints never activates", () => {
  const board = Array.from({ length: 9 }, (_, i) => unit(`m-${i}`, ["meta"]));
  assert.deepEqual(computeSynergies(board, TRAITS), []);
});

test("traits present on units but absent from the catalog are ignored", () => {
  const board = [unit("x", ["ghost"]), unit("y", ["ghost"])];
  assert.deepEqual(computeSynergies(board, TRAITS), []);
});

test("output is sorted by tier, then count, then name", () => {
  const board = [
    // Duelist: 4 units -> tier 2 (breakpoints [2,4,6,8]).
    unit("d1", ["duelist"]),
    unit("d2", ["duelist"]),
    unit("d3", ["duelist"]),
    unit("d4", ["duelist"]),
    // Mecha: 3 units -> tier 1, count 3.
    unit("m1", ["mecha"]),
    unit("m2", ["mecha"]),
    unit("m3", ["mecha"]),
    // Sniper: 2 units -> tier 1, count 2.
    unit("s1", ["sniper"]),
    unit("s2", ["sniper"]),
  ];
  const active = computeSynergies(board, TRAITS);
  assert.deepEqual(
    active.map((t) => [t.key, t.tier, t.count]),
    [
      ["duelist", 2, 4], // highest tier first
      ["mecha", 1, 3], // same tier as sniper, higher count first
      ["sniper", 1, 2],
    ],
  );
});

test("ties on tier and count fall back to alphabetical name order", () => {
  const traits: TraitInfo[] = [
    { key: "bravo", name: "Bravo", breakpoints: [2] },
    { key: "alpha", name: "Alpha", breakpoints: [2] },
  ];
  const board = [
    unit("a1", ["bravo", "alpha"]),
    unit("a2", ["bravo", "alpha"]),
  ];
  const active = computeSynergies(board, traits);
  assert.deepEqual(
    active.map((t) => t.name),
    ["Alpha", "Bravo"],
  );
});

test("breakpoints are normalized: unsorted and duplicate thresholds resolve correctly", () => {
  const traits: TraitInfo[] = [
    { key: "wonky", name: "Wonky", breakpoints: [4, 2, 2, 6, -1, 0] },
  ];
  const active = computeSynergies(units("wonky", 5), traits);
  assert.equal(active.length, 1);
  assert.deepEqual(active[0].breakpoints, [2, 4, 6]);
  assert.equal(active[0].activeBreakpoint, 4);
  assert.equal(active[0].tier, 2);
  assert.equal(active[0].nextBreakpoint, 6);
});
