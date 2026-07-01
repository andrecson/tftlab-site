import Image from "next/image";
import Link from "next/link";
import type { Tier } from "@prisma/client";

import type { CompCard as CompCardData } from "@/server/queries/tierlist";
import { getCompBadges } from "@/server/services/badges";

/**
 * CompCard (US-015, revised).
 *
 * In the tier list a comp is shown ONLY as a champion icon — the "cover"
 * champion chosen when writing the guide (falls back to the comp's first carry).
 * No name or synergies are rendered on the card; the comp name is still exposed
 * via `aria-label`/`title` for accessibility. The whole tile links to
 * `/comps/[slug]` and carries the tier-colored left border plus the
 * Novo/Atualizado badges from the badges service.
 *
 * Tier border classes are written out in full (never interpolated) so
 * Tailwind's content scanner keeps `border-l-tier-*` in the build.
 */
const TIER_BORDER: Record<Tier, string> = {
  S: "border-l-tier-s",
  A: "border-l-tier-a",
  B: "border-l-tier-b",
  C: "border-l-tier-c",
  X: "border-l-tier-x",
};

interface CompCardProps {
  comp: CompCardData;
  /** Current patch id from SiteConfig, for the Novo/Atualizado badges. */
  currentPatchId: string | null | undefined;
}

export function CompCard({ comp, currentPatchId }: CompCardProps) {
  const { isNew, isUpdated } = getCompBadges(comp, currentPatchId);
  // Cover champion chosen for the guide; fall back to the comp's first carry.
  const champion = comp.coverChampion ?? comp.units[0]?.champion ?? null;

  return (
    <Link
      href={`/comps/${comp.slug}`}
      aria-label={`Ver comp ${comp.name}`}
      title={comp.name}
      className={`group relative block shrink-0 overflow-hidden rounded-lg border border-l-4 border-border bg-muted/40 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${TIER_BORDER[comp.tier]}`}
    >
      <span className="relative block h-20 w-20 sm:h-24 sm:w-24">
        {champion ? (
          <Image
            src={champion.iconUrl}
            alt={comp.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
            ?
          </span>
        )}
      </span>

      {(isNew || isUpdated) && (
        <div className="pointer-events-none absolute left-0 top-0 flex flex-col items-start gap-0.5 p-1">
          {isNew && (
            <span className="rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-primary-foreground">
              Novo
            </span>
          )}
          {isUpdated && (
            <span className="rounded bg-secondary px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-secondary-foreground">
              Atu
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
