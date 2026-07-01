import type { Metadata } from "next";
import type { ItemType } from "@prisma/client";

import { CatalogExplorer } from "@/components/admin/catalog-explorer";
import type { CatalogOption } from "@/components/admin/catalog-picker";
import { getBuilderCatalog } from "@/server/queries/builder-catalog";

export const metadata: Metadata = {
  title: "Catálogo",
};

/** pt-BR labels for the item families (secondary text in the picker). */
const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  COMPONENT: "Componente",
  COMPLETED: "Craftável",
  ARTIFACT: "Artefato",
  RADIANT: "Radiante",
  EMBLEM: "Emblema",
  SUPPORT: "Suporte",
  OTHER: "Outro",
};

/**
 * Admin catalog page (US-032).
 *
 * Server component that loads the current set's catalog (reusing the cached
 * `getBuilderCatalog` bundle, tag `catalog`) and normalizes each family into
 * `CatalogOption[]` for the reusable `CatalogPicker`. This both fills the
 * dashboard/nav "Catálogo" link and gives the picker a browser-verifiable home
 * before the comp forms (US-034..037) consume it.
 */
export default async function AdminCatalogPage() {
  const { champions, items, traits, augments } = await getBuilderCatalog();

  const championOptions: CatalogOption[] = champions.map((champion) => ({
    id: champion.id,
    name: champion.name,
    iconUrl: champion.iconUrl,
    meta: `Custo ${champion.cost}`,
  }));

  const itemOptions: CatalogOption[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    iconUrl: item.iconUrl,
    meta: ITEM_TYPE_LABEL[item.type],
  }));

  const traitOptions: CatalogOption[] = traits.map((trait) => ({
    id: trait.id,
    name: trait.name,
    iconUrl: trait.iconUrl,
    meta: trait.breakpoints.length > 0 ? trait.breakpoints.join(" / ") : undefined,
  }));

  const augmentOptions: CatalogOption[] = augments.map((augment) => ({
    id: augment.id,
    name: augment.name,
    iconUrl: augment.iconUrl,
    meta: augment.tier ?? undefined,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque e selecione campeões, itens, traits e augments do set atual. O
          mesmo seletor é reutilizado nos formulários de composição.
        </p>
      </div>

      <CatalogExplorer
        champions={championOptions}
        items={itemOptions}
        traits={traitOptions}
        augments={augmentOptions}
      />
    </div>
  );
}
