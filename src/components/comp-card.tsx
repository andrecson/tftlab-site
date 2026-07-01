import Image from "next/image";
import Link from "next/link";

import { BUILDER_HEX_CLIP } from "@/lib/builder";
import { TIER_META } from "@/lib/tiers";
import type { CompCard as CompCardData } from "@/server/queries/tierlist";
import { getCompBadges } from "@/server/services/badges";

/**
 * CompCard (US-015, revised) — tftacademy-aligned hexagon.
 *
 * In the tier list a comp is shown ONLY as a hexagon of its "cover" champion
 * (chosen when writing the guide; falls back to the first carry), with a
 * tier-colored rim (same pointy-top hex as the builder/guide board, for a
 * consistent look). No name/synergies are drawn; the name stays in
 * `aria-label`/`title`. The tile links to `/comps/[slug]` and overlays the
 * Novo/Atualizado badge.
 */
interface CompCardProps {
  comp: CompCardData;
  /** Current patch id from SiteConfig, for the Novo/Atualizado badges. */
  currentPatchId: string | null | undefined;
}

export function CompCard({ comp, currentPatchId }: CompCardProps) {
  const { isNew, isUpdated } = getCompBadges(comp, currentPatchId);
  // Cover champion chosen for the guide; fall back to the comp's first carry.
  const champion = comp.coverChampion ?? comp.units[0]?.champion ?? null;
  const rim = TIER_META[comp.tier].chipClass;

  return (
    <Link
      href={`/comps/${comp.slug}`}
      aria-label={`Ver comp ${comp.name}${comp.situational ? ` (tier ${comp.tier}, situacional)` : ""}`}
      title={comp.name}
      className="group relative block shrink-0 rounded-md transition-transform hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="relative block h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem]">
        {/* Tier-colored rim */}
        <span
          className={`absolute inset-0 ${rim}`}
          style={{ clipPath: BUILDER_HEX_CLIP }}
        />
        {/* Inner well + cover image */}
        <span
          className="absolute inset-[6%] overflow-hidden bg-[#0a1322]"
          style={{ clipPath: BUILDER_HEX_CLIP }}
        >
          {champion ? (
            <Image
              src={champion.iconUrl}
              alt={comp.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
              ?
            </span>
          )}
        </span>
      </span>

      {/* Situational comps sit in the X band; this badge shows the marked
          S/A/B/C tier so the card stays legible outside its own band. */}
      {comp.situational && (
        <span
          className={`pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/4 rounded px-1 py-px text-[10px] font-extrabold leading-none text-background ${TIER_META[comp.tier].chipClass}`}
          aria-hidden="true"
        >
          {comp.tier}
        </span>
      )}

      {(isNew || isUpdated) && (
        <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/3 rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-primary-foreground">
          {isNew ? "Novo" : "Atu"}
        </span>
      )}
    </Link>
  );
}
