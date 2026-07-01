"use client";

import Image from "next/image";

import {
  BOARD_COLS,
  BOARD_ROWS,
  CHAMPION_DND_PREFIX,
  clampStars,
  HEX_CLIP,
  hexKey,
  ITEM_DND_PREFIX,
  UNIT_DND_PREFIX,
  unitsByHex,
} from "@/lib/builder";
import type { PlacedUnit } from "@/lib/builder";
import type { BuilderChampion, BuilderItem } from "@/server/queries/catalog";

/**
 * Interactive builder board (US-025).
 *
 * A 4×7 hexagonal grid mirroring the comp-detail board geometry (percentage
 * sizing so it never scrolls horizontally). Each hex is a button:
 *  - click routes to `onHexClick(row, col)` — the parent decides place / move /
 *    select / deselect based on what is armed or selected;
 *  - champions dragged from the palette (and units dragged between hexes) drop
 *    here, routed to `onDropChampion` / `onMoveUnit`.
 *
 * Presentational: it owns no board state (the parent holds units + undo/redo).
 */
interface BuilderBoardProps {
  units: PlacedUnit[];
  championsById: Map<string, BuilderChampion>;
  itemsById: Map<string, BuilderItem>;
  showNames: boolean;
  armedChampionId: string | null;
  selectedUnitId: string | null;
  onHexClick: (row: number, col: number) => void;
  onDropChampion: (championId: string, row: number, col: number) => void;
  onMoveUnit: (unitId: string, row: number, col: number) => void;
  onDropItem: (itemId: string, row: number, col: number) => void;
}

interface HexProps {
  row: number;
  col: number;
  unit: PlacedUnit | null;
  champion: BuilderChampion | null;
  items: BuilderItem[];
  showName: boolean;
  armed: boolean;
  selected: boolean;
  onClick: () => void;
  onDropChampion: (championId: string, row: number, col: number) => void;
  onMoveUnit: (unitId: string, row: number, col: number) => void;
  onDropItem: (itemId: string, row: number, col: number) => void;
}

function Hex({
  row,
  col,
  unit,
  champion,
  items,
  showName,
  armed,
  selected,
  onClick,
  onDropChampion,
  onMoveUnit,
  onDropItem,
}: HexProps) {
  const stars = unit ? clampStars(unit.stars) : 1;
  const label = champion
    ? `${champion.name}, ${stars} estrela${stars > 1 ? "s" : ""} — linha ${row + 1}, coluna ${col + 1}`
    : `Hex vazio linha ${row + 1}, coluna ${col + 1}`;

  const ringClass = selected
    ? "bg-brand-gradient"
    : unit
      ? "bg-slate-600"
      : armed
        ? "bg-primary/40"
        : "bg-muted/30";

  return (
    <div className="relative aspect-square w-[13.333%] shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const data = event.dataTransfer.getData("text/plain");
          if (data.startsWith(CHAMPION_DND_PREFIX)) {
            onDropChampion(data.slice(CHAMPION_DND_PREFIX.length), row, col);
          } else if (data.startsWith(UNIT_DND_PREFIX)) {
            onMoveUnit(data.slice(UNIT_DND_PREFIX.length), row, col);
          } else if (data.startsWith(ITEM_DND_PREFIX)) {
            onDropItem(data.slice(ITEM_DND_PREFIX.length), row, col);
          }
        }}
        draggable={unit !== null}
        onDragStart={(event) => {
          if (!unit) return;
          event.dataTransfer.setData(
            "text/plain",
            `${UNIT_DND_PREFIX}${unit.id}`,
          );
          event.dataTransfer.effectAllowed = "move";
        }}
        className="absolute inset-0 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Ring / tile background (clipped to the hex). */}
        <span
          className={`absolute inset-[2px] ${ringClass}`}
          style={{ clipPath: HEX_CLIP }}
        />
        {champion ? (
          <span
            className={`absolute overflow-hidden ${selected ? "inset-[4px]" : "inset-[3px]"}`}
            style={{ clipPath: HEX_CLIP }}
          >
            <Image
              src={champion.iconUrl}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
        ) : null}
        {champion ? (
          <span
            className="pointer-events-none absolute inset-x-0 top-[6%] text-center text-[9px] leading-none text-amber-300 [text-shadow:0_1px_1px_rgb(0_0_0)]"
            aria-hidden="true"
          >
            {"★".repeat(stars)}
          </span>
        ) : null}
        {champion && items.length > 0 ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-[16%] flex items-end justify-center gap-[3%] px-[6%]">
            {items.map((item, index) => (
              <span
                key={`${item.id}-${index}`}
                className="relative block aspect-square w-[24%] overflow-hidden rounded-[2px] ring-1 ring-black/70"
              >
                <Image
                  src={item.iconUrl}
                  alt=""
                  fill
                  sizes="16px"
                  className="object-cover"
                />
              </span>
            ))}
          </span>
        ) : null}
        {champion && showName ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-0.5 text-center text-[8px] font-semibold leading-tight text-foreground [text-shadow:0_1px_2px_rgb(0_0_0)]">
            {champion.name}
          </span>
        ) : null}
      </button>
    </div>
  );
}

export function BuilderBoard({
  units,
  championsById,
  itemsById,
  showNames,
  armedChampionId,
  selectedUnitId,
  onHexClick,
  onDropChampion,
  onMoveUnit,
  onDropItem,
}: BuilderBoardProps) {
  const byHex = unitsByHex(units);

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg border border-border bg-card/40 p-2 sm:p-3">
      <div className="flex flex-col">
        {Array.from({ length: BOARD_ROWS }, (_, row) => (
          <div
            key={row}
            className={`flex ${row % 2 === 1 ? "pl-[6.667%]" : ""}`}
            style={row > 0 ? { marginTop: "-2.5%" } : undefined}
          >
            {Array.from({ length: BOARD_COLS }, (_, col) => {
              const unit = byHex.get(hexKey(row, col)) ?? null;
              const champion = unit
                ? (championsById.get(unit.championId) ?? null)
                : null;
              const items = unit
                ? unit.items
                    .map((id) => itemsById.get(id))
                    .filter((item): item is BuilderItem => item !== undefined)
                : [];
              return (
                <Hex
                  key={col}
                  row={row}
                  col={col}
                  unit={unit}
                  champion={champion}
                  items={items}
                  showName={showNames}
                  armed={armedChampionId !== null}
                  selected={unit !== null && unit.id === selectedUnitId}
                  onClick={() => onHexClick(row, col)}
                  onDropChampion={onDropChampion}
                  onMoveUnit={onMoveUnit}
                  onDropItem={onDropItem}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
