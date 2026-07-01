"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompStatus, Tier } from "@prisma/client";
import { setCompTier } from "@/actions/comps";
import { groupByTier, TIER_META, TIER_ORDER } from "@/lib/tiers";
import type { AdminTierListComp } from "@/server/queries/admin";

/**
 * Admin tier-list editor (US-047). Client component so it can call `setCompTier`
 * directly and keep the whole comp list in local state — the source of truth for
 * which band each comp sits in. A retier updates local state OPTIMISTICALLY (the
 * card jumps to its new band immediately) and reverts on error, so the editor
 * stays consistent without a manual reload (`router.refresh()` re-runs the
 * force-dynamic page but does NOT reinit `useState`, mirroring the publish/patch
 * controls in US-038/US-039).
 *
 * The bands + colors/labels reuse `TIER_META`/`groupByTier` from `@/lib/tiers`,
 * the SAME presentation the public tier list uses, so admin and public stay in
 * visual sync. Retiering is a per-comp button row (the "controle de seleção"
 * option in the AC) rather than drag-and-drop — keyboard-accessible and simpler.
 */

/** pt-BR label + badge styling per moderation status (mirrors the comps list). */
const STATUS_META: Record<CompStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "Publicada", className: "bg-primary/15 text-primary" },
  ARCHIVED: {
    label: "Arquivada",
    className: "bg-secondary/40 text-secondary-foreground",
  },
};

interface TierListEditorProps {
  comps: AdminTierListComp[];
}

export function TierListEditor({ comps: initialComps }: TierListEditorProps) {
  const router = useRouter();
  const [comps, setComps] = useState<AdminTierListComp[]>(initialComps);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function moveComp(comp: AdminTierListComp, tier: Tier) {
    if (comp.tier === tier || pending) return;

    const previousTier = comp.tier;
    setError(null);
    setNotice(null);
    setPending(comp.id);

    // Optimistic: move the card to its new band right away.
    setComps((prev) =>
      prev.map((c) => (c.id === comp.id ? { ...c, tier } : c)),
    );

    const result = await setCompTier(comp.id, tier);
    setPending(null);

    if (!result.ok) {
      // Revert the optimistic move on failure.
      setComps((prev) =>
        prev.map((c) => (c.id === comp.id ? { ...c, tier: previousTier } : c)),
      );
      setError(result.error);
      return;
    }

    setNotice(`"${comp.name}" movida para ${TIER_META[tier].label}.`);
    // Keep sibling server reads (nav/dashboard counts) fresh on next navigation;
    // local state above remains the source of truth for this list.
    router.refresh();
  }

  if (comps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma comp cadastrada ainda.
        </p>
      </div>
    );
  }

  // Re-derive the bands from local state and keep each band name-sorted so a
  // moved card lands in a stable position.
  const groups = groupByTier(comps).map((group) => ({
    ...group,
    comps: [...group.comps].sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const busy = pending !== null;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      ) : null}

      {groups.map(({ tier, comps: bandComps }) => {
        const meta = TIER_META[tier];
        return (
          <section
            key={tier}
            aria-label={`Faixa ${meta.label}`}
            className={`rounded-lg border border-l-4 border-border ${meta.borderClass} bg-card/40 p-4`}
          >
            <header className="mb-3 flex items-center gap-2">
              <span
                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded px-2 text-sm font-bold text-background ${meta.chipClass}`}
              >
                {tier}
              </span>
              <h2 className="text-sm font-semibold text-foreground">
                {meta.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                {bandComps.length}{" "}
                {bandComps.length === 1 ? "comp" : "comps"}
              </span>
            </header>

            {bandComps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma comp nesta faixa.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bandComps.map((comp) => {
                  const status = STATUS_META[comp.status];
                  return (
                    <li
                      key={comp.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-card p-3"
                    >
                      {/* Name + slug — full width on mobile so the picker never
                          squeezes it out; shares the line on sm+. */}
                      <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                        <p className="truncate font-medium text-foreground">
                          {comp.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{comp.slug}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>

                      {pending === comp.id ? (
                        <span
                          role="status"
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          Salvando…
                        </span>
                      ) : null}

                      {/* Retier control: one button per band. */}
                      <div
                        role="group"
                        aria-label={`Tier de ${comp.name}`}
                        className="flex shrink-0 items-center gap-1"
                      >
                        {TIER_ORDER.map((target) => {
                          const isCurrent = comp.tier === target;
                          return (
                            <button
                              key={target}
                              type="button"
                              onClick={() => moveComp(comp, target)}
                              disabled={busy || isCurrent}
                              aria-pressed={isCurrent}
                              aria-label={`Mover ${comp.name} para ${TIER_META[target].label}`}
                              className={`inline-flex h-7 w-8 items-center justify-center rounded text-xs font-bold text-background transition ${
                                TIER_META[target].chipClass
                              } ${
                                isCurrent
                                  ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                                  : "opacity-40 hover:opacity-100"
                              } disabled:cursor-not-allowed`}
                            >
                              {target}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
