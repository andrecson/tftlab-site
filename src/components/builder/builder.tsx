"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AugmentPicker } from "@/components/builder/augment-picker";
import { BuilderBoard } from "@/components/builder/builder-board";
import { ChampionPalette } from "@/components/builder/champion-palette";
import { ItemPanel } from "@/components/builder/item-panel";
import { SynergyPanel } from "@/components/builder/synergy-panel";
import { encodeBoard } from "@/lib/board-code";
import {
  addUnitItem,
  BOARD_COLS,
  BOARD_ROWS,
  MAX_AUGMENTS,
  MAX_ITEMS,
  MAX_STARS,
  MIN_STARS,
  removeUnitItemAt,
  teamGoldValue,
  toggleAugment,
} from "@/lib/builder";
import type { PlacedUnit } from "@/lib/builder";
import { buildTeamPlannerCode } from "@/lib/team-planner";
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
 * board. Everything lives in the client — nothing is written to the server.
 *
 * The board is shareable by link (US-028): the whole state (units + augments) is
 * encoded into the URL path (`/builder/[code]`) on every edit and "Copiar link"
 * copies that URL. `initialUnits`/`initialAugments` seed the board when opening a
 * shared code.
 *
 * Admin save mode (US-037): passing `onSave` switches the builder into the
 * admin's "final board" editor. It adds a carry toggle (per selected unit) and a
 * "Salvar board" button, and stops mirroring the state into the URL / hides the
 * share button (the admin persists to the DB instead of sharing a code). The same
 * component powers the public builder and the admin build page.
 */

/** Result of an admin save (US-037). */
export interface BuilderSaveResult {
  ok: boolean;
  error?: string;
}

/** Generate a stable local id for a placed unit. */
function newUnitId(): string {
  return crypto.randomUUID();
}

const TOOLBAR_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-muted/40";

