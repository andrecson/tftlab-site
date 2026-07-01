import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ANALYTICS_EVENTS,
  getAnalyticsConsent,
  hasAnalyticsConsent,
  isAnalyticsEnabled,
  track,
  trackPageview,
} from "./analytics";

test("ANALYTICS_EVENTS covers the required product events", () => {
  assert.equal(ANALYTICS_EVENTS.pageview, "pageview");
  assert.equal(ANALYTICS_EVENTS.filterApply, "filter_apply");
  assert.equal(ANALYTICS_EVENTS.compOpen, "comp_open");
  assert.equal(ANALYTICS_EVENTS.builderOpen, "builder_open");
});

test("analytics is disabled without a configured domain", () => {
  // NEXT_PUBLIC_ANALYTICS_DOMAIN is unset in the test env.
  assert.equal(isAnalyticsEnabled(), false);
});

test("consent helpers are safe without a browser (no window)", () => {
  assert.equal(getAnalyticsConsent(), null);
  assert.equal(hasAnalyticsConsent(), false);
});

test("track / trackPageview are no-ops on the server (never throw)", () => {
  assert.doesNotThrow(() => track(ANALYTICS_EVENTS.compOpen, { slug: "x" }));
  assert.doesNotThrow(() => trackPageview());
});
