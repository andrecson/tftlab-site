"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { AugmentCategory, ItemType } from "@prisma/client";
import type { BuilderItem } from "@/server/queries/catalog";
import type { AdminCompPriority } from "@/server/queries/admin";
import { updateCompPriority } from "@/actions/comps";
import {
  CatalogPicker,
  type CatalogOption,
} from "@/components/admin/catalog-picker";

/**
 * Comp priority editor (US-036): the overall item-priority list
 * (`CompItemPriority`, ordered) and the augment-category preference
 * (`augmentPriority`, an ordering of ECON/ITEMS/COMBAT). Rendered below the
 * composition editor on the edit page (a comp must already exist so it has an
 * id).
 *
 * Client component so it can drive the item `CatalogPicker` and call the
 * `updateCompPriority` server action directly (React 18.3 has no
 * `useActionState`, so we mirror the composition form: `useState` + await the
 * action). Per-unit equipped items and the recommended augment list belong to
 * the builder (US-037), so this form owns only the ordered item priority and the
 * ordered augment categories.
 *
 * Items are added via a single-select `CatalogPicker` used as a pure "add"
 * control (its `value` stays null, already-added items are filtered out of its
 * options); the added items render as an ordered list with up/down reorder
 * controls. Augment categories render as an ordered list too, with buttons to
 * add any category not yet chosen.
 */

/** Readable pt-BR labels for the item types (shown as the picker's meta line). */
const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  COMPLETED: "Craftável",
  RADIANT: "Radiante",
  ARTIFACT: "Artefato",
  COMPONENT: "Componente",
  EMBLEM: "Emblema",
  SUPPORT: "Suporte",
  OTHER: "Outro",
};

/** Augment-priority categories, in enum order (mirrors the public comp page). */
const AUGMENT_CATEGORIES: readonly AugmentCategory[] = [
  "ECON",
  "ITEMS",
  "COMBAT",
];

/** Readable pt-BR labels for the augment-priority categories. */
const CATEGORY_LABEL: Record<AugmentCategory, string> = {
  ECON: "Economia",
  ITEMS: "Itens",
  COMBAT: "Combate",
};

interface CompPriorityFormProps {
  compId: string;
  /** Item catalog for the comp's set (item-priority picker). */
  items: BuilderItem[];
  /** The comp's currently saved priority. */
  initial: AdminCompPriority;
}

export function CompPriorityForm({
  compId,
  items,
  initial,
}: CompPriorityFormProps) {
  const [itemIds, setItemIds] = useState<string[]>(() => initial.itemIds);
  const [augmentPriority, setAugmentPriority] = useState<AugmentCategory[]>(
    () => initial.augmentPriority,
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  // Catalog lookup + picker options (mapped to the CatalogPicker shape).
  const itemsById = useMemo(() => {
    const map = new Map<string, BuilderItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const itemOptions = useMemo<CatalogOption[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        iconUrl: item.iconUrl,
        meta: ITEM_TYPE_LABEL[item.type],
      })),
    [items],
  );

  // Items not yet added — the single-select "add" picker only offers these.
  const addableItemOptions = useMemo<CatalogOption[]>(() => {
    const chosen = new Set(itemIds);
    return itemOptions.filter((o) => !chosen.has(o.id));
  }, [itemOptions, itemIds]);

  // Augment categories not yet chosen — offered as "add" buttons.
  const addableCategories = useMemo(
    () => AUGMENT_CATEGORIES.filter((c) => !augmentPriority.includes(c)),
    [augmentPriority],
  );

  function markDirty() {
    if (saved) setSaved(false);
    if (error) setError(null);
  }

  function addItem(itemId: string) {
    setItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    markDirty();
  }

  function removeItem(itemId: string) {
    setItemIds((prev) => prev.filter((id) => id !== itemId));
    markDirty();
  }

  function moveItem(index: number, delta: number) {
    setItemIds((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  }

  function addCategory(category: AugmentCategory) {
    setAugmentPriority((prev) =>
      prev.includes(category) ? prev : [...prev, category],
    );
    markDirty();
  }

  function removeCategory(category: AugmentCategory) {
    setAugmentPriority((prev) => prev.filter((c) => c !== category));
    markDirty();
  }

  function moveCategory(index: number, delta: number) {
    setAugmentPriority((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  }

  async function onSave() {
    setError(null);
    setPending(true);

    const result = await updateCompPriority(compId, {
      itemIds,
      augmentPriority,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-border bg-card/40 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Prioridade de itens e augments
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina a ordem geral de prioridade dos itens e a preferência de
          categorias de augment (Economia, Itens, Combate).
        </p>
      </div>

      {/* Item priority editor */}
      <div className="flex flex-col gap-3">
        <CatalogPicker
          label="Adicionar item à prioridade"
          hint="Selecione um item para adicioná-lo ao fim da lista de prioridade."
          options={addableItemOptions}
          value={null}
          onChange={(id) => id && addItem(id)}
          placeholder="Buscar item…"
          emptyLabel="Nenhum item encontrado."
        />

        {itemIds.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {itemIds.map((itemId, index) => {
              const info = itemsById.get(itemId);
              return (
                <li
                  key={itemId}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  {info ? (
                    <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded bg-muted">
                      <Image
                        src={info.iconUrl}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {info?.name ?? "(item desconhecido)"}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${info?.name ?? "item"} para cima`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === itemIds.length - 1}
                      aria-label={`Mover ${info?.name ?? "item"} para baixo`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(itemId)}
                      aria-label={`Remover ${info?.name ?? "item"}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum item na lista de prioridade.
          </p>
        )}
      </div>

      {/* Augment-category priority editor */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Prioridade de augments
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ordene as categorias por preferência (a primeira é a mais
            prioritária).
          </p>
        </div>

        {augmentPriority.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {augmentPriority.map((category, index) => (
              <li
                key={category}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5"
              >
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {CATEGORY_LABEL[category]}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover ${CATEGORY_LABEL[category]} para cima`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === augmentPriority.length - 1}
                    aria-label={`Mover ${CATEGORY_LABEL[category]} para baixo`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    aria-label={`Remover ${CATEGORY_LABEL[category]}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma categoria de augment selecionada.
          </p>
        )}

        {addableCategories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Adicionar:</span>
            {addableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => addCategory(category)}
                className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                + {CATEGORY_LABEL[category]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-primary">
          Prioridade salva.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar prioridade"}
        </button>
      </div>
    </section>
  );
}
