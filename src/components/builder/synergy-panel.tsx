import Image from "next/image";

import type { ActiveTrait } from "@/lib/synergy";
import type { BuilderTraitInfo } from "@/server/queries/catalog";

/**
 * Live synergy panel for the builder (US-026).
 *
 * Presentational: it renders the already-computed active traits (from
 * `computeSynergies` in `src/lib/synergy.ts`) that the parent recalculates each
 * time a unit is placed/moved/removed. Each row shows the trait icon and name,
 * the active level, and the current unique-unit count vs its next breakpoint.
 * Traits are pre-sorted by the engine (highest tier first).
 */

/** Count-badge colour per activation tier (bronze → silver → gold → prismatic). */
const TIER_BADGE: Record<number, string> = {
  1: "bg-amber-800/40 text-amber-200 ring-amber-600/40",
  2: "bg-slate-400/20 text-slate-100 ring-slate-300/40",
  3: "bg-amber-400/25 text-amber-100 ring-amber-300/50",
};
const TIER_BADGE_MAX = "bg-primary text-background ring-transparent";

function tierBadgeClass(tier: number): string {
  return TIER_BADGE[tier] ?? TIER_BADGE_MAX;
}

interface SynergyPanelProps {
  active: ActiveTrait[];
  /** Trait metadata (icon) keyed by the same id used as the synergy key. */
  traitsById: Map<string, BuilderTraitInfo>;
}

export function SynergyPanel({ active, traitsById }: SynergyPanelProps) {
  return (
    <section
      aria-label="Sinergias ativas"
      className="rounded-lg border border-border bg-card p-3"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Sinergias</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {active.length} ativa{active.length === 1 ? "" : "s"}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-muted-foreground">
          Posicione campeões para ativar sinergias.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {active.map((trait) => {
            const info = traitsById.get(trait.key);
            return (
              <li
                key={trait.key}
                className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5"
              >
                <span
                  className={`inline-flex h-6 w-8 shrink-0 items-center justify-center rounded ring-1 ${tierBadgeClass(
                    trait.tier,
                  )}`}
                  aria-hidden="true"
                >
                  {info ? (
                    <Image
                      src={info.iconUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] font-bold tabular-nums">
                      {trait.count}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {trait.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (nível {trait.tier})
                  </span>
                </span>
                <span
                  className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums"
                  aria-label={
                    trait.maxed
                      ? `${trait.count} unidades (máximo)`
                      : `${trait.count} de ${trait.nextBreakpoint} unidades`
                  }
                >
                  <span className="text-foreground">{trait.count}</span>
                  {trait.maxed ? "" : ` / ${trait.nextBreakpoint}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
