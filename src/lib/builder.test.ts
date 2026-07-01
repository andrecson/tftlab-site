import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addUnitItem,
  clampStars,
  removeUnitItemAt,
  teamGoldValue,
  toggleAugment,
  type PlacedUnit,
} from "./builder";

const unit = (
  championId: string,
  stars: number,
  row = 0,
  col = 0,
): PlacedUnit => ({
  id: `${championId}-${row}-${col}`,
  championId,
  row,
  col,
  stars,
  items: [],
});

test("clampStars keeps 1–3 and rounds/floors out-of-range values", () => {
  assert.equal(clampStars(1), 1);
  assert.equal(clampStars(2), 2);
  assert.equal(clampStars(3), 3);
  assert.equal(clampStars(0), 1);
  assert.equal(clampStars(-5), 1);
  assert.equal(clampStars(7), 3);
  assert.equal(clampStars(2.4), 2);
  assert.equal(clampStars(NaN), 1);
});

test("teamGoldValue sums champion cost scaled by star level", () => {
  const cost: Record<string, number> = { a: 1, b: 3, c: 5 };
  const costOf = (id: string) => cost[id] ?? 0;

  // Empty board is worth nothing.
  assert.equal(teamGoldValue([], costOf), 0);

  // A single 1★ unit is just its base cost.
  assert.equal(teamGoldValue([unit("a", 1)], costOf), 1);

  // 2★ = ×3, 3★ = ×9 of the base cost (TFT combine math).
  assert.equal(teamGoldValue([unit("b", 2)], costOf), 9);
  assert.equal(teamGoldValue([unit("c", 3)], costOf), 45);

  // Mixed board sums each unit's scaled value.
  assert.equal(
    teamGoldValue([unit("a", 1, 0, 0), unit("b", 2, 0, 1), unit("c", 1, 0, 2)], costOf),
    1 + 9 + 5,
  );
});

test("teamGoldValue skips champions with unknown/invalid cost", () => {
  const costOf = (id: string) => (id === "known" ? 4 : 0);
  assert.equal(
    teamGoldValue([unit("known", 1, 0, 0), unit("missing", 3, 0, 1)], costOf),
    4,
  );
});

test("addUnitItem appends up to 3 items then caps", () => {
  assert.deepEqual(addUnitItem([], "a"), ["a"]);
  assert.deepEqual(addUnitItem(["a"], "b"), ["a", "b"]);
  assert.deepEqual(addUnitItem(["a", "b"], "c"), ["a", "b", "c"]);
  // A full unit ignores further items (returns an unchanged copy).
  const full = ["a", "b", "c"];
  const result = addUnitItem(full, "d");
  assert.deepEqual(result, ["a", "b", "c"]);
  assert.notEqual(result, full); // new array, not mutated in place
  // Duplicates are allowed (e.g. two of the same completed item).
  assert.deepEqual(addUnitItem(["a"], "a"), ["a", "a"]);
});

test("removeUnitItemAt removes the item at the given slot", () => {
  assert.deepEqual(removeUnitItemAt(["a", "b", "c"], 1), ["a", "c"]);
  assert.deepEqual(removeUnitItemAt(["a"], 0), []);
  // Out-of-range index leaves the list intact (as a copy).
  assert.deepEqual(removeUnitItemAt(["a", "b"], 5), ["a", "b"]);
});

test("toggleAugment adds, removes and caps at 3", () => {
  assert.deepEqual(toggleAugment([], "x"), ["x"]);
  // Toggling a selected augment removes it.
  assert.deepEqual(toggleAugment(["x", "y"], "x"), ["y"]);
  // A full selection ignores new augments...
  const full = ["a", "b", "c"];
  assert.deepEqual(toggleAugment(full, "d"), ["a", "b", "c"]);
  // ...but can still deselect an existing one.
  assert.deepEqual(toggleAugment(full, "b"), ["a", "c"]);
});
