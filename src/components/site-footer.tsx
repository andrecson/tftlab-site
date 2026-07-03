import Link from "next/link";

import { SOCIAL_LINKS, WHATSAPP_URL } from "@/lib/marketing";

/**
 * Unified public footer (merged site): wordmark + pitch, social, quick links,
 * support, and the legal disclaimer that TFTLab is not affiliated with Riot
 * Games (required for any TFT fan site using Riot assets/marks). A discreet
 * curator login lives here too.
 */
const QUICK_LINKS = [
  { href: "/", label: "Início" },
  { href: "/tier-list", label: "Tier List" },
  { href: "/builder", label: "Builder" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand + pitch + social */}
          <div className="md:col-span-2">
            <Link href="/" className="text-2xl font-black italic tracking-tight">
              <span className="text-primary">TFTLab</span>
              <span className="text-primary/50">.br</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Sua plataforma para evoluir no Teamfight Tactics: aprenda com os
              melhores, domine o meta com tier lists e guias, e alcance o elo
              que você merece.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.48-1.38-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.x}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">
              Navegação
            </p>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">
              Suporte
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  Contato
                </a>
              </li>
              <li>
                <Link
                  href="/admin/login"
                  className="transition-colors hover:text-primary"
                >
                  Área de curadores
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            TFTLab não é afiliado, endossado ou patrocinado pela Riot Games e não
            reflete as opiniões da Riot Games ou de qualquer envolvido na produção
            ou gestão de Teamfight Tactics. Teamfight Tactics e Riot Games são
            marcas registradas ou marcas comerciais da Riot Games, Inc.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} TFTLab.br. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
