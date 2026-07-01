"use client";

import Link from "next/link";

import { ANALYTICS_EVENTS, track } from "@/lib/analytics";

/**
 * BuilderOpenLink (US-041).
 *
 * The clickable "Abrir no Builder" button, split out as a client component so it
 * can emit the `builder_open` analytics event on click. The share `code` is
 * still computed on the server by {@link OpenInBuilder} (no builder/encode code
 * ships to the client); this only adds the click handler and the styled link.
 */
export function BuilderOpenLink({
  href,
  compSlug,
}: {
  href: string;
  compSlug: string;
}) {
  return (
    <Link
      href={href}
      onClick={() =>
        track(ANALYTICS_EVENTS.builderOpen, { slug: compSlug, from: "comp" })
      }
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </svg>
      Abrir no Builder
    </Link>
  );
}
