"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CatalogPicker,
  type CatalogOption,
} from "@/components/admin/catalog-picker";
import { updateCompAugments } from "@/actions/comps";

/**
 * Admin editor for a comp's recommended augments — UNLIMITED and independent of
 * the board builder (owns `CompAugment` via `updateCompAugments`). A single
 * multi-select CatalogPicker over the augment catalog; save persists the list.
 */
interface CompAugmentsFormProps {
  compId: string;
  /** Augment catalog for the comp's set. */
  augments: CatalogOption[];
  /** Currently selected augment ids (ordered). */
  initial: string[];
}

export function CompAugmentsForm({
  compId,
  augments,
  initial,
}: CompAugmentsFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  async function onSave() {
    setPending(true);
    setError(null);
    setSavedOk(false);
    const result = await updateCompAugments(compId, selected);
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
      <h2 className="text-sm font-semibold text-foreground">
        Augments recomendados
      </h2>
      <CatalogPicker
        label="Augments (ilimitado)"
        hint="Escolha quantos augments quiser para o guia."
        multiple
        options={augments}
        value={selected}
        onChange={setSelected}
        placeholder="Buscar augment…"
        emptyLabel="Nenhum augment encontrado."
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedOk ? (
        <p role="status" className="text-sm text-emerald-400">
          Augments salvos.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar augments"}
        </button>
      </div>
    </section>
  );
}
