"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { IconTooltip } from "@/components/icon-tooltip";
import { ITEM_DND_PREFIX, MAX_ITEMS } from "@/lib/builder";
import type { ItemType } from "@prisma/client";
import type { BuilderItem } from "@/server/queries/catalog";

/**
 * Item panel for the builder (US-027).
 *
 * Shown when a unit is selected. It has tabs by item family
 * (craftables/radiants/artifacts/components/others) plus a text search, and a
 * grid of items. Clicking an item equips it on the selected unit (up to
 * `MAX_ITEMS`); items are also draggable so they can be dropped straight onto a
 * hex. The top strip shows the selected champion's equipped items, each
 * removable. All state (which unit, its items) lives in the parent.
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
  /** Name of the selected champion (panel header). */
  championName: string;
  /** Equipped item ids on the selected unit (slot order). */
  equipped: string[];
  /** Equip an item on the selected unit. */
  onEquip: (itemId: string) => void;
  /** Remove the equipped item at `index`. */
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

  const full = equipped.length >= MAX_ITEMS;

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
          Itens — <span className="text-primary">{championName}</span>
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {equipped.length}/{MAX_ITEMS}
        </span>
      </div>

      {/* Equipped item slots for the selected unit. */}
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
        <ul className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
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
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onEquip(item.id)}
                disabled={full}
                title={item.name}
                aria-label={`Equipar ${item.name}`}
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
