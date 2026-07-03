/**
 * TFT in-game Team Planner export code (paste into the game's Team Planner).
 *
 * Format (reverse-engineered and validated against a real code): a `02` header
 * byte, then TEN 12-bit champion slots packed big-endian (empty slots = 0), then
 * the set token (e.g. `TFTSet17`). Each slot holds the champion's
 * `team_planner_code` from Community Dragon's `tftchampions-teamplanner.json`.
 * Champions are sorted by `character_id` (== the app's champion `apiId`) to match
 * the game's own ordering.
 *
 * Golden example — Aatrox(29) + Briar(14) + Caitlyn(27) + Cho'Gath(69), Set 17:
 *   0201d00e01b045000000000000000000TFTSet17
 */

/** Fixed number of 12-bit champion slots in a team-planner code. */
export const TEAM_PLANNER_MAX = 10;
const SLOT_BITS = 12;
const HEADER = "02";

export interface TeamPlannerEntry {
  character_id: string;
  team_planner_code: number;
}

/** apiId (== character_id) → team_planner_code (the game's per-set champion id). */
export function teamPlannerCodeMap(
  entries: TeamPlannerEntry[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of entries) {
    if (
      typeof entry.character_id === "string" &&
      typeof entry.team_planner_code === "number"
    ) {
      map[entry.character_id] = entry.team_planner_code;
    }
  }
  return map;
}

/** Pack up to TEAM_PLANNER_MAX 12-bit values (big-endian), zero-padded, to hex. */
function packSlots(values: number[]): string {
  const slots = values.slice(0, TEAM_PLANNER_MAX);
  while (slots.length < TEAM_PLANNER_MAX) slots.push(0);

  let bits = "";
  for (const value of slots) {
    bits += (value & 0xfff).toString(2).padStart(SLOT_BITS, "0");
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 8) {
    hex += parseInt(bits.slice(i, i + 8), 2)
      .toString(16)
      .padStart(2, "0");
  }
  return hex;
}

export interface TeamPlannerCodeResult {
  /** The paste-into-game code, or null when no champion could be encoded. */
  code: string | null;
  /** apiIds that had no (valid, non-zero) team-planner code. */
  missing: string[];
  /** True when the champion list was capped to TEAM_PLANNER_MAX. */
  truncated: boolean;
}

/**
 * Build the team-planner code for a set of champion apiIds. De-dupes, sorts by
 * character_id (to match the game), caps at TEAM_PLANNER_MAX, and reports any
 * apiIds lacking a code.
 */
export function buildTeamPlannerCode(
  apiIds: string[],
  codesByApiId: Record<string, number>,
  set: string,
): TeamPlannerCodeResult {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const apiId of apiIds) {
    if (apiId && !seen.has(apiId)) {
      seen.add(apiId);
      unique.push(apiId);
    }
  }
  // Sort by character_id (the apiId) to match how the game orders the slots.
  unique.sort((a, b) => a.localeCompare(b));

  const truncated = unique.length > TEAM_PLANNER_MAX;
  const capped = unique.slice(0, TEAM_PLANNER_MAX);

  const values: number[] = [];
  const missing: string[] = [];
  for (const apiId of capped) {
    const code = codesByApiId[apiId];
    if (typeof code === "number" && code > 0) values.push(code);
    else missing.push(apiId);
  }

  if (!set || values.length === 0) {
    return { code: null, missing, truncated };
  }
  return { code: `${HEADER}${packSlots(values)}${set}`, missing, truncated };
}
