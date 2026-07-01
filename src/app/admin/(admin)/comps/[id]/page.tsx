import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminCompById,
  getAdminCompComposition,
  getAdminCompPriority,
  getPatches,
} from "@/server/queries/admin";
import {
  getBuilderChampions,
  getBuilderItems,
  getBuilderTraits,
} from "@/server/queries/catalog";
import { CompForm } from "@/components/admin/comp-form";
import { CompStatusControls } from "@/components/admin/comp-status-controls";
import { CompCompositionForm } from "@/components/admin/comp-composition-form";
import { CompPriorityForm } from "@/components/admin/comp-priority-form";

export const metadata: Metadata = {
  title: "Editar comp",
};

/**
 * Edit-comp page (US-034). Under the `(admin)` group (force-dynamic guard/shell).
 * Loads the comp's base/guide fields by id + the patch options in parallel;
 * 404s when the id doesn't resolve. The `new` sibling segment takes precedence
 * over this dynamic `[id]` segment, so `/admin/comps/new` never lands here.
 */
export default async function EditCompPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [comp, patches] = await Promise.all([
    getAdminCompById(id),
    getPatches(),
  ]);

  if (!comp) notFound();

  // The composition/priority editors draw from the comp's own set (US-035/036).
  const [composition, priority, champions, traits, items] = await Promise.all([
    getAdminCompComposition(comp.id),
    getAdminCompPriority(comp.id),
    getBuilderChampions(comp.set),
    getBuilderTraits(comp.set),
    getBuilderItems(comp.set),
  ]);

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
          Editar comp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {comp.name} · /{comp.slug}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href={`/admin/comps/${comp.id}/build`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Editar board no Builder
          </Link>
          <Link
            href={`/admin/preview/${comp.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver preview
          </Link>
        </div>
      </div>

      <CompStatusControls
        comp={{ id: comp.id, slug: comp.slug, status: comp.status }}
      />

      <CompForm patches={patches} comp={comp} />

      <CompCompositionForm
        compId={comp.id}
        champions={champions}
        traits={traits}
        initial={composition}
      />

      <CompPriorityForm compId={comp.id} items={items} initial={priority} />
    </div>
  );
}
