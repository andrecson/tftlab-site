import Image from "next/image";

/**
 * IconTooltip (US-018) — a catalog icon (item/champion/augment) that reveals its
 * name in a small tooltip.
 *
 * The tooltip appears on hover AND on keyboard focus / touch tap: the wrapper is
 * focusable (`tabIndex=0`) and the tooltip toggles via `group-hover`/
 * `group-focus`, so it works for mouse, keyboard and touch alike (native `title`
 * tooltips don't show on touch). The accessible name comes from `role="img"` +
 * `aria-label` on the wrapper, so the decorative inner <Image> uses `alt=""` and
 * the visual tooltip is `aria-hidden`.
 *
 * Icons are Community Dragon CDN URLs, so they render through `next/image`
 * (`raw.communitydragon.org` is whitelisted in next.config) — never a plain
 * <img> (that lint-warns and fails the zero-warning gate).
 */
interface IconTooltipProps {
  /** Icon URL (Community Dragon CDN). */
  src: string;
  /** Name shown in the tooltip and used as the accessible label. */
  name: string;
  /** Square icon size in px. Defaults to 40. */
  size?: number;
  /** Extra classes for the icon image (e.g. `rounded-full`). */
  className?: string;
}

export function IconTooltip({
  src,
  name,
  size = 40,
  className = "",
}: IconTooltipProps) {
  return (
    <span
      role="img"
      aria-label={name}
      tabIndex={0}
      className="group/tt relative inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={`rounded-md object-cover ring-1 ring-border ${className}`}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-xs font-medium text-card-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity duration-150 group-hover/tt:opacity-100 group-focus/tt:opacity-100"
      >
        {name}
      </span>
    </span>
  );
}
