"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AugmentPicker } from "@/components/builder/augment-picker";
import { BuilderBoard } from "@/components/builder/builder-board";
import { ChampionPalette } from "@/components/builder/champion-palette";
import { ItemPanel } from "@/components/builder/item-panel";
import { SynergyPanel } from "@/components/builder/synergy-panel";
import {
  addUnitItem,
  MAX_ITEMS,
  MAX_STARS,
  MIN_STARS,
  removeUnitItemAt,
  teamGoldValue,
  toggleAugment,
} from "@/lib/builder";
import type { PlacedUnit } from "@/lib/builder";
import { computeSynergies } from "@/lib/synergy";
import type { SynergyUnit, TraitInfo } from "@/lib/synergy";
import type {
  BuilderAugment,
  BuilderChampion,
  BuilderItem,
  BuilderTraitInfo,
} from "@/server/queries/catalog";

/**
 * Public builder (US-025).
 *
 * Holds the whole board state and drives the palette + hex board. Units are
 * placed by arming a champion in the palette and clicking a hex (or dragging one
 * onto a hex), moved by selecting a placed unit and clicking a destination (or
 * dragging between hexes), and removed via the toolbar / Delete key. A snapshot
 * history backs undo/redo; "Nomes" toggles unit names and "Limpar" empties the
 * board. Everything lives in the client — nothing is written to the server
 * (US-028 will mirror the state into the URL for sharing).
 */

/** Generate a stable local id for a placed unit. */
function newUnitId(): string {
  return crypto.randomUUID();
}

const TOOLBAR_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-muted/40";

/** Star levels a unit can be set to (1–3). */
const STAR_LEVELS = Array.from(
  { length: MAX_STARS - MIN_STARS + 1 },
  (_, i) => MIN_STARS + i,
);

