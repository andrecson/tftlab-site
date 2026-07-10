"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Unified public header for the merged site: the coaching/shop pages (Início,
 * Planos, Loja, Sobre) + the tools (Tier List, Builder), under one nav. The
 * "TFTLab.br" cyan wordmark + a primary CTA. Client component for the mobile
 * menu toggle + active-link highlighting.
 */
const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/tier-list", label: "Tier List" },
  { href: "/builder", label: "Builder" },
  { href: "/planos", label: "Planos" },
  { href: "/loja", label: "Loja" },
  { href: "/sobre", label: "Sobre" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Always "Minha conta" (even before linking Discord) to set it apart from the
  // "Entrar no Lab" subscribe CTA next to it. /conta sends non-logged-in users
  // to /entrar automatically.
  const accountHref = "/conta";
  const accountLabel = "Minha conta";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Wordmark — solid vibrant cyan (tftlab.com.br style). */}
        <Link
          href="/"
          aria-label="TFTLab.br — Início"
          onClick={() => setOpen(false)}
          className="shrink-0 text-xl font-black italic tracking-tight text-primary"
        >
          TFTLab<span>.br</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                isActive(pathname, link.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={accountHref}
            className="hidden text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary md:inline-flex"
          >
            {accountLabel}
          </Link>
          <Link
            href="/planos"
            className="hidden rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 md:inline-flex"
          >
            Entrar no Lab
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-primary md:hidden"
          >
            {open ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive(pathname, link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md border border-border px-3 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-foreground hover:border-primary/50"
            >
              {accountLabel}
            </Link>
            <Link
              href="/planos"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-3 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground"
            >
              Entrar no Lab
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
