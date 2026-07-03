"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CdragonChannel } from "@/server/ddragon";

import { reimportCatalog } from "@/actions/catalog";

/**
 * Admin control to (re)import the TFT catalog on demand, from the live (latest)
 * channel or the PBE (next patch, beta). The import is DESTRUCTIVE — it upserts
 * over the current catalog — so PBE asks for confirmation first. Calls
 * `reimportCatalog(channel)` (upserts champions/items/traits/augments +
 * revalidates the builder's `catalog` cache) and shows the resulting counts.
 */
const CHANNEL_LABEL: Record<CdragonChannel, string> = {
  latest: "live",
  pbe: "PBE",
};

export function ReimportCatalogButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(channel: CdragonChannel) {
    if (
      channel === "pbe" &&
      !window.confirm(
        "Importar o catálogo do PBE (próximo patch, em beta)?\n\n" +
          "Isso substitui o catálogo do site público por dados de teste, que " +
          "podem mudar ou nem entrar no patch final. Reimporte o “live” quando " +
          "o patch sair.",
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await reimportCatalog(channel);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const r = res.result;
      setMessage(
        `Catálogo atualizado (${CHANNEL_LABEL[r.channel]}, set ${r.set}): ` +
          `${r.champions} campeões, ${r.items} itens, ${r.augments} augments, ` +
          `${r.traits} traits.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run("latest")}
          disabled={pending}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Importando…" : "Re-importar catálogo"}
        </button>
        <button
          type="button"
          onClick={() => run("pbe")}
          disabled={pending}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Importar do PBE (beta)
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Live = patch atual. PBE = próximo patch em teste; substitui o catálogo do
        site até você reimportar o live.
      </p>
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
