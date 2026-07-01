"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tier } from "@prisma/client";

import { TierBands } from "@/components/tier-bands";
import { groupByTier, TIER_ORDER } from "@/lib/tiers";
import type { CompCard } from "@/server/queries/tierlist";

/**
 * TierListFilters (US-016).
 *
 * Client-side filtering of the tier list so the page stays static/ISR: the
 * server ships every PUBLISHED comp, and this component filters them in the
 * browser. Filter state lives entirely in the URL query string (`tier`,
 * `trait`, `champion` are repeatable; `q` is the text search), so links are
 * shareable and the back button works. Categories combine with AND, matches
 * within a category with OR.
 *
 * On desktop the controls sit in an inline panel; on mobile they open in a
 * bottom-sheet drawer. Both render the same `FilterControls` (all state is in
 * the URL, so the two instances never diverge).
 *
 * Requires a `<Suspense>` boundary in the parent (`useSearchParams`).
 */

/** Short tier labels for the tier toggle buttons. */
const TIER_LABEL: Record<Tier, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  X: "Situacional",
};

/** A selectable trait/champion option (deduped by display name). */
interface FilterOption {
  name: string;
  iconUrl: string;
}

const TOGGLE_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";
const TOGGLE_ACTIVE = "border-primary bg-primary text-primary-foreground";
const TOGGLE_INACTIVE =
  "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

function toggleClass(active: boolean): string {
  return `${TOGGLE_BASE} ${active ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`;
}

const LEGEND_CLASS =
  "mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

interface FilterControlsProps {
  traitOptions: FilterOption[];
  championOptions: FilterOption[];
  selectedTiers: string[];
  selectedTraits: string[];
  selectedChampions: string[];
  query: string;
  activeCount: number;
  onToggleTier: (tier: Tier) => void;
  onToggleTrait: (name: string) => void;
  onToggleChampion: (name: string) => void;
  onQueryChange: (value: string) => void;
  onClear: () => void;
}

