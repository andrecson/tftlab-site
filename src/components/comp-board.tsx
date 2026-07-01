"use client";

import Image from "next/image";
import { useState } from "react";

import { BOARD_COLS, BOARD_ROWS, BUILDER_HEX_CLIP } from "@/lib/builder";
import type { CompDetail } from "@/server/queries/comp";

/**
 * Board positioning of a comp-detail page (US-020), styled to match the builder
 * board (`builder-board.tsx`): solid-colour pointy-top hexes with a gap (a
 * per-cell wrapper inset so every hex is the same size), a slate rim for units,
 * amber for carries. Read-only — no drag/click. A "Mostrar nomes" toggle overlays
 * each unit's name. Client component (the toggle needs `useState`), but it uses
 * no request-time APIs so the comp route stays statically rendered.
 */
type CompUnitDetail = CompDetail["units"][number];

function Hex({
  unit,
  showName,
}: {
  unit: CompUnitDetail | null;
  showName: boolean;
}) {
  const carry = unit?.isCarry ?? false;
  const rimClass = unit
    ? carry
      ? "bg-amber-400"
      : "bg-slate-500/80"
    : "bg-[#35496b]";
  return (
    <div className="relative aspect-square w-[13.333%] shrink-0">
      <div
        className="absolute inset-[7%]"
        style={
          carry
            ? { filter: "drop-shadow(0 0 3px rgba(251,191,36,0.65))" }
            : undefined
        }
      >
        {/* Outer rim (the border) */}
        <span
          className={`absolute inset-0 ${rimClass}`}
          style={{ clipPath: BUILDER_HEX_CLIP }}
        />
        {/* Inner dark well */}
        <span
          className="absolute inset-[8%] bg-[#0a1322]"
          style={{ clipPath: BUILDER_HEX_CLIP }}
        />
        {unit ? (
          <span
            className="absolute inset-[8%] overflow-hidden"
            style={{ clipPath: BUILDER_HEX_CLIP }}
          >
            <Image
              src={unit.champion.iconUrl}
              alt={unit.champion.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
        ) : null}
        {unit && showName ? (
          <span className="pointer-events-none absolute inset-x-[6%] bottom-[10%] z-10 truncate rounded-sm bg-black/60 px-0.5 text-center text-[8px] font-semibold leading-tight text-foreground">
            {unit.champion.name}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A computed active synergy rendered as a chip above the board. */
export interface BoardSynergy {
  key: string;
  name: string;
  iconUrl: string;
  tier: number;
  count: number;
  nextBreakpoint: number | null;
  maxed: boolean;
}

export function CompBoard({
  units,
  synergies = [],
}: {
  units: CompDetail["units"];
  synergies?: BoardSynergy[];
}) {
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

      {/* Computed synergies (from the board units) shown above the board. */}
      {synergies.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2">
          {synergies.map((synergy) => (
            <li
              key={synergy.key}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-sm"
              title={`${synergy.name} ${synergy.count}${
                synergy.maxed || synergy.nextBreakpoint === null
                  ? ""
                  : `/${synergy.nextBreakpoint}`
              }`}
            >
              {synergy.iconUrl ? (
                <Image
                  src={synergy.iconUrl}
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px]"
                />
              ) : null}
              <span className="font-medium text-foreground">
                {synergy.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {synergy.count}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mx-auto w-full max-w-lg rounded-xl border border-[#20344f] bg-[#122236] p-3 shadow-inner sm:p-4">
        <div className="flex flex-col">
          {Array.from({ length: BOARD_ROWS }, (_, row) => (
            <div
              key={row}
              className="flex"
              style={row > 0 ? { marginTop: "-2.5%" } : undefined}
            >
              {/* Half-hex offset for odd rows via a spacer (not padding) so all
                  hexes keep the same size — mirrors the builder board. */}
              {row % 2 === 1 ? (
                <div className="w-[6.667%] shrink-0" aria-hidden="true" />
              ) : null}
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
