import { CompCard } from "@/components/comp-card";
import { TIER_META } from "@/lib/tiers";
import type { TierGroup } from "@/lib/tiers";
import type { CompCard as CompCardData } from "@/server/queries/tierlist";

/**
 * TierBands — the S/A/B/C/X band list rendered on the tier-list page.
 *
 * Presentational, prop-driven component (no `"use client"`): it only renders
 * markup + `CompCard`. Every band renders, empty ones showing the US-014
 * per-band empty state.
 */
interface TierBandsProps {
  groups: TierGroup<CompCardData>[];
  currentPatchId: string | null;
}

export function TierBands({ groups, currentPatchId }: TierBandsProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ tier, comps }) => {
        const meta = TIER_META[tier];
        return (
          <section
            key={tier}
            aria-label={meta.label}
            className={`flex flex-col gap-3 rounded-lg border border-l-4 border-border bg-card p-4 ${meta.borderClass} sm:flex-row sm:items-start sm:gap-4`}
          >
            <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-start">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-md text-lg font-extrabold text-background ${meta.chipClass}`}
                aria-hidden="true"
              >
                {tier}
              </span>
              <h2 className="text-sm font-semibold text-foreground">
                {meta.label}
              </h2>
            </div>

            <div className="flex-1">
              {comps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma comp {meta.label} neste patch.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-3">
                  {comps.map((comp) => (
                    <li key={comp.id}>
                      <CompCard comp={comp} currentPatchId={currentPatchId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
