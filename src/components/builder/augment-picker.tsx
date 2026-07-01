"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { IconTooltip } from "@/components/icon-tooltip";
import { MAX_AUGMENTS } from "@/lib/builder";
import type { BuilderAugment } from "@/server/queries/catalog";

/**
 * Augment picker for the builder (US-027).
 *
 * Board-level (not per-unit): pick up to `MAX_AUGMENTS` augments for the comp.
 * The top strip shows the chosen augments (each removable); the searchable grid
 * below toggles selection. Selection lives in the parent so US-028 can encode it
 * into the share code alongside the units.
 */

interface AugmentPickerProps {
  augments: BuilderAugment[];
  augmentsById: Map<string, BuilderAugment>;
  /** Selected augment ids (pick order). */
  selected: string[];
  /** Toggle an augment on/off (capped at MAX_AUGMENTS by the parent). */
  onToggle: (augmentId: string) => void;
}

export function AugmentPicker({
  augments,
  augmentsById,
  selected,
  onToggle,
}: AugmentPickerProps) {
  const [query, setQuery] = useState("");
  // A busca + grid de augments so aparecem quando o usuario clica num slot "+".
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const full = selected.length >= MAX_AUGMENTS;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return augments;
    return augments.filter((augment) =>
      augment.name.toLowerCase().includes(q),
    );
  }, [augments, query]);

  // Fecha o pop-up com Esc.
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  return (
    <section
      aria-label="Augments"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Augments</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {selected.length}/{MAX_AUGMENTS}
        </span>
      </div>

      {/* Chosen augment slots — empilhados e centralizados na coluna estreita. */}
      <ul className="flex flex-col items-center gap-2">
        {Array.from({ length: MAX_AUGMENTS }, (_, slot) => {
          const augmentId = selected[slot];
          const augment = augmentId ? augmentsById.get(augmentId) : undefined;
          return (
            <li key={slot}>
              {augment ? (
                <span className="relative inline-flex">
                  <IconTooltip
                    src={augment.iconUrl}
                    name={augment.name}
                    size={44}
                  />
                  <button
                    type="button"
                    onClick={() => onToggle(augment.id)}
                    aria-label={`Remover ${augment.name}`}
                    className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-destructive-foreground ring-1 ring-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen((open) => !open)}
                  aria-label="Adicionar augment"
                  aria-expanded={pickerOpen}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-border text-lg leading-none text-muted-foreground/70 transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  +
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {pickerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escolher augment"
          onClick={() => setPickerOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Escolha um augment
              </h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Fechar"
                className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Fechar ✕
              </button>
            </div>

            <label className="block">
              <span className="sr-only">Buscar augment</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar augment…"
                aria-label="Buscar augment"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            {visible.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                Nenhum augment encontrado.
              </p>
            ) : (
              <ul className="grid max-h-[60vh] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-7 md:grid-cols-8">
                {visible.map((augment) => {
                  const isSelected = selectedIds.has(augment.id);
                  const disabled = full && !isSelected;
                  return (
                    <li key={augment.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onToggle(augment.id);
                          setPickerOpen(false);
                        }}
                        disabled={disabled}
                        aria-pressed={isSelected}
                        title={augment.name}
                        aria-label={`${isSelected ? "Remover" : "Selecionar"} ${augment.name}`}
                        className={`flex w-full items-center justify-center rounded-md border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-muted/40 hover:border-border hover:bg-muted"
                        }`}
                      >
                        <span className="relative block aspect-square w-full overflow-hidden rounded">
                          <Image
                            src={augment.iconUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-contain"
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
