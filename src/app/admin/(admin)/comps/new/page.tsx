import type { Metadata } from "next";
import Link from "next/link";
import { getPatches } from "@/server/queries/admin";
import { CompForm } from "@/components/admin/comp-form";

export const metadata: Metadata = {
  title: "Nova comp",
};

/**
 * Create-comp page (US-034). Under the `(admin)` group so it inherits the
 * force-dynamic guard/shell. Loads the patch options for the form's
 * introduced/updated selects; a comp cannot be introduced without a patch, so
 * we surface an empty state pointing at the patch flow (US-039) when none exist.
 */
export default async function NewCompPage() {
  const patches = await getPatches();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/comps"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para comps
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Nova comp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os campos básicos e o guia. Traits, unidades, itens e board
          são editados depois de criar.
        </p>
      </div>

      {patches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum patch cadastrado ainda. Crie um patch antes de cadastrar uma
            comp.
          </p>
        </div>
      ) : (
        <CompForm patches={patches} />
      )}
    </div>
  );
}