export function Builder({
  champions,
  traits,
  items,
  augments,
}: {
  champions: BuilderChampion[];
  traits: BuilderTraitInfo[];
  items: BuilderItem[];
  augments: BuilderAugment[];
}) {
  // Snapshot history for undo/redo. `history[cursor]` is the live board.
  const [history, setHistory] = useState<PlacedUnit[][]>([[]]);
  const [cursor, setCursor] = useState(0);
  const [armedChampionId, setArmedChampionId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  // Board-level augment selection (up to MAX_AUGMENTS). Not part of the unit
  // undo/redo history — it's an independent, comp-wide choice.
  const [selectedAugments, setSelectedAugments] = useState<string[]>([]);

  const units = history[cursor];

  const championsById = useMemo(() => {
    const map = new Map<string, BuilderChampion>();
    for (const champion of champions) map.set(champion.id, champion);
    return map;
  }, [champions]);

  const traitsById = useMemo(() => {
    const map = new Map<string, BuilderTraitInfo>();
    for (const trait of traits) map.set(trait.id, trait);
    return map;
  }, [traits]);

  const itemsById = useMemo(() => {
    const map = new Map<string, BuilderItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const augmentsById = useMemo(() => {
    const map = new Map<string, BuilderAugment>();
    for (const augment of augments) map.set(augment.id, augment);
    return map;
  }, [augments]);

  // Trait breakpoints for the synergy engine, keyed by trait id (the same key
  // `getBuilderChampions` puts on each champion trait).
  const traitInfos = useMemo<TraitInfo[]>(
    () =>
      traits.map((trait) => ({
        key: trait.id,
        name: trait.name,
        breakpoints: trait.breakpoints,
      })),
    [traits],
  );

  // Recomputed on every place/move/remove so the panel stays live.
  const activeTraits = useMemo(() => {
    const synergyUnits: SynergyUnit[] = units.map((unit) => ({
      championId: unit.championId,
      traits: (championsById.get(unit.championId)?.traits ?? []).map(
        (trait) => trait.id,
      ),
    }));
    return computeSynergies(synergyUnits, traitInfos);
  }, [championsById, traitInfos, units]);

  // Total gold value of the board (accounts for star levels).
  const teamValue = useMemo(
    () => teamGoldValue(units, (id) => championsById.get(id)?.cost ?? 0),
    [championsById, units],
  );

  const canUndo = cursor > 0;
  const canRedo = cursor < history.length - 1;

  // Push a new board snapshot, discarding any redo branch ahead of the cursor.
  const commit = useCallback(
    (next: PlacedUnit[]) => {
      setHistory((prev) => [...prev.slice(0, cursor + 1), next]);
      setCursor((prev) => prev + 1);
    },
    [cursor],
  );

  // Place a champion on a hex, replacing whatever unit is already there.
  const placeChampion = useCallback(
    (championId: string, row: number, col: number) => {
      const next = units.filter((u) => !(u.row === row && u.col === col));
      next.push({ id: newUnitId(), championId, row, col, stars: 1, items: [] });
      commit(next);
    },
    [commit, units],
  );

  // Move a unit to a hex; if the target is occupied, swap the two units.
  const moveUnit = useCallback(
    (unitId: string, row: number, col: number) => {
      const moving = units.find((u) => u.id === unitId);
      if (!moving || (moving.row === row && moving.col === col)) return;
      const occupant =
        units.find((u) => u.row === row && u.col === col && u.id !== unitId) ??
        null;
      const next = units.map((u) => {
        if (u.id === unitId) return { ...u, row, col };
        if (occupant && u.id === occupant.id) {
          return { ...u, row: moving.row, col: moving.col };
        }
        return u;
      });
      commit(next);
    },
    [commit, units],
  );

  const armChampion = useCallback((championId: string) => {
    setSelectedUnitId(null);
    setArmedChampionId((current) =>
      current === championId ? null : championId,
    );
  }, []);

  const handleHexClick = useCallback(
    (row: number, col: number) => {
      if (armedChampionId) {
        placeChampion(armedChampionId, row, col);
        return;
      }
      const occupant =
        units.find((u) => u.row === row && u.col === col) ?? null;
      if (selectedUnitId) {
        if (occupant && occupant.id === selectedUnitId) {
          setSelectedUnitId(null); // clicking the selected unit deselects it
          return;
        }
        moveUnit(selectedUnitId, row, col);
        setSelectedUnitId(null);
        return;
      }
      // Nothing armed/selected: select the clicked unit (if any).
      setSelectedUnitId(occupant ? occupant.id : null);
    },
    [armedChampionId, moveUnit, placeChampion, selectedUnitId, units],
  );

  const handleDropChampion = useCallback(
    (championId: string, row: number, col: number) => {
      if (!championsById.has(championId)) return;
      setSelectedUnitId(null);
      placeChampion(championId, row, col);
    },
    [championsById, placeChampion],
  );

  const handleMoveUnit = useCallback(
    (unitId: string, row: number, col: number) => {
      setSelectedUnitId(null);
      moveUnit(unitId, row, col);
    },
    [moveUnit],
  );

  // Set the star level (1–3) of a placed unit.
  const setUnitStars = useCallback(
    (unitId: string, stars: number) => {
      const target = units.find((u) => u.id === unitId);
      if (!target || target.stars === stars) return;
      commit(units.map((u) => (u.id === unitId ? { ...u, stars } : u)));
    },
    [commit, units],
  );

  // Equip an item on a unit (no-op when the unit is missing or already full).
  const equipItem = useCallback(
    (unitId: string, itemId: string) => {
      const target = units.find((u) => u.id === unitId);
      if (!target || target.items.length >= MAX_ITEMS) return;
      commit(
        units.map((u) =>
          u.id === unitId ? { ...u, items: addUnitItem(u.items, itemId) } : u,
        ),
      );
    },
    [commit, units],
  );

  // Remove the item at `index` from a unit.
  const removeUnitItem = useCallback(
    (unitId: string, index: number) => {
      const target = units.find((u) => u.id === unitId);
      if (!target || index < 0 || index >= target.items.length) return;
      commit(
        units.map((u) =>
          u.id === unitId
            ? { ...u, items: removeUnitItemAt(u.items, index) }
            : u,
        ),
      );
    },
    [commit, units],
  );

  // Drop an item onto a hex: equip it on whatever unit is there and select it.
  const handleDropItem = useCallback(
    (itemId: string, row: number, col: number) => {
      if (!itemsById.has(itemId)) return;
      const target = units.find((u) => u.row === row && u.col === col);
      if (!target) return;
      setSelectedUnitId(target.id);
      equipItem(target.id, itemId);
    },
    [equipItem, itemsById, units],
  );

  // Toggle a board augment (add/remove, capped at MAX_AUGMENTS).
  const handleToggleAugment = useCallback((augmentId: string) => {
    setSelectedAugments((prev) => toggleAugment(prev, augmentId));
  }, []);

  const removeSelected = useCallback(() => {
    if (!selectedUnitId) return;
    commit(units.filter((u) => u.id !== selectedUnitId));
    setSelectedUnitId(null);
  }, [commit, selectedUnitId, units]);

  const clearBoard = useCallback(() => {
    if (units.length === 0) return;
    setArmedChampionId(null);
    setSelectedUnitId(null);
    commit([]);
  }, [commit, units.length]);

  const undo = useCallback(() => {
    setSelectedUnitId(null);
    setCursor((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const redo = useCallback(() => {
    setSelectedUnitId(null);
    setCursor((prev) => (prev < history.length - 1 ? prev + 1 : prev));
  }, [history.length]);

  // Keyboard: Delete removes the selection, Escape clears armed/selection,
  // Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes. Ignored while a
  // form field (palette search/sort) has focus so typing is unaffected.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
      ) {
        return;
      }
      if (event.key === "Escape") {
        setArmedChampionId(null);
        setSelectedUnitId(null);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedUnitId) {
          event.preventDefault();
          removeSelected();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, removeSelected, selectedUnitId, undo]);

  const armedChampion = armedChampionId
    ? (championsById.get(armedChampionId) ?? null)
    : null;
  const selectedUnit = selectedUnitId
    ? (units.find((u) => u.id === selectedUnitId) ?? null)
    : null;
  const selectedChampion = selectedUnit
    ? (championsById.get(selectedUnit.championId) ?? null)
    : null;

  let hint: string;
  if (armedChampion) {
    hint = `Clique em um hex para posicionar ${armedChampion.name} (ou arraste da paleta).`;
  } else if (selectedChampion) {
    hint = `${selectedChampion.name} selecionado — clique em um hex para mover, ou remova.`;
  } else {
    hint = "Clique em um campeão e depois em um hex para posicioná-lo.";
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNames((value) => !value)}
            aria-pressed={showNames}
            className={TOOLBAR_BUTTON}
          >
            {showNames ? "Ocultar nomes" : "Nomes"}
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className={TOOLBAR_BUTTON}
          >
            Desfazer
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className={TOOLBAR_BUTTON}
          >
            Refazer
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selectedUnitId}
            className={TOOLBAR_BUTTON}
          >
            Remover
          </button>
          <button
            type="button"
            onClick={clearBoard}
            disabled={units.length === 0}
            className={TOOLBAR_BUTTON}
          >
            Limpar
          </button>

          {selectedUnit ? (
            <div
              role="group"
              aria-label="Nível de estrela"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1"
            >
              <span className="text-xs text-muted-foreground">Estrelas:</span>
              {STAR_LEVELS.map((level) => {
                const active = selectedUnit.stars === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUnitStars(selectedUnit.id, level)}
                    aria-pressed={active}
                    aria-label={`${level} estrela${level > 1 ? "s" : ""}`}
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {level}★
                  </button>
                );
              })}
            </div>
          ) : null}

          <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>
              {units.length} unidade{units.length === 1 ? "" : "s"}
            </span>
            <span aria-label={`Valor do time: ${teamValue} de ouro`}>
              Valor:{" "}
              <span className="font-semibold text-amber-300">◆{teamValue}</span>
            </span>
          </span>
        </div>

        <p aria-live="polite" className="text-xs text-muted-foreground">
          {hint}
        </p>

        <BuilderBoard
          units={units}
          championsById={championsById}
          itemsById={itemsById}
          showNames={showNames}
          armedChampionId={armedChampionId}
          selectedUnitId={selectedUnitId}
          onHexClick={handleHexClick}
          onDropChampion={handleDropChampion}
          onMoveUnit={handleMoveUnit}
          onDropItem={handleDropItem}
        />

        {selectedUnit && selectedChampion ? (
          <ItemPanel
            items={items}
            itemsById={itemsById}
            championName={selectedChampion.name}
            equipped={selectedUnit.items}
            onEquip={(itemId) => equipItem(selectedUnit.id, itemId)}
            onRemove={(index) => removeUnitItem(selectedUnit.id, index)}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
            Selecione uma unidade no tabuleiro para equipar itens (até {MAX_ITEMS}).
          </p>
        )}

        <SynergyPanel active={activeTraits} traitsById={traitsById} />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        {champions.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Catálogo de campeões indisponível.
          </p>
        ) : (
          <ChampionPalette
            champions={champions}
            armedChampionId={armedChampionId}
            onArm={armChampion}
          />
        )}

        {augments.length > 0 ? (
          <AugmentPicker
            augments={augments}
            augmentsById={augmentsById}
            selected={selectedAugments}
            onToggle={handleToggleAugment}
          />
        ) : null}
      </div>
    </div>
  );
}
