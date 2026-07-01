import { CompCard } from "@/components/comp-card";
import { TIER_META } from "@/lib/tiers";
import type { TierGroup } from "@/lib/tiers";
import type { CompCard as CompCardData } from "@/server/queries/tierlist";

/**
 * TierBands (US-016) — the S/A/B/C/X band list, extracted from the tier-list
 * page so it can be rendered both server-side (the Suspense fallback / default
 * view) and inside the client `TierListFilters` component.
 *
 * This is a presentational, prop-driven component (no `"use client"`): it only
 * renders markup + `CompCard`, both of which are client-safe, so it works in
 * either tree.
 *
 * - `hideEmpty` = false (default): every band renders, empty ones showing the
 *   US-014 per-band empty state. This is the default, unfiltered view.
 * - `hideEmpty` = true: only bands with matching comps render. Used while
 *   filters are active — the caller shows a single "no results" state when the
 *   whole filtered set is empty.
 */
interface TierBandsProps {
  groups: TierGroup<CompCardData>[];
  currentPatchId: string | null;
  hideEmpty?: boolean;
}

export function TierBands({
  groups,
  currentPatchId,
  hideEmpty = false,
}: TierBandsProps) {
  const visible = hideEmpty
    ? groups.filter((group) => group.comps.length > 0)
    : groups;

  return (
    <div className="flex flex-col gap-4">
      {visible.map(({ tier, comps }) => {
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
