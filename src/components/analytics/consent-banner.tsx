"use client";

/**
 * Analytics consent banner (US-041).
 *
 * A privacy-friendly bottom banner shown only when analytics is configured and
 * the visitor hasn't decided yet. Accepting stores consent and loads the
 * cookieless analytics script; declining stores the refusal and nothing is
 * loaded. Copy is pt-BR, consistent with the rest of the UI.
 */
interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  return (
    <div
      role="dialog"
      aria-label="Consentimento de análise de uso"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos análise de uso{" "}
          <strong className="font-semibold text-foreground">
            sem cookies
          </strong>{" "}
          e anônima para entender quais comps são mais úteis. Nenhum dado pessoal
          é coletado.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
