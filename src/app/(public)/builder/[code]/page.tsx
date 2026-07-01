import type { Metadata } from "next";

import { Builder } from "@/components/builder/builder";
import { decodeBoard, toPlacedUnits } from "@/lib/board-code";
import { getBuilderCatalog } from "@/server/queries/builder-catalog";

/**
 * Shared builder page (US-028) — served at `/builder/[code]`.
 *
 * The `[code]` path segment is a base64url share code produced by the builder
 * (see `src/lib/board-code.ts`). This route decodes it and hands the resulting
 * units + augments to `<Builder>` as its initial state, so opening the link
 * reloads the exact same board. Nothing is persisted server-side — the code is
 * the entire state, so this is still ephemeral (no login, no DB writes).
 *
 * Ids/items/augments that no longer exist in the current catalog are dropped so
 * a stale or cross-set code never renders phantom units. A code that can't be
 * decoded simply yields an empty board.
 */
export const metadata: Metadata = {
  title: "Builder",
  description:
    "Abra e edite uma composição de TFT compartilhada em um tabuleiro hexagonal.",
  // Share codes are ephemeral and effectively infinite — don't index them, and
  // point search engines at the canonical builder page.
  alternates: { canonical: "/builder" },
  robots: { index: false, follow: true },
};

export default async function SharedBuilderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { champions, traits, items, augments } = await getBuilderCatalog();

  const decoded = decodeBoard(decodeURIComponent(code));

  // Sanitize against the current catalog: keep only known champions/items/
  // augments so a stale or cross-set code degrades gracefully.
  const championIds = new Set(champions.map((c) => c.id));
  const itemIds = new Set(items.map((i) => i.id));
  const augmentIds = new Set(augments.map((a) => a.id));

  const initialUnits = toPlacedUnits(
    (decoded?.units ?? [])
      .filter((u) => championIds.has(u.championId))
      .map((u) => ({ ...u, items: u.items.filter((id) => itemIds.has(id)) })),
  );
  const initialAugments = (decoded?.augments ?? []).filter((id) =>
    augmentIds.has(id),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Builder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Composição compartilhada — edite à vontade e gere um novo link.
        </p>
      </header>

      <Builder
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
