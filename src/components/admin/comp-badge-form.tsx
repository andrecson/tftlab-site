"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  CatalogPicker,
  type CatalogOption,
} from "@/components/admin/catalog-picker";
import { updateCompBadge } from "@/actions/comps";

/**
 * Admin editor for a comp's tier-list badge: a single augment OR item icon,
 * INDEPENDENT of the comp's tier or any flag — any comp can carry one. A type
 * toggle switches the picker's catalog; saving persists one (clearing the
 * other). The tier-list card overlays the chosen icon.
 */
interface CompBadgeFormProps {
  compId: string;
  augments: CatalogOption[];
  items: CatalogOption[];
  initial: { itemId: string | null; augmentId: string | null };
}

type BadgeType = "AUGMENT" | "ITEM";

export function CompBadgeForm({
  compId,
  augments,
  items,
  initial,
}: CompBadgeFormProps) {
  const router = useRouter();
  const [type, setType] = useState<BadgeType>(initial.itemId ? "ITEM" : "AUGMENT");
  const [selected, setSelected] = useState<string | null>(
    initial.itemId ?? initial.augmentId ?? null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  function switchType(next: BadgeType) {
    if (next === type) return;
    setType(next);
    setSelected(null); // ids are catalog-specific
    setSavedOk(false);
  }

  async function onSave() {
    setPending(true);
    setError(null);
    setSavedOk(false);
    const payload =
      type === "ITEM"
        ? { itemId: selected, augmentId: null }
        : { itemId: null, augmentId: selected };
    const res = await updateCompBadge(compId, payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSavedOk(true);
    router.refresh();
  }

  const options = type === "ITEM" ? items : augments;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Badge da comp</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Escolha 1 augment OU 1 item — o ícone aparece como badge no card da
          tier list. Vale para qualquer comp; vazio = sem badge.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Tipo do badge"
        className="flex items-center gap-1"
      >
        {(["AUGMENT", "ITEM"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            onClick={() => switchType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              type === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "AUGMENT" ? "Augment" : "Item"}
          </button>
        ))}
      </div>

      <CatalogPicker
        label={type === "ITEM" ? "Item" : "Augment"}
        options={options}
        value={selected}
        onChange={(value) => setSelected(value)}
        placeholder={type === "ITEM" ? "Buscar item…" : "Buscar augment…"}
        emptyLabel="Nenhum resultado."
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedOk ? (
        <p role="status" className="text-sm text-emerald-400">
          Badge salvo.
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar badge"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setSavedOk(false);
          }}
          disabled={pending || !selected}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpar
        </button>
      </div>
    </section>
  );
}
