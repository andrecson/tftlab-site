"use client";

import Image from "next/image";
import { useState } from "react";

import type { CompDetail } from "@/server/queries/comp";

/**
 * Board positioning of a comp-detail page (US-020).
 *
 * `CompBoard` renders the final composition on a 4×7 hexagonal grid, placing each
 * on-board unit at its `boardRow`/`boardCol` (0-indexed; off-board EARLY/FLEX
 * units — null coords — are excluded). Odd rows are shifted half a hex so the
 * cells interlock into a honeycomb, and the whole board is sized in percentages
 * so it scales down to mobile width with NO horizontal scroll.
 *
 * A "Mostrar nomes" toggle overlays each unit's name; carries are highlighted
 * with the brand gradient ring. This is a client component (the toggle needs
 * `useState`) — that does not make the page dynamic (no request-time APIs), so
 * the comp route stays statically rendered.
 */
const BOARD_ROWS = 4;
const BOARD_COLS = 7;

/** Pointy-top hexagon — cells offset horizontally + overlapped form a honeycomb. */
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

type CompUnitDetail = CompDetail["units"][number];

function Hex({ unit, showName }: { unit: CompUnitDetail | null; showName: boolean }) {
  const carry = unit?.isCarry ?? false;
  return (
    <div className="relative aspect-square w-[13.333%] shrink-0">
      {/* Carry glow — a slightly larger gradient hex behind the tile. */}
      {carry ? (
        <div
          className="absolute inset-0 bg-brand-gradient opacity-90 drop-shadow-[0_0_4px_rgba(94,234,212,0.6)]"
          style={{ clipPath: HEX_CLIP }}
        />
      ) : null}
      {/* Ring / tile background (clipped to the hex). */}
      <div
        className={
          unit
            ? carry
              ? "absolute inset-[2px] bg-brand-gradient"
              : "absolute inset-[2px] bg-slate-600"
            : "absolute inset-[2px] bg-muted/30"
        }
        style={{ clipPath: HEX_CLIP }}
      />
      {unit ? (
        <div
          className={`absolute overflow-hidden ${carry ? "inset-[4px]" : "inset-[3px]"}`}
          style={{ clipPath: HEX_CLIP }}
        >
          <Image
            src={unit.champion.iconUrl}
            alt={unit.champion.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : null}
      {unit && showName ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 truncate px-0.5 text-center text-[8px] font-semibold leading-tight text-foreground [text-shadow:0_1px_2px_rgb(0_0_0)]">
          {unit.champion.name}
        </span>
      ) : null}
    </div>
  );
}

export function CompBoard({ units }: { units: CompDetail["units"] }) {
  const [showNames, setShowNames] = useState(false);

  const byHex = new Map<string, CompUnitDetail>();
  for (const unit of units) {
    if (unit.boardRow !== null && unit.boardCol !== null) {
      byHex.set(`${unit.boardRow}-${unit.boardCol}`, unit);
    }
  }

  if (byHex.size === 0) return null;

  return (
    <section aria-labelledby="board-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="board-heading" className="text-lg font-semibold text-foreground">
          Posicionamento
        </h2>
        <button
          type="button"
          onClick={() => setShowNames((value) => !value)}
          aria-pressed={showNames}
          className="rounded-md border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          {showNames ? "Ocultar nomes" : "Mostrar nomes"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card/40 p-2 sm:p-3">
        <div className="flex flex-col">
          {Array.from({ length: BOARD_ROWS }, (_, row) => (
            <div
              key={row}
              className={`flex ${row % 2 === 1 ? "pl-[6.667%]" : ""}`}
              style={row > 0 ? { marginTop: "-2.5%" } : undefined}
            >
              {Array.from({ length: BOARD_COLS }, (_, col) => (
                <Hex
                  key={col}
                  unit={byHex.get(`${row}-${col}`) ?? null}
                  showName={showNames}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