export function Builder({
  champions,
  traits,
  items,
  augments,
  initialUnits = [],
  initialAugments = [],
  maxAugments = MAX_AUGMENTS,
  teamPlannerCodes,
  teamPlannerSet,
  onSave,
}: {
  champions: BuilderChampion[];
  traits: BuilderTraitInfo[];
  items: BuilderItem[];
  augments: BuilderAugment[];
  initialUnits?: PlacedUnit[];
  initialAugments?: string[];
  /** Max augments selectable (default MAX_AUGMENTS; pass Infinity for unlimited). */
  maxAugments?: number;
  /** apiId → team_planner_code for the in-game Team Planner export (see lib/team-planner). */
  teamPlannerCodes?: Record<string, number>;
  /** Set token suffix for the team-planner code (e.g. "TFTSet17"); "" disables it. */
  teamPlannerSet?: string;
  /**
   * When provided, the builder runs in admin save mode (US-037): it persists the
   * board through this callback instead of mirroring it into the URL. Receives
   * the live placed units (with `isCarry`) and the selected augment ids.
   */
  onSave?: (
    units: PlacedUnit[],
    augments: string[],
  ) => Promise<BuilderSaveResult>;
}) {
  const adminMode = typeof onSave === "function";
  // Snapshot history for undo/redo. `history[cursor]` is the live board. Seeded
  // from a shared code's units when opening `/builder/[code]` (US-028).
  const [history, setHistory] = useState<PlacedUnit[][]>([initialUnits]);
  const [cursor, setCursor] = useState(0);
  const [armedChampionId, setArmedChampionId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  // Board-level augment selection (up to MAX_AUGMENTS). Not part of the unit
  // undo/redo history — it's an independent, comp-wide choice.
  const [selectedAugments, setSelectedAugments] =
    useState<string[]>(initialAugments);
  // Transient "Link copiado!" toast state for the share button.
  const [copied, setCopied] = useState(false);
  // Transient "Código copiado!" toast for the in-game team-planner export.
  const [gameCodeCopied, setGameCodeCopied] = useState(false);
  // Admin save mode (US-037): in-flight + result feedback for "Salvar board".
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

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

  // Encode the whole board (units + augments) into a URL-safe share code. Local
  // ids are ephemeral, so they're stripped before encoding (US-028).
  const shareCode = useMemo(
    () =>
      encodeBoard({
        units: units.map((unit) => ({
          championId: unit.championId,
          row: unit.row,
          col: unit.col,
          stars: unit.stars,
          items: unit.items,
        })),
        augments: selectedAugments,
      }),
    [selectedAugments, units],
  );
  const isEmptyBoard = units.length === 0 && selectedAugments.length === 0;
  const sharePath = isEmptyBoard ? "/builder" : `/builder/${shareCode}`;

  // Mirror the board into the URL path without a Next navigation — keeps the
  // page static and the builder purely client-side. Reloading the resulting
  // `/builder/[code]` URL reconstructs this exact board. Skipped in admin save
  // mode (US-037): the admin edits a specific comp at its own URL and persists
  // to the DB, so the board must not hijack the address bar.
  useEffect(() => {
    if (adminMode || typeof window === "undefined") return;
    const url = sharePath + window.location.search + window.location.hash;
    window.history.replaceState(window.history.state, "", url);
  }, [adminMode, sharePath]);

  // Auto-clear the "Link copiado!" toast.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  // Auto-clear the "Código copiado!" toast.
  useEffect(() => {
    if (!gameCodeCopied) return;
    const timer = setTimeout(() => setGameCodeCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [gameCodeCopied]);

  // Auto-clear the "Board salvo" confirmation (US-037).
  useEffect(() => {
    if (!savedOk) return;
    const timer = setTimeout(() => setSavedOk(false), 2500);
    return () => clearTimeout(timer);
  }, [savedOk]);

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.origin + sharePath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked (insecure context / denied permission);
      // the address bar already reflects the board, so copying it still works.
    }
  }, [sharePath]);

  // In-game Team Planner export code for the current board (see lib/team-planner).
  const gameCode = useMemo(() => {
    if (!teamPlannerSet) return null;
    const apiIds = units
      .map((unit) => championsById.get(unit.championId)?.apiId)
      .filter((id): id is string => Boolean(id));
    return buildTeamPlannerCode(apiIds, teamPlannerCodes ?? {}, teamPlannerSet);
  }, [championsById, teamPlannerCodes, teamPlannerSet, units]);

  const copyGameCode = useCallback(async () => {
    if (!gameCode?.code || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(gameCode.code);
      setGameCodeCopied(true);
    } catch {
      // Clipboard can be blocked (insecure context / denied permission).
    }
  }, [gameCode]);

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
      next.push({
        id: newUnitId(),
        championId,
        row,
        col,
        stars: MIN_STARS, // base: no star shown (toggle to 3★ to change)
        items: [],
        isCarry: false,
      });
      commit(next);
      // Adicionar um campeao des-seleciona a paleta (nao fica "grudado").
      setArmedChampionId(null);
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

  // Clicar num campeao o coloca direto no primeiro hex vazio do tabuleiro.
  const pickChampion = useCallback(
    (championId: string) => {
      setSelectedUnitId(null);
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let col = 0; col < BOARD_COLS; col += 1) {
          if (!units.some((u) => u.row === row && u.col === col)) {
            placeChampion(championId, row, col);
            return;
          }
        }
      }
    },
    [placeChampion, units],
  );

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

  // Set a placed unit's star level. The builder toggles between 1 (base, no
  // star shown) and 3; 2 is never set here.
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
  const handleToggleAugment = useCallback(
    (augmentId: string) => {
      setSelectedAugments((prev) => toggleAugment(prev, augmentId, maxAugments));
    },
    [maxAugments],
  );

  // Admin (US-037): toggle a placed unit's carry flag (undoable via history).
  const toggleSelectedCarry = useCallback(() => {
    if (!selectedUnitId) return;
    commit(
      units.map((u) =>
        u.id === selectedUnitId ? { ...u, isCarry: !u.isCarry } : u,
      ),
    );
  }, [commit, selectedUnitId, units]);

  // Admin (US-037): persist the current board to the DB via the `onSave` prop.
  const handleSave = useCallback(async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const result = await onSave(units, selectedAugments);
      if (result.ok) setSavedOk(true);
      else setSaveError(result.error ?? "Falha ao salvar o board.");
    } catch {
      setSaveError("Erro inesperado ao salvar o board.");
    } finally {
      setSaving(false);
    }
  }, [onSave, saving, selectedAugments, units]);

  const removeSelected = useCallback(() => {
    if (!selectedUnitId) return;
    commit(units.filter((u) => u.id !== selectedUnitId));
    setSelectedUnitId(null);
  }, [commit, selectedUnitId, units]);

  // Remove a specific unit — used when it is dragged off the board.
  const removeUnit = useCallback(
    (unitId: string) => {
      commit(units.filter((u) => u.id !== unitId));
      setSelectedUnitId((cur) => (cur === unitId ? null : cur));
    },
    [commit, units],
  );

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

  const selectedUnit = selectedUnitId
    ? (units.find((u) => u.id === selectedUnitId) ?? null)
    : null;
  const selectedChampion = selectedUnit
    ? (championsById.get(selectedUnit.championId) ?? null)
    : null;

  let hint: string;
  if (selectedChampion) {
    hint = `${selectedChampion.name} selecionado — clique em um hex para mover, ou arraste para fora do tabuleiro para remover.`;
  } else {
    hint =
      "Clique num campeão para adicioná-lo ao tabuleiro (ou arraste para um hex). Arraste um campeão para fora para removê-lo.";
  }

  return (
    <div className="flex flex-col gap-4">
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
          {adminMode ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar board"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={copyLink}
                aria-label="Copiar link do time"
                className={TOOLBAR_BUTTON}
              >
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
              {gameCode?.code ? (
                <button
                  type="button"
                  onClick={copyGameCode}
                  aria-label="Copiar código para o Team Planner do jogo"
                  title="Cole no Planejador de Equipes do TFT (Team Planner)"
                  className={TOOLBAR_BUTTON}
                >
                  {gameCodeCopied ? "Código copiado!" : "Código do jogo"}
                </button>
              ) : null}
            </>
          )}

          {selectedUnit ? (
            <button
              type="button"
              onClick={() =>
                setUnitStars(
                  selectedUnit.id,
                  selectedUnit.stars === MAX_STARS ? MIN_STARS : MAX_STARS,
                )
              }
              aria-pressed={selectedUnit.stars === MAX_STARS}
              aria-label="Três estrelas"
              title="Alternar 3 estrelas"
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedUnit.stars === MAX_STARS
                  ? "border-amber-300/60 bg-amber-400/20 text-amber-200 [text-shadow:0_0_5px_rgba(251,191,36,0.55)]"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>3</span>
              <span
                aria-hidden="true"
                className={
                  selectedUnit.stars === MAX_STARS
                    ? "text-amber-300"
                    : "text-amber-400/70"
                }
              >
                ★
              </span>
            </button>
          ) : null}

          {adminMode && selectedUnit ? (
            <button
              type="button"
              onClick={toggleSelectedCarry}
              aria-pressed={selectedUnit.isCarry}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedUnit.isCarry
                  ? "border-amber-300/50 bg-amber-400/20 text-amber-200"
                  : "border-border bg-muted/40 text-foreground hover:bg-muted"
              }`}
            >
              {selectedUnit.isCarry ? "★ Carry" : "Marcar carry"}
            </button>
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

        {adminMode && (saveError || savedOk) ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-xs font-medium ${
              saveError ? "text-destructive" : "text-emerald-400"
            }`}
          >
            {saveError ?? "Board salvo."}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="w-full lg:w-52 lg:shrink-0">
            <SynergyPanel active={activeTraits} traitsById={traitsById} />
          </div>
          <div className="min-w-0 flex-1">
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
              onRemoveUnit={removeUnit}
              onRemoveItem={removeUnitItem}
            />
          </div>
          {augments.length > 0 ? (
            <div className="w-full lg:w-44 lg:shrink-0">
              <AugmentPicker
                augments={augments}
                augmentsById={augmentsById}
                selected={selectedAugments}
                onToggle={handleToggleAugment}
                maxAugments={maxAugments}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-[3]">
            {champions.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Catálogo de campeões indisponível.
              </p>
            ) : (
              <ChampionPalette
                champions={champions}
                armedChampionId={armedChampionId}
                onArm={pickChampion}
              />
            )}
          </div>

          <div className="min-w-0 flex-[2]">
            <ItemPanel
              items={items}
              championName={selectedChampion ? selectedChampion.name : null}
              equipped={selectedUnit ? selectedUnit.items : []}
              onEquip={(itemId) => {
                if (selectedUnit) equipItem(selectedUnit.id, itemId);
              }}
            />
          </div>
        </div>
    </div>
  );
}
