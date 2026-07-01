"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/error-monitoring";

/**
 * Route-segment error boundary (US-041).
 *
 * Catches render/data errors thrown anywhere in the app tree, reports them to
 * the error monitor, and shows a friendly pt-BR fallback with a retry. It
 * renders inside the root layout's `<body>`, so it can use the theme classes.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { source: "error-boundary", digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        Algo deu errado
      </h1>
      <p className="text-sm text-muted-foreground">
        Ocorreu um erro inesperado ao carregar esta página. Você pode tentar
        novamente.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Tentar novamente
      </button>
    </main>
  );
}
