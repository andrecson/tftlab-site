"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { reimportCatalog } from "@/actions/catalog";

/**
 * Admin control to re-import the TFT catalog on demand. Calls `reimportCatalog`
 * (which upserts champions/items/traits/augments + revalidates the builder's
 * `catalog` cache) and shows the resulting counts. Use it after a patch drops new
 * items/augments so the builder + guide editors pick them up.
 */
export function ReimportCatalogButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await reimportCatalog();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const r = res.result;
      setMessage(
        `Catálogo atualizado (set ${r.set}): ${r.champions} campeões, ` +
          `${r.items} itens, ${r.augments} augments, ${r.traits} traits.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Importando…" : "Re-importar catálogo"}
      </button>
      {message ? (
        <p role="status" className="text-sm text-emerald-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