/** Presentational filter form; all state comes from / goes to the URL. */
function FilterControls({
  traitOptions,
  championOptions,
  selectedTiers,
  selectedTraits,
  selectedChampions,
  query,
  activeCount,
  onToggleTier,
  onToggleTrait,
  onToggleChampion,
  onQueryChange,
  onClear,
}: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      {/*
        FilterControls is rendered twice (desktop panel + mobile drawer), so the
        search field must not carry a fixed `id` — a wrapping <label> associates
        the caption with the input without risking a duplicate id in the DOM.
      */}
      <label className="block">
        <span className={`${LEGEND_CLASS} block`}>Busca</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Nome, sinergia ou campeão…"
          aria-label="Buscar comps"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <fieldset>
        <legend className={LEGEND_CLASS}>Tier</legend>
        <div className="flex flex-wrap gap-2">
          {TIER_ORDER.map((tier) => {
            const active = selectedTiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleTier(tier)}
                className={toggleClass(active)}
              >
                {TIER_LABEL[tier]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {traitOptions.length > 0 && (
        <fieldset>
          <legend className={LEGEND_CLASS}>Sinergia</legend>
          <div className="flex flex-wrap gap-2">
            {traitOptions.map((option) => {
              const active = selectedTraits.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleTrait(option.name)}
                  className={toggleClass(active)}
                >
                  <Image
                    src={option.iconUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="h-4 w-4"
                  />
                  {option.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {championOptions.length > 0 && (
        <fieldset>
          <legend className={LEGEND_CLASS}>Campeão principal</legend>
          <div className="flex flex-wrap gap-2">
            {championOptions.map((option) => {
              const active = selectedChampions.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleChampion(option.name)}
                  className={toggleClass(active)}
                >
                  <span className="relative block h-4 w-4 shrink-0 overflow-hidden rounded-sm">
                    <Image
                      src={option.iconUrl}
                      alt=""
                      fill
                      sizes="16px"
                      className="object-cover"
                    />
                  </span>
                  {option.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {activeCount > 0 && (
        <div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            Limpar filtros ({activeCount})
          </button>
        </div>
      )}
    </div>
  );
}

interface TierListFiltersProps {
  comps: CompCard[];
  currentPatchId: string | null;
}

export function TierListFilters({
  comps,
  currentPatchId,
}: TierListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Current filter state, read straight from the URL.
  const selectedTiers = searchParams.getAll("tier");
  const selectedTraits = searchParams.getAll("trait");
  const selectedChampions = searchParams.getAll("champion");
  const query = searchParams.get("q") ?? "";

  // Filter options are derived from the comps actually present (only offer a
  // trait/champion if some comp has it), deduped by name and sorted.
  const traitOptions = useMemo<FilterOption[]>(() => {
    const byName = new Map<string, FilterOption>();
    for (const comp of comps) {
      for (const { trait } of comp.traits) {
        if (!byName.has(trait.name)) {
          byName.set(trait.name, { name: trait.name, iconUrl: trait.iconUrl });
        }
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [comps]);

  const championOptions = useMemo<FilterOption[]>(() => {
    const byName = new Map<string, FilterOption>();
    for (const comp of comps) {
      for (const { champion } of comp.units) {
        if (!byName.has(champion.name)) {
          byName.set(champion.name, {
            name: champion.name,
            iconUrl: champion.iconUrl,
          });
        }
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [comps]);

  const commit = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Toggle a value in a repeatable param (tier/trait/champion).
  const toggleValue = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(key);
      params.delete(key);
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      for (const entry of next) params.append(key, entry);
      commit(params);
    },
    [commit, searchParams],
  );

  const setQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      commit(params);
    },
    [commit, searchParams],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  // Apply the filters (AND across categories, OR within each).
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = comps.filter((comp) => {
    if (selectedTiers.length > 0 && !selectedTiers.includes(comp.tier)) {
      return false;
    }
    if (
      selectedTraits.length > 0 &&
      !comp.traits.some(({ trait }) => selectedTraits.includes(trait.name))
    ) {
      return false;
    }
    if (
      selectedChampions.length > 0 &&
      !comp.units.some(({ champion }) =>
        selectedChampions.includes(champion.name),
      )
    ) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = [
        comp.name,
        ...comp.traits.map(({ trait }) => trait.name),
        ...comp.units.map(({ champion }) => champion.name),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const activeCount =
    selectedTiers.length +
    selectedTraits.length +
    selectedChampions.length +
    (normalizedQuery ? 1 : 0);
  const hasActiveFilters = activeCount > 0;
  const showNoResults = filtered.length === 0 && hasActiveFilters;

  const controls = (
    <FilterControls
      traitOptions={traitOptions}
      championOptions={championOptions}
      selectedTiers={selectedTiers}
      selectedTraits={selectedTraits}
      selectedChampions={selectedChampions}
      query={query}
      activeCount={activeCount}
      onToggleTier={(tier) => toggleValue("tier", tier)}
      onToggleTrait={(name) => toggleValue("trait", name)}
      onToggleChampion={(name) => toggleValue("champion", name)}
      onQueryChange={setQuery}
      onClear={clearAll}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile: open the filter drawer. */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: inline filter panel. */}
      <div className="hidden rounded-lg border border-border bg-card p-4 sm:block">
        {controls}
      </div>

      {/* Results. */}
      {showNoResults ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma comp encontrada com os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-4 inline-flex rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <TierBands
          groups={groupByTier(filtered)}
          currentPatchId={currentPatchId}
          hideEmpty={hasActiveFilters}
        />
      )}

      {/* Mobile filter drawer (bottom sheet). */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
        >
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-base font-semibold text-foreground">
                Filtros
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 text-2xl leading-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="overflow-y-auto p-4">{controls}</div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver resultados ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
