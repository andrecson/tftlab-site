"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CatalogPicker,
  type CatalogOption,
} from "@/components/admin/catalog-picker";
import { updateCompCarries, type CompCarryInput } from "@/actions/comps";
import { MAX_ITEMS, MAX_STARS, MIN_STARS } from "@/lib/builder";

/**
 * Admin editor for a comp's carries — a dedicated list independent of the board
 * builder. Each carry is a champion + star level (1–3) + up to MAX_ITEMS items.
 * Persists via `updateCompCarries`. The guide's Carries section renders these.
 */
interface CompCarriesFormProps {
  compId: string;
  /** Champion catalog for the comp's set. */
  champions: CatalogOption[];
  /** Item catalog for the comp's set. */
  items: CatalogOption[];
  /** Currently saved carries (ordered). */
  initial: CompCarryInput[];
}

const STAR_LEVELS = Array.from(
  { length: MAX_STARS - MIN_STARS + 1 },
  (_, i) => MIN_STARS + i,
);

export function CompCarriesForm({
  compId,
  champions,
  items,
  initial,
}: CompCarriesFormProps) {
  const router = useRouter();
  const [carries, setCarries] = useState<CompCarryInput[]>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  function updateCarry(index: number, patch: Partial<CompCarryInput>) {
    setCarries((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }
  function addCarry() {
    setCarries((prev) => [
      ...prev,
      { championId: "", starLevel: MAX_STARS, itemIds: [] },
    ]);
  }
  function removeCarry(index: number) {
    setCarries((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave() {
    setPending(true);
    setError(null);
    setSavedOk(false);
    const result = await updateCompCarries(
      compId,
      carries.filter((c) => c.championId),
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSavedOk(true);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Carries</h2>
      <p className="text-xs text-muted-foreground">
        Escolha os campeões carry, o nível de estrela e seus itens (aparecem no
        guia). Independente do board.
      </p>

      <ul className="flex flex-col gap-4">
        {carries.map((carry, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Carry {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeCarry(index)}
                className="text-xs text-destructive hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Remover
              </button>
            </div>

            <CatalogPicker
              label="Campeão"
              options={champions}
              value={carry.championId || null}
              onChange={(value) =>
                updateCarry(index, { championId: value ?? "" })
              }
              placeholder="Buscar campeão…"
              emptyLabel="Nenhum campeão encontrado."
            />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Estrelas:
              </span>
              {STAR_LEVELS.map((level) => {
                const active = carry.starLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateCarry(index, { starLevel: level })}
                    aria-pressed={active}
                    className={`rounded px-2 py-1 text-xs font-semibold leading-none tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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

            <CatalogPicker
              label={`Itens (até ${MAX_ITEMS})`}
              multiple
              options={items}
              value={carry.itemIds}
              onChange={(value) =>
                updateCarry(index, { itemIds: value.slice(0, MAX_ITEMS) })
              }
              placeholder="Buscar item…"
              emptyLabel="Nenhum item encontrado."
            />
          </li>
        ))}
      </ul>

      <div>
        <button
          type="button"
          onClick={addCarry}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          + Adicionar carry
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedOk ? (
        <p role="status" className="text-sm text-emerald-400">
          Carries salvos.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar carries"}
        </button>
      </div>
    </section>
  );
}
