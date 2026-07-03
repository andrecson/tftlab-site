import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTeamPlannerCode,
  teamPlannerCodeMap,
  TEAM_PLANNER_MAX,
} from "./team-planner";

test("teamPlannerCodeMap sorts by character_id and assigns 1-based hex", () => {
  const map = teamPlannerCodeMap([
    { character_id: "TFT17_Zed" },
    { character_id: "TFT17_Aatrox" },
    { character_id: "TFT17_Akali" },
  ]);
  assert.equal(map["TFT17_Aatrox"], "01");
  assert.equal(map["TFT17_Akali"], "02");
  assert.equal(map["TFT17_Zed"], "03");
});

test("teamPlannerCodeMap pads to 2 hex and goes past 0x0F correctly", () => {
  const entries = Array.from({ length: 16 }, (_, i) => ({
    character_id: `TFT17_${String(i).padStart(2, "0")}`,
  }));
  const map = teamPlannerCodeMap(entries);
  assert.equal(map["TFT17_00"], "01");
  assert.equal(map["TFT17_09"], "0A"); // 10th -> 0A
  assert.equal(map["TFT17_15"], "10"); // 16th -> 10
});

test("teamPlannerCodeMap ignores enemy-unit inclusion only via sort position", () => {
  // TFT17_Enemy_Aatrox sorts after TFT17_Aatrox (A < E) and shifts later champs.
  const map = teamPlannerCodeMap([
    { character_id: "TFT17_Aatrox" },
    { character_id: "TFT17_Enemy_Aatrox" },
    { character_id: "TFT17_Zed" },
  ]);
  assert.equal(map["TFT17_Aatrox"], "01");
  assert.equal(map["TFT17_Enemy_Aatrox"], "02");
  assert.equal(map["TFT17_Zed"], "03");
});

const CODES = { TFT17_Aatrox: "01", TFT17_Akali: "02", TFT17_Zed: "0A" };

test("buildTeamPlannerCode wraps 01 + hexes + set", () => {
  const r = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Akali", "TFT17_Zed"],
    CODES,
    "TFTSet17",
  );
  assert.equal(r.code, "01" + "01" + "02" + "0A" + "TFTSet17");
  assert.deepEqual(r.missing, []);
  assert.equal(r.truncated, false);
});

test("buildTeamPlannerCode de-dupes champions", () => {
  const r = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Aatrox", "TFT17_Akali"],
    CODES,
    "TFTSet17",
  );
  assert.equal(r.code, "01" + "01" + "02" + "TFTSet17");
});

test("buildTeamPlannerCode reports missing codes and still encodes the rest", () => {
  const r = buildTeamPlannerCode(
    ["TFT17_Aatrox", "TFT17_Unknown"],
    CODES,
    "TFTSet17",
  );
  assert.equal(r.code, "01" + "01" + "TFTSet17");
  assert.deepEqual(r.missing, ["TFT17_Unknown"]);
});

test("buildTeamPlannerCode returns null when nothing encodable / no set", () => {
  assert.equal(buildTeamPlannerCode([], CODES, "TFTSet17").code, null);
  assert.equal(buildTeamPlannerCode(["TFT17_X"], {}, "TFTSet17").code, null);
  assert.equal(buildTeamPlannerCode(["TFT17_Aatrox"], CODES, "").code, null);
});

test("buildTeamPlannerCode caps at TEAM_PLANNER_MAX", () => {
  const many = Array.from({ length: 14 }, (_, i) => `C${i}`);
  const codes = Object.fromEntries(many.map((id, i) => [id, (i + 1).toString(16).padStart(2, "0").toUpperCase()]));
  const r = buildTeamPlannerCode(many, codes, "TFTSet17");
  assert.equal(r.truncated, true);
  // 01 + 10 champs * 2 hex + set
  assert.equal(r.code!.length, 2 + TEAM_PLANNER_MAX * 2 + "TFTSet17".length);
});
