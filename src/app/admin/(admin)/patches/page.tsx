import type { Metadata } from "next";

import { PatchForm } from "@/components/admin/patch-form";
import { PatchList, type PatchListRow } from "@/components/admin/patch-list";
import { getAdminPatchesData } from "@/server/queries/admin";

export const metadata: Metadata = {
  title: "Patches",
};

/** Stable pt-BR DD/MM/YYYY formatting (UTC parts, no locale/timezone drift). */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Admin patches page (US-039).
 *
 * Server component (inherits the `(admin)` force-dynamic guard/shell). It lets a
 * curator create a patch and define the site's current patch. Switching the
 * current patch stamps a `CompTierSnapshot` of the outgoing patch for every
 * published comp and revalidates the public surfaces so the Novo/Atualizado
 * badges re-derive — the write side lives in `src/actions/patches.ts` and is
 * driven by the client `<PatchForm>` / `<PatchList>`.
 */
export default async function AdminPatchesPage() {
  const { patches, currentPatchId, currentSet, publishedCompCount } =
    await getAdminPatchesData();

  const currentPatch = patches.find((p) => p.isCurrent) ?? null;

  // Pre-format dates on the server so the client list stays free of Date props.
  const patchRows: PatchListRow[] = patches.map((p) => ({
    id: p.id,
    version: p.version,
    set: p.set,
    releasedLabel: formatDate(p.releasedAt),
    compsIntroduced: p.compsIntroduced,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Patches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre novos patches e defina o patch atual do site. Trocar o patch
          atual atualiza os selos Novo/Atualizado na tier list pública.
        </p>
      </div>

      {/* Current patch summary */}
      <section
        aria-labelledby="patch-atual"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2
          id="patch-atual"
          className="text-sm font-medium text-muted-foreground"
        >
          Patch atual
        </h2>
        {currentPatch ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold text-primary">
              {currentPatch.version}
            </span>
            <span className="text-sm text-muted-foreground">
              lançado em {formatDate(currentPatch.releasedAt)} ·{" "}
              {currentPatch.set}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum patch atual definido{currentSet ? ` (set ${currentSet})` : ""}.
          </p>
        )}
      </section>

      {/* Create patch */}
      <section aria-labelledby="novo-patch" className="flex flex-col gap-3">
        <h2
          id="novo-patch"
          className="text-lg font-semibold text-foreground"
        >
          Novo patch
        </h2>
        <PatchForm currentSet={currentSet} />
      </section>

      {/* All patches + set-current controls */}
      <section aria-labelledby="todos-patches" className="flex flex-col gap-3">
        <h2
          id="todos-patches"
          className="text-lg font-semibold text-foreground"
        >
          Todos os patches
        </h2>
        <PatchList
          patches={patchRows}
          currentPatchId={currentPatchId}
          publishedCompCount={publishedCompCount}
        />
      </section>
    </div>
  );
}
