"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  ANALYTICS_DOMAIN,
  ANALYTICS_SRC,
  getAnalyticsConsent,
  isAnalyticsEnabled,
  setAnalyticsConsent,
  trackPageview,
  type ConsentValue,
} from "@/lib/analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";

/**
 * AnalyticsProvider (US-041).
 *
 * Root-layout client component that owns the analytics lifecycle:
 *   - reads the persisted consent decision on mount (client-only, so SSR never
 *     mismatches localStorage),
 *   - shows the {@link ConsentBanner} when analytics is configured but the
 *     visitor hasn't chosen yet,
 *   - loads the cookieless provider script and tracks page views only after
 *     consent is granted.
 *
 * When `NEXT_PUBLIC_ANALYTICS_DOMAIN` is unset the whole thing is inert: no
 * script, no banner, no events — the safe default for dev / preview.
 *
 * It uses `usePathname` (not `useSearchParams`) so it needs no `<Suspense>`
 * boundary and doesn't opt any page out of static rendering — filter changes
 * (query string) intentionally don't create page views; they emit the
 * `filter_apply` event instead.
 */

/** Fires a page view on every pathname change once analytics is active. */
function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageview();
  }, [pathname]);
  return null;
}

export function AnalyticsProvider() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [ready, setReady] = useState(false);

  // Read the persisted decision after mount (avoids SSR/client divergence).
  useEffect(() => {
    setConsent(getAnalyticsConsent());
    setReady(true);
  }, []);

  const decide = useCallback((value: ConsentValue) => {
    setAnalyticsConsent(value);
    setConsent(value);
  }, []);

  const enabled = isAnalyticsEnabled();
  const granted = consent === "granted";

  if (!enabled) return null;

  return (
    <>
      {granted && (
        <>
          <Script
            id="analytics-src"
            src={ANALYTICS_SRC}
            data-domain={ANALYTICS_DOMAIN}
            strategy="afterInteractive"
          />
          <PageviewTracker />
        </>
      )}

      {/* Ask for consent only once the visitor hasn't decided yet. */}
      {ready && consent === null && (
        <ConsentBanner
          onAccept={() => decide("granted")}
          onDecline={() => decide("denied")}
        />
      )}
    </>
  );
}
