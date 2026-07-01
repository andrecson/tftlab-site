"use client";

import { useEffect } from "react";

import { captureError } from "@/lib/error-monitoring";

/**
 * ErrorMonitor (US-041).
 *
 * Root-layout client component that registers global `error` and
 * `unhandledrejection` listeners so runtime errors outside React's render tree
 * (event handlers, async code, rejected promises) are captured too — the App
 * Router error boundaries only catch render/data errors. Renders nothing.
 */
export function ErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      captureError(event.error ?? event.message, { source: "window.onerror" });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      captureError(event.reason, { source: "unhandledrejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
