import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminCompAugments,
  getAdminCompBadge,
  getAdminCompById,
  getAdminCompCarries,
  getAdminCompPriority,
  getPatches,
} from "@/server/queries/admin";
import {
  getBuilderAugments,
  getBuilderChampions,
  getBuilderItems,
} from "@/server/queries/catalog";
import { CompForm } from "@/components/admin/comp-form";
import { CompStatusControls } from "@/components/admin/comp-status-controls";
import { CompCarriesForm } from "@/components/admin/comp-carries-form";
import { CompAugmentsForm } from "@/components/admin/comp-augments-form";
import { CompBadgeForm } from "@/components/admin/comp-badge-form";
import { CompPriorityForm } from "@/components/admin/comp-priority-form";

export const metadata: Metadata = {
  title: "Editar comp",
};

/**
 * Edit-comp page. Under the `(admin)` group (force-dynamic guard/shell). Loads
 * the comp's base/guide fields + its carries/augments/priority + the set-scoped
 * catalogs. Traits and Early/Flex units are no longer edited here — synergies are
 * computed from the board, and the guide shows only carries + board + augments.
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

  const [carries, augmentIds, priority, badge, champions, items, augments] =
    await Promise.all([
      getAdminCompCarries(comp.id),
      getAdminCompAugments(comp.id),
      getAdminCompPriority(comp.id),
      getAdminCompBadge(comp.id),
      getBuilderChampions(comp.set),
      getBuilderItems(comp.set),
      getBuilderAugments(comp.set),
    ]);

  const championOptions = champions.map((c) => ({
    id: c.id,
    name: c.name,
    iconUrl: c.iconUrl,
    meta: `Custo ${c.cost}`,
  }));
  const itemOptions = items.map((it) => ({
    id: it.id,
    name: it.name,
    iconUrl: it.iconUrl,
  }));
  const augmentOptions = augments.map((a) => ({
    id: a.id,
    name: a.name,
    iconUrl: a.iconUrl,
  }));

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

      <CompForm patches={patches} comp={comp} champions={championOptions} />

      <CompBadgeForm
        compId={comp.id}
        augments={augmentOptions}
        items={itemOptions}
        initial={badge}
      />

      <CompCarriesForm
        compId={comp.id}
        champions={championOptions}
        items={itemOptions}
        initial={carries}
      />

      <CompAugmentsForm
        compId={comp.id}
        augments={augmentOptions}
        initial={augmentIds}
      />

      <CompPriorityForm compId={comp.id} items={items} initial={priority} />
    </div>
  );
}
