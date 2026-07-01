import type { ReactNode } from "react";

/**
 * Section heading for the comp-guide sections — a cyan accent bar + bold label,
 * echoing the accent bar in <PageHeading> so the "esports competitivo" tone is
 * consistent across the tier list, builder and guides. Presentational; keeps the
 * optional `id` for `aria-labelledby` wiring on the section.
 */
export function SectionHeading({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2.5 text-lg font-bold text-foreground"
    >
      <span
        aria-hidden="true"
        className="h-5 w-1 shrink-0 rounded-full bg-primary"
      />
      {children}
    </h2>
  );
}
