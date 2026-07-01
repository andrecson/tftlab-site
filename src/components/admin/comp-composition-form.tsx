"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { BuilderChampion, BuilderTraitInfo } from "@/server/queries/catalog";
import type { AdminCompComposition } from "@/server/queries/admin";
import {
  updateCompComposition,
  type CompTraitInput,
} from "@/actions/comps";
import { CatalogPicker, type CatalogOption } from "@/components/admin/catalog-picker";

/**
 * Comp composition editor (US-035): the trait list (each with an active level +
 * order) and the off-board EARLY/FLEX unit lists. Rendered below the base
 * `<CompForm>` on the edit page (a comp must already exist so it has an id).
 *
 * Client component so it can drive the `CatalogPicker`s and call the
 * `updateCompComposition` server action directly (React 18.3 has no
 * `useActionState`, so we mirror the login/comp form: `useState` + await the
 * action). CORE board units/items/augments are edited elsewhere (US-036/037),
 * so this form only owns traits + EARLY/FLEX units.
 *
 * Traits are added via a single-select `CatalogPicker` used as a pure "add"
 * control (its `value` stays null, already-added traits are filtered out of its
 * options); the added traits render as an ordered list with a level input and
 * up/down reorder controls. The EARLY/FLEX unit lists use multi-select
 * `CatalogPicker`s directly (add/remove chips, selection order = list order).
 */

interface CompCompositionFormProps {
  compId: string;
  /** Champion catalog for the comp's set (EARLY/FLEX unit pickers). */
  champions: BuilderChampion[];
  /** Trait catalog for the comp's set (traits editor). */
  traits: BuilderTraitInfo[];
  /** The comp's currently saved composition. */
  initial: AdminCompComposition;
}

export function CompCompositionForm({
  compId,
  champions,
  traits,
  initial,
}: CompCompositionFormProps) {
  const [traitEntries, setTraitEntries] = useState<CompTraitInput[]>(
    () => initial.traits.map((t) => ({ traitId: t.traitId, level: t.level })),
  );
  const [earlyUnitIds, setEarlyUnitIds] = useState<string[]>(
    () => initial.earlyUnitIds,
  );
  const [flexUnitIds, setFlexUnitIds] = useState<string[]>(
    () => initial.flexUnitIds,
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  // Catalog lookups + picker option lists (mapped to the CatalogPicker shape).
  const traitsById = useMemo(() => {
    const map = new Map<string, BuilderTraitInfo>();
    for (const t of traits) map.set(t.id, t);
    return map;
  }, [traits]);

  const traitOptions = useMemo<CatalogOption[]>(
    () =>
      traits.map((t) => ({
        id: t.id,
        name: t.name,
        iconUrl: t.iconUrl,
        meta:
          t.breakpoints.length > 0
            ? `Ativa em ${t.breakpoints.join(" / ")}`
            : undefined,
      })),
    [traits],
  );

  const championOptions = useMemo<CatalogOption[]>(
    () =>
      champions.map((c) => ({
        id: c.id,
        name: c.name,
        iconUrl: c.iconUrl,
        meta: `Custo ${c.cost}`,
      })),
    [champions],
  );

  // Traits not yet added — the single-select "add" picker only offers these.
  const addableTraitOptions = useMemo<CatalogOption[]>(() => {
    const chosen = new Set(traitEntries.map((t) => t.traitId));
    return traitOptions.filter((o) => !chosen.has(o.id));
  }, [traitOptions, traitEntries]);

  function markDirty() {
    if (saved) setSaved(false);
    if (error) setError(null);
  }

  function addTrait(traitId: string) {
    const info = traitsById.get(traitId);
    // Seed the level with the trait's first breakpoint (e.g. Mecha 2) when known.
    const level = info?.breakpoints[0] ?? 1;
    setTraitEntries((prev) =>
      prev.some((t) => t.traitId === traitId)
        ? prev
        : [...prev, { traitId, level }],
    );
    markDirty();
  }

  function removeTrait(traitId: string) {
    setTraitEntries((prev) => prev.filter((t) => t.traitId !== traitId));
    markDirty();
  }

  function setTraitLevel(traitId: string, level: number) {
    setTraitEntries((prev) =>
      prev.map((t) => (t.traitId === traitId ? { ...t, level } : t)),
    );
    markDirty();
  }

  function moveTrait(index: number, delta: number) {
    setTraitEntries((prev) => {
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

    const result = await updateCompComposition(compId, {
      traits: traitEntries,
      earlyUnitIds,
      flexUnitIds,
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
          Sinergias e unidades
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite as sinergias (com nível) e as listas de unidades Early e Flex. O
          board final (unidades CORE, estrelas, itens e carries) é definido no
          Builder.
        </p>
      </div>

      {/* Traits editor */}
      <div className="flex flex-col gap-3">
        <CatalogPicker
          label="Adicionar sinergia"
          hint="Selecione uma sinergia para adicioná-la à lista abaixo."
          options={addableTraitOptions}
          value={null}
          onChange={(id) => id && addTrait(id)}
          placeholder="Buscar sinergia…"
          emptyLabel="Nenhuma sinergia encontrada."
        />

        {traitEntries.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {traitEntries.map((entry, index) => {
              const info = traitsById.get(entry.traitId);
              return (
                <li
                  key={entry.traitId}
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
                    {info?.name ?? "(sinergia desconhecida)"}
                  </span>

                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Nível
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={entry.level}
                      onChange={(e) =>
                        setTraitLevel(
                          entry.traitId,
                          Math.max(1, Math.floor(Number(e.target.value) || 1)),
                        )
                      }
                      aria-label={`Nível de ${info?.name ?? "sinergia"}`}
                      className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveTrait(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${info?.name ?? "sinergia"} para cima`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrait(index, 1)}
                      disabled={index === traitEntries.length - 1}
                      aria-label={`Mover ${info?.name ?? "sinergia"} para baixo`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrait(entry.traitId)}
                      aria-label={`Remover ${info?.name ?? "sinergia"}`}
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
            Nenhuma sinergia adicionada.
          </p>
        )}
      </div>

      {/* Early / Flex unit lists */}
      <div className="grid gap-5 sm:grid-cols-2">
        <CatalogPicker
          multiple
          label="Unidades Early"
          hint="Campeões comprados no início do jogo (fora do board final)."
          options={championOptions}
          value={earlyUnitIds}
          onChange={(ids) => {
            setEarlyUnitIds(ids);
            markDirty();
          }}
          placeholder="Buscar campeão…"
          emptyLabel="Nenhum campeão encontrado."
        />
        <CatalogPicker
          multiple
          label="Unidades Flex"
          hint="Campeões flexíveis/opcionais (fora do board final)."
          options={championOptions}
          value={flexUnitIds}
          onChange={(ids) => {
            setFlexUnitIds(ids);
            markDirty();
          }}
          placeholder="Buscar campeão…"
          emptyLabel="Nenhum campeão encontrado."
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-primary">
          Composição salva.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar composição"}
        </button>
      </div>
    </section>
  );
}
