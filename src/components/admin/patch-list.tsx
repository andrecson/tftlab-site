"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentPatch } from "@/actions/patches";

/**
 * Patch list with the "set current patch" control for the admin patches page
 * (US-039). Client component so it can call `setCurrentPatch` directly and keep
 * the current-patch id in local state (the source of truth for which row shows
 * the "Patch atual" badge vs. a "Definir como atual" button — `router.refresh()`
 * re-runs the force-dynamic page but does NOT reinit client state, so we flip it
 * optimistically on success, mirroring the publish controls in US-038).
 *
 * Switching the current patch snapshots the outgoing patch's tiers for every
 * published comp and revalidates the public tier list + comp pages so the
 * Novo/Atualizado badges update.
 */

/** A patch row shaped for the client (date pre-formatted on the server). */
export interface PatchListRow {
  id: string;
  version: string;
  set: string;
  releasedLabel: string;
  compsIntroduced: number;
}

interface PatchListProps {
  patches: PatchListRow[];
  currentPatchId: string | null;
  /** Published comps that get snapshotted when the current patch changes. */
  publishedCompCount: number;
}

export function PatchList({
  patches,
  currentPatchId,
  publishedCompCount,
}: PatchListProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(currentPatchId);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function makeCurrent(id: string, version: string) {
    setError(null);
    setNotice(null);
    setPending(id);

    const result = await setCurrentPatch(id);

    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCurrent(id);
    const n = result.snapshotCount ?? 0;
    setNotice(
      `Patch ${version} definido como atual.` +
        (n > 0
          ? ` ${n} ${
              n === 1 ? "comp carimbada" : "comps carimbadas"
            } no patch anterior.`
          : ""),
    );
    // Refresh the force-dynamic page so sibling server reads (dashboard/nav)
    // reflect the new current patch on next navigation.
    router.refresh();
  }

  if (patches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum patch cadastrado ainda. Crie o primeiro acima.
        </p>
      </div>
    );
  }

  const busy = pending !== null;

  return (
    <div className="flex flex-col gap-3">
      {publishedCompCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          Ao trocar o patch atual, {publishedCompCount}{" "}
          {publishedCompCount === 1 ? "comp publicada" : "comps publicadas"}{" "}
          terão o tier carimbado no patch anterior.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {patches.map((patch) => {
          const isCurrent = patch.id === current;
          return (
            <li
              key={patch.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-4"
            >
              {/* Version + set — full width on mobile so it never gets squeezed
                  out by the metadata; shares the line on sm+. */}
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="font-medium text-foreground">
                  Patch {patch.version}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {patch.set}
                </p>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground">
                Lançado {patch.releasedLabel}
              </span>

              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {patch.compsIntroduced}{" "}
                {patch.compsIntroduced === 1 ? "comp" : "comps"}
              </span>

              {isCurrent ? (
                <span className="inline-flex shrink-0 items-center rounded bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                  Patch atual
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCurrent(patch.id, patch.version)}
                  disabled={busy}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending === patch.id ? "Definindo…" : "Definir como atual"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
