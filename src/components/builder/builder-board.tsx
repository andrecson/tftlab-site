"use client";

import Image from "next/image";

import {
  BOARD_COLS,
  BOARD_ROWS,
  CHAMPION_DND_PREFIX,
  HEX_CLIP,
  hexKey,
  UNIT_DND_PREFIX,
  unitsByHex,
} from "@/lib/builder";
import type { PlacedUnit } from "@/lib/builder";
import type { BuilderChampion } from "@/server/queries/catalog";

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
  showNames: boolean;
  armedChampionId: string | null;
  selectedUnitId: string | null;
  onHexClick: (row: number, col: number) => void;
  onDropChampion: (championId: string, row: number, col: number) => void;
  onMoveUnit: (unitId: string, row: number, col: number) => void;
}

interface HexProps {
  row: number;
  col: number;
  unit: PlacedUnit | null;
  champion: BuilderChampion | null;
  showName: boolean;
  armed: boolean;
  selected: boolean;
  onClick: () => void;
  onDropChampion: (championId: string, row: number, col: number) => void;
  onMoveUnit: (unitId: string, row: number, col: number) => void;
}

function Hex({
  row,
  col,
  unit,
  champion,
  showName,
  armed,
  selected,
  onClick,
  onDropChampion,
  onMoveUnit,
}: HexProps) {
  const label = champion
    ? `${champion.name} — linha ${row + 1}, coluna ${col + 1}`
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
  showNames,
  armedChampionId,
  selectedUnitId,
  onHexClick,
  onDropChampion,
  onMoveUnit,
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
              return (
                <Hex
                  key={col}
                  row={row}
                  col={col}
                  unit={unit}
                  champion={champion}
                  showName={showNames}
                  armed={armedChampionId !== null}
                  selected={unit !== null && unit.id === selectedUnitId}
                  onClick={() => onHexClick(row, col)}
                  onDropChampion={onDropChampion}
                  onMoveUnit={onMoveUnit}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
