"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { saveCompBoard } from "@/actions/comp-builder";
import { Builder } from "@/components/builder/builder";
import type { BuilderSaveResult } from "@/components/builder/builder";
import type { PlacedUnit } from "@/lib/builder";
import type {
  BuilderAugment,
  BuilderChampion,
  BuilderItem,
  BuilderTraitInfo,
} from "@/server/queries/catalog";

/**
 * Admin builder wrapper (US-037).
 *
 * Embeds the SAME public `<Builder>` used at `/builder`, but wires its `onSave`
 * callback to the `saveCompBoard` server action — the sanctioned way a
 * `"use client"` component reaches Prisma. Holding the `compId` here keeps the
 * generic builder decoupled from the DB/comp concern. On a successful save it
 * `router.refresh()`es so the force-dynamic edit route re-reads the persisted
 * board on the next navigation.
 */
export function AdminBuilder({
  compId,
  champions,
  traits,
  items,
  augments,
  initialUnits,
  initialAugments,
}: {
  compId: string;
  champions: BuilderChampion[];
  traits: BuilderTraitInfo[];
  items: BuilderItem[];
  augments: BuilderAugment[];
  initialUnits: PlacedUnit[];
  initialAugments: string[];
}) {
  const router = useRouter();

  const handleSave = useCallback(
    async (
      units: PlacedUnit[],
      selectedAugments: string[],
    ): Promise<BuilderSaveResult> => {
      const result = await saveCompBoard(compId, {
        units: units.map((u) => ({
          championId: u.championId,
          row: u.row,
          col: u.col,
          stars: u.stars,
          isCarry: u.isCarry,
          items: u.items,
        })),
        augmentIds: selectedAugments,
      });
      if (result.ok) {
        router.refresh();
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [compId, router],
  );

  return (
    <Builder
      champions={champions}
      traits={traits}
      items={items}
      augments={augments}
      initialUnits={initialUnits}
      initialAugments={initialAugments}
      maxAugments={Infinity}
      onSave={handleSave}
    />
  );
}
