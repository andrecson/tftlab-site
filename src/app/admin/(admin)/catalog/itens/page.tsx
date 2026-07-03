import type { Metadata } from "next";
import Link from "next/link";

import { ItemEditor } from "@/components/admin/item-editor";
import { getAdminItems } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Editar itens",
};

/**
 * Admin item editor page. Under the `(admin)` group, so it inherits
 * `requireRole("EDITOR")` + force-dynamic from the group layout. Loads every
 * item of the current set (unfiltered) so a curator can fix the ones the API
 * import got wrong before they reach the builder.
 */
export default async function AdminItemsPage() {
  const items = await getAdminItems();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/catalog"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Catálogo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Editar itens
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Corrija erros dos itens importados da API: nome, ícone ou categoria (a
          aba onde ele aparece no builder). As mudanças entram no builder na
          próxima atualização do catálogo. {items.length} itens no set atual.
        </p>
      </div>

      <ItemEditor items={items} />
    </div>
  );
}
