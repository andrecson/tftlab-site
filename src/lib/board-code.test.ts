import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeBoard,
  encodeBoard,
  toPlacedUnits,
  type SharedBoard,
} from "./board-code";

const sample: SharedBoard = {
  units: [
    { championId: "champ_a", row: 0, col: 0, stars: 1, items: [] },
    {
      championId: "champ_b",
      row: 1,
      col: 3,
      stars: 3,
      items: ["item_x", "item_y", "item_z"],
    },
    { championId: "champ_c", row: 3, col: 6, stars: 2, items: ["item_x"] },
  ],
  augments: ["aug_1", "aug_2"],
};

test("encodeBoard produces a URL-safe code (no +, /, = or path chars)", () => {
  const code = encodeBoard(sample);
  assert.ok(code.length > 0);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
});

test("round-trip encode -> decode preserves the full board state", () => {
  const decoded = decodeBoard(encodeBoard(sample));
  assert.deepEqual(decoded, sample);
});

test("round-trip preserves an empty board", () => {
  const empty: SharedBoard = { units: [], augments: [] };
  assert.deepEqual(decodeBoard(encodeBoard(empty)), empty);
});

test("decodeBoard returns null for malformed input", () => {
  assert.equal(decodeBoard(""), null);
  assert.equal(decodeBoard("not-base64!*"), null);
  assert.equal(decodeBoard("Zm9vYmFy"), null); // valid base64 of "foobar" (not JSON)
});

test("decodeBoard rejects a wrong/absent version", () => {
  const wrongVersion = Buffer.from(
    JSON.stringify({ v: 99, u: [], a: [] }),
  ).toString("base64url");
  assert.equal(decodeBoard(wrongVersion), null);
});

test("decodeBoard drops out-of-bounds hexes and clamps stars", () => {
  const crafted = Buffer.from(
    JSON.stringify({
      v: 1,
      u: [
        ["ok", 0, 0, 7, []], // stars clamp 7 -> 3
        ["low", 2, 2, 0, []], // stars clamp 0 -> 1 (min)
        ["bad-row", 9, 0, 1, []], // row out of bounds -> dropped
        ["bad-col", 0, 99, 1, []], // col out of bounds -> dropped
        [123, 0, 1, 1, []], // non-string championId -> dropped
      ],
      a: ["a1"],
    }),
  ).toString("base64url");
  const decoded = decodeBoard(crafted);
  assert.deepEqual(decoded, {
    units: [
      { championId: "ok", row: 0, col: 0, stars: 3, items: [] },
      { championId: "low", row: 2, col: 2, stars: 1, items: [] },
    ],
    augments: ["a1"],
  });
});

test("decodeBoard keeps the last unit when two share a hex", () => {
  const crafted = Buffer.from(
    JSON.stringify({
      v: 1,
      u: [
        ["first", 2, 2, 1, []],
        ["second", 2, 2, 2, []],
      ],
      a: [],
    }),
  ).toString("base64url");
  const decoded = decodeBoard(crafted);
  assert.deepEqual(decoded?.units, [
    { championId: "second", row: 2, col: 2, stars: 2, items: [] },
  ]);
});

test("toPlacedUnits assigns deterministic, unique local ids", () => {
  const placed = toPlacedUnits(sample.units);
  assert.deepEqual(
    placed.map((u) => u.id),
    ["u0", "u1", "u2"],
  );
  // Ids are preserved alongside the rest of the unit fields.
  assert.equal(placed[1].championId, "champ_b");
  assert.deepEqual(placed[1].items, ["item_x", "item_y", "item_z"]);
});
