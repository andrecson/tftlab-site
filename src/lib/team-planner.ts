/**
 * TFT in-game Team Planner export code.
 *
 * Format (community-documented): `01` + one 2-hex value per champion + the set
 * token (e.g. `TFTSet17`). Each champion's value is its 1-based index in the
 * set's team-planner champion list, sorted alphabetically by `character_id`.
 * The index is computed over the OFFICIAL team-planner list (whose
 * `character_id` equals the app's champion `apiId`), so it matches the game's
 * ordering exactly — including any non-selectable/PvE entries, which the game
 * still counts in the ordering.
 *
 * NOTE: reverse-engineered from community sources; validate one generated code
 * in the actual game before relying on it.
 * Refs: gist.github.com/bangingheads/243e396f78be1a4d49dc0577abf57a0b
 */

/** The in-game team planner holds up to 10 champions. */
export const TEAM_PLANNER_MAX = 10;

export interface TeamPlannerEntry {
  character_id: string;
}

/**
 * Build the `apiId` (== `character_id`) → 2-hex-code map for a set from its
 * team-planner entries: sort by `character_id`, assign 1-based hex indices.
 * Pure, so it can be unit-tested with a fixture.
 */
export function teamPlannerCodeMap(
  entries: TeamPlannerEntry[],
): Record<string, string> {
  const sorted = [...entries]
    .filter(
      (e) => typeof e.character_id === "string" && e.character_id.length > 0,
    )
    .sort((a, b) => a.character_id.localeCompare(b.character_id));

  const map: Record<string, string> = {};
  sorted.forEach((entry, i) => {
    map[entry.character_id] = (i + 1)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  });
  return map;
}

export interface TeamPlannerCodeResult {
  /** The paste-into-game code, or null when no champion could be encoded. */
  code: string | null;
  /** apiIds that had no team-planner code (excluded from the code). */
  missing: string[];
  /** True when the champion list was capped to TEAM_PLANNER_MAX. */
  truncated: boolean;
}

/**
 * Assemble the team-planner code for a set of champion apiIds. De-dupes
 * champions (the planner holds each once), caps at TEAM_PLANNER_MAX, and reports
 * any apiIds that lacked a code.
 */
export function buildTeamPlannerCode(
  apiIds: string[],
  codesByApiId: Record<string, string>,
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

  const truncated = unique.length > TEAM_PLANNER_MAX;
  const capped = unique.slice(0, TEAM_PLANNER_MAX);

  const hexes: string[] = [];
  const missing: string[] = [];
  for (const apiId of capped) {
    const hex = codesByApiId[apiId];
    if (hex) hexes.push(hex);
    else missing.push(apiId);
  }

  const code = set && hexes.length > 0 ? `01${hexes.join("")}${set}` : null;
  return { code, missing, truncated };
}
