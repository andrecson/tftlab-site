/**
 * Error monitoring (US-041).
 *
 * Provider-agnostic capture of client-side errors, gated to production. Errors
 * flow in from the App Router error boundaries (`app/error.tsx`,
 * `app/global-error.tsx`) and the global `error` / `unhandledrejection`
 * listeners (`ErrorMonitor`), are normalized to a `CapturedError`, and — in
 * production only, when a reporting endpoint is configured — POSTed as JSON via
 * `navigator.sendBeacon` (falling back to `fetch(..., { keepalive: true })`).
 *
 * In development, or when no endpoint is configured, captures are only logged to
 * the console, so dev / test / CI builds never phone home.
 *
 * Sentry-ready: point `NEXT_PUBLIC_SENTRY_DSN` (or a generic
 * `NEXT_PUBLIC_ERROR_REPORTING_URL`) at your collector and the same captures
 * flow there; swapping in the Sentry SDK only means changing `sendReport`.
 *
 * Client-safe (no server-only imports).
 */

/**
 * Where captured errors are sent. A generic endpoint takes precedence over the
 * Sentry DSN so a collector/proxy can be used without changing code.
 */
export const ERROR_REPORTING_URL =
  process.env.NEXT_PUBLIC_ERROR_REPORTING_URL ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Reporting is only active in production with an endpoint configured. */
export function isErrorMonitoringEnabled(): boolean {
  return IS_PRODUCTION && ERROR_REPORTING_URL.length > 0;
}

/** Where a captured error originated, for triage. */
export type ErrorSource =
  | "error-boundary"
  | "global-error"
  | "window.onerror"
  | "unhandledrejection";

export interface CapturedError {
  message: string;
  stack?: string;
  source?: ErrorSource;
  /** Next.js error digest (server-thrown errors carry one). */
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

/** Normalize any thrown value into a structured, serializable error record. */
export function toCapturedError(
  error: unknown,
  meta?: { source?: ErrorSource; digest?: string },
): CapturedError {
  const err = error instanceof Error ? error : undefined;
  const message =
    err?.message ??
    (typeof error === "string" ? error : "Erro desconhecido no cliente");

  return {
    message,
    stack: err?.stack,
    source: meta?.source,
    digest: meta?.digest,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  };
}

/** POST a captured error to the reporting endpoint; never throws. */
function sendReport(payload: CapturedError): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ERROR_REPORTING_URL, blob)) return;
    }
  } catch {
    // Fall through to fetch below.
  }

  void fetch(ERROR_REPORTING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Swallow — error reporting must never surface a new error.
  });
}

/**
 * Capture an error. In production with a configured endpoint it is reported;
 * otherwise it is logged to the console (dev visibility) and dropped.
 */
export function captureError(
  error: unknown,
  meta?: { source?: ErrorSource; digest?: string },
): void {
  const captured = toCapturedError(error, meta);

  if (isErrorMonitoringEnabled()) {
    sendReport(captured);
    return;
  }

  if (!IS_PRODUCTION && typeof console !== "undefined") {
    console.error("[error-monitoring]", captured);
  }
}
