/**
 * Public site footer (US-013).
 *
 * Static presentational component. Carries the legal disclaimer that MetaComps
 * is not affiliated with Riot Games (required for any TFT fan site using Riot
 * assets/marks).
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          MetaComps não é afiliado, endossado ou patrocinado pela Riot Games e
          não reflete as opiniões da Riot Games ou de qualquer envolvido na
          produção ou gestão de Teamfight Tactics. Teamfight Tactics e Riot
          Games são marcas registradas ou marcas comerciais da Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
