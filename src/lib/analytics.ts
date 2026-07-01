/**
 * Privacy-friendly analytics (US-041).
 *
 * Provider-agnostic, cookieless event tracking. The concrete provider is
 * Plausible (loaded by `AnalyticsProvider` only after the visitor consents): its
 * script exposes a global `window.plausible(event, { props })`. This module is
 * the single place the rest of the app records an event, so swapping providers
 * (or self-hosting) is a one-file change.
 *
 * Nothing is ever sent unless BOTH (a) analytics is configured
 * (`NEXT_PUBLIC_ANALYTICS_DOMAIN`) and (b) the visitor granted consent. No
 * cookies, no PII — only the event name plus a few low-cardinality game props.
 *
 * Client-safe (no server-only imports), so `"use client"` components may import
 * `track`/`ANALYTICS_EVENTS` directly.
 */

/** localStorage key holding the visitor's analytics consent decision. */
export const ANALYTICS_CONSENT_KEY = "metacomps.analytics-consent";

export type ConsentValue = "granted" | "denied";

/**
 * The analytics events this product records. The three product-required events
 * (US-041 AC) are `filter_apply`, `comp_open` and `builder_open`; `pageview` is
 * the baseline privacy-friendly page metric.
 */
export const ANALYTICS_EVENTS = {
  pageview: "pageview",
  filterApply: "filter_apply",
  compOpen: "comp_open",
  builderOpen: "builder_open",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Low-cardinality, non-PII properties attached to an event. */
export type AnalyticsProps = Record<string, string | number | boolean>;

/**
 * Plausible's global. The manual/queue stub and the real script share this
 * shape: it is callable and carries an optional `q` command buffer that the
 * loaded script flushes.
 */
type PlausibleFn = {
  (event: string, options?: { props?: AnalyticsProps }): void;
  q?: unknown[];
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

/** Plausible site domain to attribute events to (unset => analytics disabled). */
export const ANALYTICS_DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? "";

/**
 * Analytics script source. Defaults to Plausible's manual-pageview script (we
 * fire pageviews ourselves on route change), overridable for self-hosted /
 * proxied instances.
 */
export const ANALYTICS_SRC =
  process.env.NEXT_PUBLIC_ANALYTICS_SRC ??
  "https://plausible.io/js/script.manual.js";

/** Analytics is only active when a site domain is configured. */
export function isAnalyticsEnabled(): boolean {
  return ANALYTICS_DOMAIN.length > 0;
}

function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // localStorage can throw in private mode / when storage is disabled.
    return null;
  }
}

/** The stored consent decision, or `null` if the visitor hasn't chosen yet. */
export function getAnalyticsConsent(): ConsentValue | null {
  return readConsent();
}

/** Persist the visitor's consent decision. */
export function setAnalyticsConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Ignore — a denied write just means we re-ask next visit.
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === "granted";
}

/**
 * Ensure `window.plausible` exists as a command queue so events fired before the
 * external script loads are buffered (the script flushes `plausible.q` on load).
 * This is Plausible's documented init snippet, expressed in TS.
 */
function ensurePlausibleQueue(): void {
  if (typeof window.plausible === "function") return;
  const queue: unknown[] = [];
  const stub = (...args: unknown[]) => {
    queue.push(args);
  };
  (stub as PlausibleFn).q = queue;
  window.plausible = stub as PlausibleFn;
}

/**
 * Record an analytics event. No-ops unless analytics is enabled AND the visitor
 * consented. Calls are buffered until the provider script loads, so it is safe
 * to call from anywhere on the client (event handlers, effects).
 */
export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) return;
  ensurePlausibleQueue();
  window.plausible?.(name, props ? { props } : undefined);
}

/** Record a page view (Plausible reads the current URL itself). */
export function trackPageview(): void {
  track(ANALYTICS_EVENTS.pageview);
}
