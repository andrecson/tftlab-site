"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/error-monitoring";

import "./globals.css";

/**
 * Global error boundary (US-041).
 *
 * Catches errors thrown in the root layout itself. Because it replaces the root
 * layout when it renders, it must provide its own `<html>` / `<body>`. Reports
 * the error to the monitor and offers a retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { source: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Recarregar
          </button>
        </main>
      </body>
    </html>
  );
}
