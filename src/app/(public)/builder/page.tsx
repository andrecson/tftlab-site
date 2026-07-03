import type { Metadata } from "next";

import { Builder } from "@/components/builder/builder";
import { PageHeading } from "@/components/page-heading";
import { getBuilderCatalog } from "@/server/queries/builder-catalog";
import { getTeamPlannerCodes } from "@/server/queries/team-planner";

/**
 * Public builder page (US-025) — served at `/builder`.
 *
 * The server fetches the current set's champion catalog (cached under the
 * `catalog` tag, so a future catalog reseed can refresh it) and ships it to the
 * client `<Builder>`, which owns all interactivity (place/move/remove units on a
 * 4×7 hex board, palette search/sort, names toggle, undo/redo). The builder is
 * ephemeral — nothing is persisted server-side — so the page itself stays static
 * with ISR; only the champion list comes from the DB.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Monte e teste composições de TFT em um tabuleiro hexagonal com a paleta de campeões do set atual.",
  alternates: { canonical: "/builder" },
};

export default async function BuilderPage() {
  const [{ champions, traits, items, augments }, teamPlanner] =
    await Promise.all([getBuilderCatalog(), getTeamPlannerCodes()]);

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-8">
      <PageHeading
        title="Builder"
        subtitle="Monte e experimente composições no tabuleiro."
      />

      <Builder
        champions={champions}
        traits={traits}
        items={items}
        augments={augments}
        teamPlannerCodes={teamPlanner.codes}
        teamPlannerSet={teamPlanner.set}
      />
    </div>
  );
}
