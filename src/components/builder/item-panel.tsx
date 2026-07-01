"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { IconTooltip } from "@/components/icon-tooltip";
import { ITEM_DND_PREFIX, MAX_ITEMS } from "@/lib/builder";
import type { ItemType } from "@prisma/client";
import type { BuilderItem } from "@/server/queries/catalog";

/**
 * Always-open item palette for the builder (US-027, revised).
 *
 * The item grid (tabs by family + search) is ALWAYS visible and every item is
 * draggable — drop one onto a champion on the board to equip it (no selection
 * required, tactics.tools-style). When a unit IS selected the panel also shows
 * that unit's equipped slots (each removable) and enables click-to-equip on the
 * selected unit. All board state lives in the parent.
 */

const ITEM_TABS: { key: string; label: string; types: ItemType[] }[] = [
  { key: "craftables", label: "Craftáveis", types: ["COMPLETED"] },
  { key: "radiants", label: "Radiantes", types: ["RADIANT"] },
  { key: "artifacts", label: "Artefatos", types: ["ARTIFACT"] },
  { key: "componentes", label: "Componentes", types: ["COMPONENT"] },
  { key: "outros", label: "Outros", types: ["EMBLEM", "SUPPORT", "OTHER"] },
];

interface ItemPanelProps {
  items: BuilderItem[];
  itemsById: Map<string, BuilderItem>;
  /** Selected champion name, or null when no unit is selected. */
  championName: string | null;
  /** Equipped item ids on the selected unit (empty when none is selected). */
  equipped: string[];
  /** Equip an item on the selected unit (no-op when none is selected). */
  onEquip: (itemId: string) => void;
  /** Remove the equipped item at `index` on the selected unit. */
  onRemove: (index: number) => void;
}

export function ItemPanel({
  items,
  itemsById,
  championName,
  equipped,
  onEquip,
  onRemove,
}: ItemPanelProps) {
  const [tab, setTab] = useState(ITEM_TABS[0].key);
  const [query, setQuery] = useState("");

  const hasSelection = championName !== null;
  const full = hasSelection && equipped.length >= MAX_ITEMS;

  const visible = useMemo(() => {
    const active = ITEM_TABS.find((t) => t.key === tab) ?? ITEM_TABS[0];
    const allowed = new Set(active.types);
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        allowed.has(item.type) &&
        (q === "" || item.name.toLowerCase().includes(q)),
    );
  }, [items, query, tab]);

  return (
    <section
      aria-label="Itens"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {hasSelection ? (
            <>
              Itens — <span className="text-primary">{championName}</span>
            </>
          ) : (
            "Itens"
          )}
        </h2>
        {hasSelection ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {equipped.length}/{MAX_ITEMS}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Arraste um item para um campeão no tabuleiro
          </span>
        )}
      </div>

      {/* Equipped item slots — only shown for the selected unit. */}
      {hasSelection ? (
        <ul className="flex items-center gap-2">
          {Array.from({ length: MAX_ITEMS }, (_, slot) => {
            const itemId = equipped[slot];
            const item = itemId ? itemsById.get(itemId) : undefined;
            return (
              <li key={slot}>
                {item ? (
                  <span className="group/slot relative inline-flex">
                    <IconTooltip src={item.iconUrl} name={item.name} size={40} />
                    <button
                      type="button"
                      onClick={() => onRemove(slot)}
                      aria-label={`Remover ${item.name}`}
                      className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-destructive-foreground ring-1 ring-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50"
                  >
                    +
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Tabs by item family. */}
      <div role="tablist" aria-label="Categorias de itens" className="flex flex-wrap gap-1">
        {ITEM_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="sr-only">Buscar item</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar item…"
          aria-label="Buscar item"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {full ? (
        <p className="rounded-md bg-muted/40 px-2 py-1.5 text-center text-xs text-muted-foreground">
          Esta unidade já tem {MAX_ITEMS} itens. Remova um para adicionar outro.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Nenhum item encontrado.
        </p>
      ) : (
        <ul className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "text/plain",
                    `${ITEM_DND_PREFIX}${item.id}`,
                  );
                  event.dataTransfer.effectAllowed = "copyMove";
                }}
                onClick={() => onEquip(item.id)}
                disabled={full}
                title={item.name}
                aria-label={
                  hasSelection
                    ? `Equipar ${item.name}`
                    : `${item.name} — arraste para um campeão`
                }
                className="flex w-full items-center justify-center rounded-md border border-transparent bg-muted/40 p-1 transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-muted/40"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded">
                  <Image
                    src={item.iconUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
