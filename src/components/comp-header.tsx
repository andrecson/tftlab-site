import type { Difficulty } from "@prisma/client";

import { TIER_META } from "@/lib/tiers";
import type { CompDetail } from "@/server/queries/comp";
import { getCompBadges } from "@/server/services/badges";

/**
 * CompHeader (US-017) — the top of a comp-detail page.
 *
 * Shows the comp name, its tier badge, playstyle + difficulty and the active
 * traits with their level (e.g. "Mecha 4"), plus the Novo/Atualizado badges
 * from the badges service. Presentational (no `"use client"`); the later
 * comp-detail sections (carries/items/units/board/augments/guide) are added by
 * US-018..US-022 below this header.
 *
 * The tier chip reuses `TIER_META` (full, non-interpolated Tailwind classes) so
 * the content scanner keeps `bg-tier-*` in the build — same rule as the tier
 * list and CompCard.
 */
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
};

interface CompHeaderProps {
  comp: CompDetail;
  /** Current patch id from SiteConfig, for the Novo/Atualizado badges. */
  currentPatchId: string | null | undefined;
}

export function CompHeader({ comp, currentPatchId }: CompHeaderProps) {
  const { isNew, isUpdated } = getCompBadges(comp, currentPatchId);
  const tierMeta = TIER_META[comp.tier];

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-2xl font-extrabold text-background ${tierMeta.chipClass}`}
          aria-label={`Tier ${comp.tier}`}
        >
          {comp.tier}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {comp.name}
            </h1>
            {isNew && (
              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-primary-foreground">
                Novo
              </span>
            )}
            {isUpdated && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-secondary-foreground">
                Atualizado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {tierMeta.label}
            {comp.situational && comp.tier !== "X" && " · Situacional"}
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {comp.playstyle && (
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Estilo de jogo:</dt>
            <dd className="font-medium text-foreground">{comp.playstyle}</dd>
          </div>
        )}
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">Dificuldade:</dt>
          <dd className="font-medium text-foreground">
            {DIFFICULTY_LABEL[comp.difficulty]}
          </dd>
        </div>
      </dl>

    </header>
  );
}
