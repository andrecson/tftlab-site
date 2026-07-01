"use client";

import { useEffect, useRef } from "react";

import { track, type AnalyticsEventName, type AnalyticsProps } from "@/lib/analytics";

/**
 * TrackEvent (US-041).
 *
 * A render-nothing client component that fires a single analytics event when it
 * mounts. Drop it into a server-rendered page to record an "opened X" event
 * without turning the page into a client component (e.g. `comp_open` on the
 * comp-detail page). Safe on static/ISR pages — an effect doesn't make a page
 * dynamic.
 */
export function TrackEvent({
  name,
  props,
}: {
  name: AnalyticsEventName;
  props?: AnalyticsProps;
}) {
  const fired = useRef(false);
  useEffect(() => {
    // Fire exactly once (guards against React Strict Mode's double-invoke and
    // any prop-identity re-runs).
    if (fired.current) return;
    fired.current = true;
    track(name, props);
  }, [name, props]);
  return null;
}
