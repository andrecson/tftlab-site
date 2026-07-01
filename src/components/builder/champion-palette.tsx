"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { CHAMPION_DND_PREFIX } from "@/lib/builder";
import { costClass } from "@/lib/champion-cost";
import type { BuilderChampion } from "@/server/queries/catalog";

/**
 * Champion palette for the builder (US-025).
 *
 * Lists the current set's champions with text search and a sort control
 * (custo / nome / origem / classe). Clicking a champion "arms" it (the parent
 * then places it on the next clicked hex); champions are also draggable so they
 * can be dropped onto a hex. Search/sort is local UI state — the board itself
 * (and its undo/redo history) lives in the parent.
 *
 * NOTE on origem/classe: the schema stores traits without an explicit
 * origin/class flag, so we approximate — "origem" sorts by a champion's first
 * trait (alphabetically) and "classe" by its last, which still gives a stable,
 * useful grouping by synergy.
 */

type SortKey = "custo" | "nome" | "origem" | "classe";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "custo", label: "Custo" },
  { key: "nome", label: "Nome" },
  { key: "origem", label: "Origem" },
  { key: "classe", label: "Classe" },
];

function firstTrait(champion: BuilderChampion): string {
  return champion.traits[0]?.name ?? "";
}

function lastTrait(champion: BuilderChampion): string {
  return champion.traits[champion.traits.length - 1]?.name ?? "";
}

function sortChampions(
  champions: BuilderChampion[],
  sort: SortKey,
): BuilderChampion[] {
  const byName = (a: BuilderChampion, b: BuilderChampion) =>
    a.name.localeCompare(b.name);
  const copy = [...champions];
  switch (sort) {
    case "nome":
      return copy.sort(byName);
    case "origem":
      return copy.sort(
        (a, b) => firstTrait(a).localeCompare(firstTrait(b)) || byName(a, b),
      );
    case "classe":
      return copy.sort(
        (a, b) => lastTrait(a).localeCompare(lastTrait(b)) || byName(a, b),
      );
    case "custo":
    default:
      return copy.sort((a, b) => a.cost - b.cost || byName(a, b));
  }
}

interface ChampionPaletteProps {
  champions: BuilderChampion[];
  /** Currently armed champion id (highlighted); null when none is armed. */
  armedChampionId: string | null;
  /** Toggle-arm a champion for click-to-place. */
  onArm: (championId: string) => void;
}

export function ChampionPalette({
  champions,
  armedChampionId,
  onArm,
}: ChampionPaletteProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("custo");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? champions.filter((champion) => {
          const haystack = [
            champion.name,
            ...champion.traits.map((trait) => trait.name),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
      : champions;
    return sortChampions(filtered, sort);
  }, [champions, query, sort]);

  return (
    <section
      aria-label="Campeões"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">Buscar campeão</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar campeão ou sinergia…"
            aria-label="Buscar campeão"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Ordenar</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Ordenar campeões"
            className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Nenhum campeão encontrado.
        </p>
      ) : (
        <ul className="grid max-h-[30rem] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10">
          {visible.map((champion) => {
            const armed = champion.id === armedChampionId;
            return (
              <li key={champion.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "text/plain",
                      `${CHAMPION_DND_PREFIX}${champion.id}`,
                    );
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onArm(champion.id)}
                  aria-pressed={armed}
                  title={champion.name}
                  className={`flex w-full flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    armed
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/40 hover:border-border hover:bg-muted"
                  }`}
                >
                  <span className="relative block aspect-square w-full overflow-hidden rounded">
                    <Image
                      src={champion.iconUrl}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </span>
                  <span className="line-clamp-1 w-full text-[11px] font-medium leading-tight text-foreground">
                    {champion.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded border px-1 text-[10px] font-semibold leading-tight tabular-nums ${costClass(
                      champion.cost,
                    )}`}
                    aria-label={`Custo ${champion.cost}`}
                  >
                    <span aria-hidden="true">◆</span>
                    {champion.cost}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
