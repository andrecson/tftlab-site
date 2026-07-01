import { IconTooltip } from "@/components/icon-tooltip";
import { SectionHeading } from "@/components/section-heading";
import type { CompDetail } from "@/server/queries/comp";

/**
 * Augments section of a comp-detail page (US-021).
 *
 * `CompAugments` shows the comp's "Augment Priority" (the category order from the
 * comp's `augmentPriority`, e.g. Economia › Itens › Combate) followed by the list
 * of recommended augments (icon + name tooltip via `IconTooltip`). Like the other
 * comp-detail sections it takes the narrow `CompDetail` slices rather than the
 * whole comp, is presentational (no `"use client"`), and returns null when there
 * is nothing to show. It sits below the unit lists on the shared comp-detail page.
 */
type AugmentCategory = CompDetail["augmentPriority"][number];

/** Readable pt-BR labels for the augment-priority categories. */
const CATEGORY_LABEL: Record<AugmentCategory, string> = {
  ECON: "Economia",
  ITEMS: "Itens",
  COMBAT: "Combate",
};

/** Right-chevron marking priority order between categories. */
function PriorityArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-muted-foreground"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function CompAugments({
  augments,
  augmentPriority,
}: {
  augments: CompDetail["augments"];
  augmentPriority: CompDetail["augmentPriority"];
}) {
  if (augments.length === 0 && augmentPriority.length === 0) return null;

  return (
    <section aria-labelledby="augments-heading" className="flex flex-col gap-4">
      <SectionHeading id="augments-heading">Augments</SectionHeading>

      {augmentPriority.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            Prioridade de augments
          </span>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {augmentPriority.map((category, index) => (
              <li key={category} className="flex items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                  {CATEGORY_LABEL[category]}
                </span>
                {index < augmentPriority.length - 1 && <PriorityArrow />}
              </li>
            ))}
          </ol>
        </div>
      )}

      {augments.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2">
          {augments.map((entry) => (
            <li key={entry.id}>
              <IconTooltip src={entry.augment.iconUrl} name={entry.augment.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
