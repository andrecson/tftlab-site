import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTeamPlannerCode,
  teamPlannerCodeMap,
  TEAM_PLANNER_MAX,
} from "./team-planner";

// Real Set 17 team_planner_code values.
const CODES: Record<string, number> = {
  TFT17_Aatrox: 29,
  TFT17_Briar: 14,
  TFT17_Caitlyn: 27,
  TFT17_Chogath: 69,
};

test("teamPlannerCodeMap keeps character_id -> team_planner_code", () => {
  const map = teamPlannerCodeMap([
    { character_id: "TFT17_Aatrox", team_planner_code: 29 },
    { character_id: "TFT17_Briar", team_planner_code: 14 },
  ]);
  assert.equal(map["TFT17_Aatrox"], 29);
  assert.equal(map["TFT17_Briar"], 14);
});

test("GOLDEN: Aatrox+Caitlyn+Briar+Chogath matches the real game code", () => {
  // pass them out of order to prove the sort-by-character_id.
  const r = buildTeamPlannerCode(
    ["TFT17_Caitlyn", "TFT17_Aatrox", "TFT17_Chogath", "TFT17_Briar"],
    CODES,
    "TFTSet17",
  );
  assert.equal(r.code, "0201d00e01b045000000000000000000TFTSet17");
  assert.deepEqual(r.missing, []);
  assert.equal(r.truncated, false);
});

test("code = 02 + 30 hex (10 slots x 12 bit) + set token", () => {
  const r = buildTeamPlannerCode(["TFT17_Aatrox"], CODES, "TFTSet17");
  // header(2) + 15 bytes*2 + "TFTSet17"
  assert.equal(r.code!.length, 2 + 30 + "TFTSet17".length);
  assert.ok(r.code!.startsWith("02"));
  assert.ok(r.code!.endsWith("TFTSet17"));
});

test("12-bit slot packing handles values above 0xFF", () => {
  // 0xABC = 2748 in slot 1, 0x001 in slot 2 -> big-endian nibbles ABC 001 ...
  const r = buildTeamPlannerCode(["Z", "A"], { A: 0xabc, Z: 0x001 }, "S");
  // sorted: A(ABC) then Z(001) -> 1010 1011 1100 | 0000 0000 0001 | zeros
  assert.equal(r.code!.slice(2, 8), "abc001");
});

test("buildTeamPlannerCode de-dupes champions", () => {
  const r1 = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Aatrox", "TFT17_Briar"],
    CODES,
    "TFTSet17",
  );
  const r2 = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Briar"],
    CODES,
    "TFTSet17",
  );
  assert.equal(r1.code, r2.code);
});

test("missing / zero codes are excluded and reported", () => {
  const r = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Unknown", "TFT17_Zero"],
    { ...CODES, TFT17_Zero: 0 },
    "TFTSet17",
  );
  assert.deepEqual(r.missing.sort(), ["TFT17_Unknown", "TFT17_Zero"]);
  // only Aatrox encoded
  assert.equal(r.code, buildTeamPlannerCode(["TFT17_Aatrox"], CODES, "TFTSet17").code);
});

test("null when nothing encodable or no set", () => {
  assert.equal(buildTeamPlannerCode([], CODES, "TFTSet17").code, null);
  assert.equal(buildTeamPlannerCode(["X"], {}, "TFTSet17").code, null);
  assert.equal(buildTeamPlannerCode(["TFT17_Aatrox"], CODES, "").code, null);
});

test("caps at TEAM_PLANNER_MAX champions", () => {
  const ids = Array.from({ length: 13 }, (_, i) => `C${String(i).padStart(2, "0")}`);
  const codes = Object.fromEntries(ids.map((id, i) => [id, i + 1]));
  const r = buildTeamPlannerCode(ids, codes, "TFTSet17");
  assert.equal(r.truncated, true);
  assert.equal(r.code!.length, 2 + 30 + "TFTSet17".length); // always 10 slots
});
