import { BuilderOpenLink } from "@/components/analytics/builder-open-link";
import type { SharedBoard } from "@/lib/board-code";
import { encodeBoard } from "@/lib/board-code";
import type { CompDetail } from "@/server/queries/comp";

/**
 * "Abrir no Builder" button (US-029).
 *
 * Turns a published comp into a builder share code and links to
 * `/builder/[code]`, so a reader can open the exact composition (on-board units
 * with their positions + star levels + items, plus the comp's augments) in the
 * ephemeral builder and tweak it. The mapping mirrors what the builder encodes:
 * only units placed on the board (CORE units carry `boardRow`/`boardCol`;
 * off-board EARLY/FLEX units have null coordinates and no hex to occupy) become
 * placed units, keyed by the same catalog ids the builder catalog uses. The code
 * is generated on the server (`encodeBoard` is pure and runs in Node too); only
 * the clickable link is a small client component (`BuilderOpenLink`) so it can
 * emit the `builder_open` analytics event (US-041) on click.
 */

/** Build the shareable board (on-board units + augments) from a comp. */
function boardFromComp(comp: CompDetail): SharedBoard {
  const units = comp.units
    .filter((unit) => unit.boardRow !== null && unit.boardCol !== null)
    .map((unit) => ({
      championId: unit.championId,
      row: unit.boardRow as number,
      col: unit.boardCol as number,
      stars: unit.starLevel ?? 1,
      items: unit.items.map((unitItem) => unitItem.itemId),
    }));
  const augments = comp.augments.map((compAugment) => compAugment.augmentId);
  return { units, augments };
}

export function OpenInBuilder({ comp }: { comp: CompDetail }) {
  const code = encodeBoard(boardFromComp(comp));

  return <BuilderOpenLink href={`/builder/${code}`} compSlug={comp.slug} />;
}
