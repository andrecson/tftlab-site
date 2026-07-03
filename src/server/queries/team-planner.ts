import { unstable_cache } from "next/cache";

import { teamPlannerCodeMap } from "@/lib/team-planner";
import { fetchTeamPlannerData } from "@/server/ddragon";
import { getCurrentSet } from "@/server/queries/config";

export interface TeamPlannerCodes {
  /** apiId (== character_id) → team_planner_code, for the current set. */
  codes: Record<string, number>;
  /** Set token used as the code suffix (e.g. "TFTSet17"); "" when unavailable. */
  set: string;
}

/**
 * Champion → team-planner export-code map for the current set, from the official
 * Community Dragon team-planner list. Wrapped in `unstable_cache` (tag `catalog`,
 * like the builder catalog) and resilient: on a fetch failure — or no DB at
 * build time — it returns an empty map, so the builder simply hides the export
 * button. The map is keyed by `character_id`, which equals the app's champion
 * `apiId`, so the builder can look up each placed unit directly.
 */
export const getTeamPlannerCodes = unstable_cache(
  async (): Promise<TeamPlannerCodes> => {
    try {
      const set = await getCurrentSet();
      if (!set) return { codes: {}, set: "" };
      const data = await fetchTeamPlannerData();
      const entries = data[set] ?? [];
      if (entries.length === 0) return { codes: {}, set: "" };
      return { codes: teamPlannerCodeMap(entries), set };
    } catch {
      return { codes: {}, set: "" };
    }
  },
  ["team-planner-codes"],
  { tags: ["catalog"] },
);
