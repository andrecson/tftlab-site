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
            className="flex items-stretch gap-3"
          >
            {/* Tier badge — big colored square with the letter + corner brackets
                (tftacademy-style), in the TFTLab tier colors. */}
            <div
              className={`relative flex min-h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-lg text-background ${meta.chipClass} sm:w-[5.25rem]`}
            >
              <span className="pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l-2 border-t-2 border-background/50" />
              <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 border-r-2 border-t-2 border-background/50" />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2.5 w-2.5 border-b-2 border-l-2 border-background/50" />
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b-2 border-r-2 border-background/50" />
              <span
                className="text-4xl font-extrabold leading-none sm:text-5xl"
                aria-hidden="true"
              >
                {tier}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest">
                {meta.badgeSub}
              </span>
            </div>

            {/* Comps container — tier-colored border holding the hexagons. */}
            <div
              className={`flex flex-1 items-center rounded-xl border-2 bg-card px-3 py-2.5 ${meta.containerClass}`}
            >
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
