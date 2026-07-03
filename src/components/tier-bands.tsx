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
    <div className="flex flex-col gap-3">
      {groups.map(({ tier, comps }) => {
        const meta = TIER_META[tier];
        return (
          <section
            key={tier}
            aria-label={meta.label}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Tier header strip — colored band with the letter + label. */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 ${meta.chipClass}`}
            >
              <span
                className="text-xl font-black leading-none text-background"
                aria-hidden="true"
              >
                {tier}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-background/80">
                Tier
              </span>
            </div>

            {/* Comps (or the per-band empty state). */}
            <div className="px-3 py-3">
              {comps.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">
                  Nenhuma comp {meta.label} neste patch.
                </p>
              ) : (
                <ul className="flex flex-wrap items-center gap-2.5">
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
