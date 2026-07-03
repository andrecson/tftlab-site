"use server";

import type { ItemType } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { requireRole } from "@/auth";
import {
  importCatalog,
  type CatalogImportResult,
} from "@/server/catalog-import";
import { db } from "@/server/db";

const ITEM_TYPES: readonly ItemType[] = [
  "COMPONENT",
  "COMPLETED",
  "ARTIFACT",
  "RADIANT",
  "EMBLEM",
  "SUPPORT",
  "OTHER",
];

export type ItemActionResult = { ok: true } | { ok: false; error: string };

/**
 * Admin action: fix a single catalog item that the API import got wrong (name,
 * icon or category). `requireRole("EDITOR")` gates it; a "use server" fn is a
 * public POST, so every field is validated at this trust boundary. On success
 * `revalidateTag("catalog")` refreshes the builder's item list.
 */
export async function updateItem(
  id: string,
  input: { name: string; iconUrl: string; type: ItemType; hidden: boolean },
): Promise<ItemActionResult> {
  await requireRole("EDITOR");

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const iconUrl = typeof input.iconUrl === "string" ? input.iconUrl.trim() : "";
  if (!name) return { ok: false, error: "O nome não pode ficar vazio." };
  if (name.length > 120) return { ok: false, error: "Nome muito longo (máx. 120)." };
  if (!/^https?:\/\/.+/i.test(iconUrl)) {
    return { ok: false, error: "URL do ícone inválida (use http(s)://…)." };
  }
  if (!ITEM_TYPES.includes(input.type)) {
    return { ok: false, error: "Categoria de item inválida." };
  }

  try {
    await db.item.update({
      where: { id },
      data: { name, iconUrl, type: input.type, hidden: Boolean(input.hidden) },
    });
  } catch {
    return { ok: false, error: "Item não encontrado." };
  }

  revalidateTag("catalog");
  return { ok: true };
}

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
