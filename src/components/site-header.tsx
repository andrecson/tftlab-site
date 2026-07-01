import Link from "next/link";

/**
 * Public site header (US-013).
 *
 * Presentational server component: the brand wordmark (brand-gradient), primary
 * navigation (Tierlist / Builder) and the current patch + "última atualização"
 * metadata. Data is passed in by the (public) layout so this stays a pure,
 * cache-friendly component.
 */
interface SiteHeaderProps {
  /** Current patch version (e.g. "17.2"); null before a patch is configured. */
  patchVersion: string | null;
  /** When the site config was last updated; null before it is configured. */
  updatedAt: Date | null;
}

const NAV_LINKS = [
  { href: "/", label: "Tierlist" },
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="bg-brand-gradient bg-clip-text text-xl font-bold tracking-tight text-transparent"
          >
            MetaComps
          </Link>
          <nav
            aria-label="Navegação principal"
            className="flex items-center gap-3 text-sm font-medium sm:gap-5"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {(patchVersion || updatedAt) && (
            <div className="text-right text-xs leading-tight text-muted-foreground">
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
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
