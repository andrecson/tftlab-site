"use client";

import { useState } from "react";

import { CatalogPicker } from "@/components/admin/catalog-picker";
import type { CatalogOption } from "@/components/admin/catalog-picker";

/**
 * Catalog explorer (US-032).
 *
 * Hosts the reusable `CatalogPicker` for each catalog family so a curator can
 * search the current set and see exactly what the admin comp forms (US-034..037)
 * will bind: a SINGLE-selection example (one carry) and MULTIPLE-selection
 * examples (champions/items/traits/augments). It exercises both modes of the
 * component and renders the returned ids so the selection contract is visible.
 * All picker state is owned here (controlled components) — the picker itself is
 * stateless about selection, exactly how the forms will consume it.
 */
interface CatalogExplorerProps {
  champions: CatalogOption[];
  items: CatalogOption[];
  traits: CatalogOption[];
  augments: CatalogOption[];
}

export function CatalogExplorer({
  champions,
  items,
  traits,
  augments,
}: CatalogExplorerProps) {
  const [carry, setCarry] = useState<string | null>(null);
  const [pickedChampions, setPickedChampions] = useState<string[]>([]);
  const [pickedItems, setPickedItems] = useState<string[]>([]);
  const [pickedTraits, setPickedTraits] = useState<string[]>([]);
  const [pickedAugments, setPickedAugments] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-6">
      {/* Single-selection example */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">
          Seleção única
        </h2>
        <div className="mt-3 max-w-md">
          <CatalogPicker
            label="Carry principal"
            hint="Escolha um único campeão."
            options={champions}
            value={carry}
            onChange={setCarry}
            placeholder="Buscar campeão…"
            emptyLabel="Nenhum campeão encontrado."
          />
          <p className="mt-2 text-xs text-muted-foreground" data-testid="carry-id">
            id selecionado: {carry ?? "—"}
          </p>
        </div>
      </section>

      {/* Multiple-selection examples */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">
          Seleção múltipla
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <CatalogPicker
              multiple
              label="Campeões"
              options={champions}
              value={pickedChampions}
              onChange={setPickedChampions}
              placeholder="Buscar campeão…"
              emptyLabel="Nenhum campeão encontrado."
            />
            <p
              className="mt-2 text-xs text-muted-foreground"
              data-testid="champions-count"
            >
              {pickedChampions.length} selecionado(s)
            </p>
          </div>

          <div>
            <CatalogPicker
              multiple
              label="Itens"
              options={items}
              value={pickedItems}
              onChange={setPickedItems}
              placeholder="Buscar item…"
              emptyLabel="Nenhum item encontrado."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {pickedItems.length} selecionado(s)
            </p>
          </div>

          <div>
            <CatalogPicker
              multiple
              label="Traits"
              options={traits}
              value={pickedTraits}
              onChange={setPickedTraits}
              placeholder="Buscar trait…"
              emptyLabel="Nenhum trait encontrado."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {pickedTraits.length} selecionado(s)
            </p>
          </div>

          <div>
            <CatalogPicker
              multiple
              label="Augments"
              options={augments}
              value={pickedAugments}
              onChange={setPickedAugments}
              placeholder="Buscar augment…"
              emptyLabel="Nenhum augment encontrado."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {pickedAugments.length} selecionado(s)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
