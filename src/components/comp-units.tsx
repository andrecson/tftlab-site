import { IconTooltip } from "@/components/icon-tooltip";
import { costClass } from "@/lib/champion-cost";
import type { CompDetail } from "@/server/queries/comp";

/**
 * Unit lists of a comp-detail page (US-019).
 *
 * `CompUnits` splits the comp's units by their `role` into three sections —
 * "Early Units" (what to buy first), "Core/Final" (the final board) and
 * "Flex Units" (interchangeable slots) — each unit shown with its icon, name,
 * gold cost and (when set) its star level. Sections with no units are omitted.
 *
 * Presentational (no `"use client"`); sits below the carries/item-priority
 * sections on the shared comp-detail page. Units arrive already ordered by
 * `order` from the query, so each role group preserves that order.
 */
type CompUnitDetail = CompDetail["units"][number];
type UnitRole = CompUnitDetail["role"];

/** Sections in display order; the AC fixes these labels. */
const ROLE_SECTIONS: { role: UnitRole; label: string }[] = [
  { role: "EARLY", label: "Early Units" },
  { role: "CORE", label: "Core/Final" },
  { role: "FLEX", label: "Flex Units" },
];

function UnitCard({ unit }: { unit: CompUnitDetail }) {
  return (
    <li className="flex w-16 flex-col items-center gap-1 sm:w-20">
      <IconTooltip src={unit.champion.iconUrl} name={unit.champion.name} size={56} />
      <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-foreground">
        {unit.champion.name}
      </span>
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-0.5 rounded border px-1 text-[10px] font-semibold leading-tight tabular-nums ${costClass(
            unit.champion.cost,
          )}`}
          aria-label={`Custo ${unit.champion.cost}`}
        >
          <span aria-hidden="true">◆</span>
          {unit.champion.cost}
        </span>
        {unit.starLevel ? (
          <span
            className="text-[10px] leading-none text-primary"
            aria-label={`${unit.starLevel} estrelas`}
          >
            {"★".repeat(unit.starLevel)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function CompUnits({ units }: { units: CompDetail["units"] }) {
  const sections = ROLE_SECTIONS.map((section) => ({
    ...section,
    units: units.filter((unit) => unit.role === section.role),
  })).filter((section) => section.units.length > 0);

  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="units-heading" className="flex flex-col gap-4">
      <h2 id="units-heading" className="text-lg font-semibold text-foreground">
        Unidades
      </h2>
      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.role} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {section.label}
            </h3>
            <ul className="flex flex-wrap gap-3">
              {section.units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
