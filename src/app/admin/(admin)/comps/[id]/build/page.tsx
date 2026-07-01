import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBuilder } from "@/components/admin/admin-builder";
import type { PlacedUnit } from "@/lib/builder";
import { getAdminCompBoard, getAdminCompById } from "@/server/queries/admin";
import {
  getBuilderAugments,
  getBuilderChampions,
  getBuilderItems,
  getBuilderTraits,
} from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Board da comp",
};

/**
 * Final-board editor (US-037). Under the `(admin)` group (force-dynamic
 * guard/shell). Embeds the same public `<Builder>` (via `AdminBuilder`) seeded
 * with the comp's existing CORE board so the curator positions units, sets
 * stars, marks carries, equips items and picks augments, then saves to the DB.
 *
 * The catalog is scoped to the comp's OWN set (not the current set) so it stays
 * consistent with the composition/priority editors. The saved board is sanitized
 * against that catalog before seeding so a stale/cross-set id never renders a
 * phantom unit or broken icon.
 */
export default async function BuildCompPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const comp = await getAdminCompById(id);
  if (!comp) notFound();

  const [champions, traits, items, augments, board] = await Promise.all([
    getBuilderChampions(comp.set),
    getBuilderTraits(comp.set),
    getBuilderItems(comp.set),
    getBuilderAugments(comp.set),
    getAdminCompBoard(comp.id),
  ]);

  const championIds = new Set(champions.map((c) => c.id));
  const itemIds = new Set(items.map((i) => i.id));
  const augmentIds = new Set(augments.map((a) => a.id));

  const initialUnits: PlacedUnit[] = board.units
    .filter((u) => championIds.has(u.championId))
    .map((u, index) => ({
      id: `u${index}`,
      championId: u.championId,
      row: u.row,
      col: u.col,
      stars: u.stars,
      isCarry: u.isCarry,
      items: u.items.filter((itemId) => itemIds.has(itemId)),
    }));
  const initialAugments = board.augmentIds.filter((augmentId) =>
    augmentIds.has(augmentId),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/comps/${comp.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para a edição
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Board da comp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {comp.name} · /{comp.slug}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Posicione as unidades CORE no tabuleiro, defina estrelas, marque os
          carries, equipe itens e selecione os augments. Clique em “Salvar board”
          para persistir a composição final.
        </p>
      </div>

      <AdminBuilder
        compId={comp.id}
        champions={champions}
        traits={traits}
        items={items}
        augments={augments}
        initialUnits={initialUnits}
        initialAugments={initialAugments}
      />
    </div>
  );
}
