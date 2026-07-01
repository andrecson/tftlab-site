import Image from "next/image";
import Link from "next/link";
import type { Tier } from "@prisma/client";

import type { CompCard as CompCardData } from "@/server/queries/tierlist";
import { getCompBadges } from "@/server/services/badges";

/**
 * CompCard (US-015).
 *
 * The scannable card shown in each tier-list band: comp name, its main trait
 * icons (with active level) and its carry champions, on a muted background with
 * a tier-colored left border. Derives the Novo/Atualizado badges from the
 * badges service. The whole card is a link to `/comps/[slug]` with an
 * accessible name, so it is reachable and openable by keyboard.
 *
 * Tier border classes are written out in full (never interpolated) so
 * Tailwind's content scanner keeps `border-l-tier-*` in the build — same rule
 * as the tier-list page.
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

  return (
    <Link
      href={`/comps/${comp.slug}`}
      aria-label={`Ver comp ${comp.name}`}
      className={`group flex w-full flex-col gap-3 rounded-lg border border-l-4 border-border bg-muted/40 p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${TIER_BORDER[comp.tier]} sm:w-72`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
          {comp.name}
        </h3>
        {(isNew || isUpdated) && (
          <div className="flex shrink-0 gap-1">
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
        )}
      </div>

      {comp.units.length > 0 && (
        <ul className="flex flex-wrap items-start gap-2">
          {comp.units.map((unit) => (
            <li key={unit.id} className="flex w-12 flex-col items-center gap-1">
              <span className="relative block h-10 w-10 overflow-hidden rounded-md ring-1 ring-border">
                <Image
                  src={unit.champion.iconUrl}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                {unit.champion.name}
              </span>
            </li>
          ))}
        </ul>
      )}

      {comp.traits.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          {comp.traits.map((compTrait) => (
            <li
              key={compTrait.id}
              className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
              title={`${compTrait.trait.name} ${compTrait.level}`}
            >
              <Image
                src={compTrait.trait.iconUrl}
                alt={compTrait.trait.name}
                width={14}
                height={14}
                className="h-3.5 w-3.5"
              />
              <span className="font-medium tabular-nums">{compTrait.level}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
