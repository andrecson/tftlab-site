"use client";

import Image from "next/image";

import {
  BOARD_COLS,
  BOARD_ROWS,
  BUILDER_HEX_CLIP,
  CHAMPION_DND_PREFIX,
  clampStars,
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
  onRemoveUnit: (unitId: string) => void;
  onRemoveItem: (unitId: string, index: number) => void;
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
  onRemoveUnit: (unitId: string) => void;
  onRemoveItem: (unitId: string, index: number) => void;
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
  onRemoveUnit,
  onRemoveItem,
}: HexProps) {
  const stars = unit ? clampStars(unit.stars) : 1;
  const carry = unit?.isCarry ?? false;
  const label = champion
    ? `${champion.name}, ${stars} estrela${stars > 1 ? "s" : ""}${carry ? ", carry" : ""} — linha ${row + 1}, coluna ${col + 1}`
    : `Hex vazio linha ${row + 1}, coluna ${col + 1}`;

  // Outer hex "rim" (the frame). A lighter, top-lit gradient framing the darker
  // inner well — the two tones + the inter-column gap give each hex a crisp,
  // well-defined edge (US-044). Full class strings so Tailwind keeps them.
  const rimClass = selected
    ? "bg-gradient-to-b from-[#8af2e8] via-primary to-[#0e7490]"
    : unit
      ? carry
        ? "bg-gradient-to-b from-amber-300 to-amber-600"
        : "bg-gradient-to-b from-slate-400/85 to-slate-600/75"
      : armed
        ? "bg-gradient-to-b from-primary/70 to-primary/30"
        : "bg-gradient-to-b from-[#3a4f6b] to-[#1c2c44]";

  // A soft glow that hugs the hex silhouette (drop-shadow respects clip-path)
  // to make the selected/carry states pop without a clipped-away ring.
  const glow = selected
    ? "drop-shadow(0 0 4px rgba(94,234,212,0.85))"
    : carry
      ? "drop-shadow(0 0 3px rgba(251,191,36,0.65))"
      : undefined;

  return (
    <div className="relative aspect-square w-[13.333%] shrink-0">
      <div className="absolute inset-[7%]">
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
        onDragEnd={(event) => {
          // Solto fora de qualquer hex (dropEffect "none") => retira a unidade do board.
          if (unit && event.dataTransfer.dropEffect === "none") {
            onRemoveUnit(unit.id);
          }
        }}
        className="group/hex absolute inset-0 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring"
        style={glow ? { filter: glow } : undefined}
      >
        {/* Outer rim / frame (clipped to the hex). */}
        <span
          className={`absolute inset-0 ${rimClass}`}
          style={{ clipPath: BUILDER_HEX_CLIP }}
        />
        {/* Inner well — the dark seat that frames the champion, or the empty
            hex. Brightens on hover for empty, non-armed hexes as a drop hint. */}
        <span
          className={`absolute inset-[6%] bg-[#0a1322] ${
            unit || armed
              ? ""
              : "transition-colors group-hover/hex:bg-[#182842]"
          }`}
          style={{ clipPath: BUILDER_HEX_CLIP }}
        />
        {champion ? (
          <span
            className="absolute inset-[6%] overflow-hidden"
            style={{ clipPath: BUILDER_HEX_CLIP }}
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
            className="pointer-events-none absolute inset-x-0 top-[7%] text-center text-[9px] font-semibold leading-none text-amber-300 [text-shadow:0_1px_1px_rgb(0_0_0)]"
            aria-hidden="true"
          >
            {"★".repeat(stars)}
          </span>
        ) : null}
        {carry ? (
          <span
            className="pointer-events-none absolute right-[13%] top-[16%] z-10 flex h-[24%] min-h-[10px] w-[24%] min-w-[10px] items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold leading-none text-black ring-1 ring-black/60"
            aria-hidden="true"
            title="Carry"
          >
            C
          </span>
        ) : null}
        {champion && showName ? (
          <span className="pointer-events-none absolute inset-x-[6%] bottom-[10%] truncate rounded-sm bg-black/60 px-0.5 text-center text-[8px] font-semibold leading-tight text-foreground">
            {champion.name}
          </span>
        ) : null}
      </button>
      {champion && items.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[19%] z-20 flex items-end justify-center gap-[5%] px-[13%]">
          {items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              onClick={() => unit && onRemoveItem(unit.id, index)}
              aria-label={`Remover ${item.name}`}
              title={`Remover ${item.name}`}
              className="pointer-events-auto relative block aspect-square w-[22%] overflow-hidden rounded-[2px] ring-1 ring-black/70 transition-transform hover:z-10 hover:scale-125 hover:ring-2 hover:ring-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src={item.iconUrl}
                alt=""
                fill
                sizes="16px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
      </div>
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
  onRemoveUnit,
  onRemoveItem,
}: BuilderBoardProps) {
  const byHex = unitsByHex(units);

  return (
    <div className="w-full max-w-2xl rounded-xl border border-[#20344f] bg-gradient-to-b from-[#152740] to-[#0c1a2c] p-3 shadow-inner sm:p-4">
      <div className="flex flex-col">
        {Array.from({ length: BOARD_ROWS }, (_, row) => (
          <div
            key={row}
            className="flex"
            style={row > 0 ? { marginTop: "-2.5%" } : undefined}
          >
            {/* Meia-hex de offset nas filas impares — um espacador (nao padding),
                para nao encolher o content-box e manter todos os hexes iguais. */}
            {row % 2 === 1 ? (
              <div className="w-[6.667%] shrink-0" aria-hidden="true" />
            ) : null}
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
                  onRemoveUnit={onRemoveUnit}
                  onRemoveItem={onRemoveItem}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
