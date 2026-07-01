"use server";

import { revalidateTag } from "next/cache";

import { requireRole } from "@/auth";
import {
  importCatalog,
  type CatalogImportResult,
} from "@/server/catalog-import";

export type ReimportResult =
  | { ok: true; result: CatalogImportResult }
  | { ok: false; error: string };

/**
 * Admin action: re-import the TFT catalog (champions/items/traits/augments) from
 * the source on demand, then `revalidateTag("catalog")` so the builder shows the
 * new item/augment lists immediately. The admin comp editors are force-dynamic,
 * so they pick up the new catalog on the next navigation with no extra work.
 */
export async function reimportCatalog(): Promise<ReimportResult> {
  await requireRole("EDITOR");
  try {
    const result = await importCatalog();
    revalidateTag("catalog");
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao importar o catálogo.",
    };
  }
}
