import { IconTooltip } from "@/components/icon-tooltip";
import { SectionHeading } from "@/components/section-heading";
import type { CompDetail } from "@/server/queries/comp";

/**
 * Carries + item priority sections of a comp-detail page (US-018).
 *
 * `CompCarries` lists each carry (units with `isCarry`) ordered by `carryOrder`,
 * showing its recommended items in build order. `CompItemPriority` renders the
 * comp's overall item priority as an ordered sequence with arrows between items.
 * Item/champion names appear in a tooltip (via `IconTooltip`) on hover/focus/
 * touch. Both are presentational (no `"use client"`); they sit below
 * `<CompHeader/>` on the shared comp-detail page.
 */
export function CompCarries({
  carries,
}: {
  carries: CompDetail["carries"];
}) {
  if (carries.length === 0) return null;

  return (
    <section aria-labelledby="carries-heading" className="flex flex-col gap-4">
      <SectionHeading id="carries-heading">Carries</SectionHeading>
      <ul className="flex flex-col gap-3">
        {carries.map((carry) => (
          <li
            key={carry.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex items-center gap-3">
              <IconTooltip
                src={carry.champion.iconUrl}
                name={carry.champion.name}
                size={48}
              />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {carry.champion.name}
                </span>
                {carry.starLevel ? (
                  <span
                    className="text-xs leading-none text-primary"
                    aria-label={`${carry.starLevel} estrelas`}
                  >
                    {"★".repeat(carry.starLevel)}
                  </span>
                ) : null}
              </div>
            </div>

            {carry.items.length > 0 ? (
              <ol className="flex flex-wrap items-center gap-2">
                {carry.items.map((compItem) => (
                  <li key={compItem.id}>
                    <IconTooltip
                      src={compItem.item.iconUrl}
                      name={compItem.item.name}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <span className="text-sm text-muted-foreground">
                Sem itens recomendados
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small right-chevron marking priority order between items. */
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

export function CompItemPriority({
  items,
}: {
  items: CompDetail["itemPriority"];
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="item-priority-heading"
      className="flex flex-col gap-4"
    >
      <SectionHeading id="item-priority-heading">
        Prioridade de itens
      </SectionHeading>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {items.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2">
            <IconTooltip src={entry.item.iconUrl} name={entry.item.name} />
            {index < items.length - 1 && <PriorityArrow />}
          </li>
        ))}
      </ol>
    </section>
  );
}
