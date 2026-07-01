import Link from "next/link";

/**
 * Public site header (US-013) — styled to match tftlab.com.br: the "TFTLab.br"
 * cyan wordmark, uppercase letter-spaced navigation and the current patch /
 * "última atualização" metadata. Presentational server component; data is passed
 * in by the (public) layout so this stays pure and cache-friendly. The Tier List
 * and Builder are the two public tabs.
 */
interface SiteHeaderProps {
  /** Current patch version (e.g. "17.2"); null before a patch is configured. */
  patchVersion: string | null;
  /** When the site config was last updated; null before it is configured. */
  updatedAt: Date | null;
}

const NAV_LINKS = [
  { href: "/", label: "Tier List" },
  { href: "/builder", label: "Builder" },
] as const;

/** Stable pt-BR DD/MM/YYYY formatting (UTC parts, no locale/timezone drift). */
function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function SiteHeader({ patchVersion, updatedAt }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-5 sm:gap-8">
          {/* Wordmark — tftlab.com.br style: cyan bold italic + muted ".br". */}
          <Link
            href="/"
            aria-label="TFTLab.br"
            className="text-xl font-bold italic tracking-tight"
          >
            <span className="text-primary">TFTLab</span>
            <span className="text-primary/50">.br</span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className="flex items-center gap-4 sm:gap-6"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary sm:text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {(patchVersion || updatedAt) && (
            <div className="hidden text-right text-xs leading-tight text-muted-foreground sm:block">
              {patchVersion && (
                <p>
                  Patch{" "}
                  <span className="font-semibold text-primary">
                    {patchVersion}
                  </span>
                </p>
              )}
              {updatedAt && <p>Última atualização: {formatDate(updatedAt)}</p>}
            </div>
          )}
          <Link
            href="/admin/login"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:text-sm"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
