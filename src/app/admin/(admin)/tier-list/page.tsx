import type { Metadata } from "next";

import { TierListEditor } from "@/components/admin/tier-list-editor";
import { getAdminTierListComps } from "@/server/queries/admin";

export const metadata: Metadata = {
  title: "Tier list",
};

/**
 * Admin tier-list editor page (US-047).
 *
 * Server component (inherits the `(admin)` force-dynamic guard/shell, so only a
 * logged-in EDITOR curator reaches it). It loads the current set's comps grouped
 * into the S/A/B/C/X bands via `getAdminTierListComps()` (US-046) and hands the
 * flat list to the `"use client"` `<TierListEditor>`, which re-groups with the
 * shared `groupByTier` and retiers comps in bulk through `setCompTier`. Guides
 * are still edited per comp in `/admin/comps/[id]`; this screen only moves comps
 * between bands.
 */
export default async function AdminTierListPage() {
  const groups = await getAdminTierListComps();
  const comps = groups.flatMap((group) => group.comps);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tier list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reatribua as comps entre as faixas S/A/B/C/X. As mudanças são salvas na
          hora — comps publicadas re-aparecem na tier list pública imediatamente.
        </p>
      </div>

      <TierListEditor comps={comps} />
    </div>
  );
}
