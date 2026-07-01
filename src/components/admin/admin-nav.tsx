"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary navigation for the admin shell (US-031). Client component so the
 * current section can be highlighted via `usePathname`. Links point at the
 * sections built by later stories (Comps → US-033, Catálogo, Patches → US-039);
 * they may 404 until those routes exist.
 */
const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/comps", label: "Comps", exact: false },
  { href: "/admin/tier-list", label: "Tier list", exact: false },
  { href: "/admin/catalog", label: "Catálogo", exact: false },
  { href: "/admin/patches", label: "Patches", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação do admin"
      className="flex flex-wrap items-center gap-1 text-sm font-medium"
    >
      {ADMIN_LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-muted px-3 py-1.5 text-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
