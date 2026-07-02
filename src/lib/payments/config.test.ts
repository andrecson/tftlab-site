import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isPlanInterval,
  isProviderSlug,
  oneTimePeriodEnd,
  PLAN_DURATION_DAYS,
} from "./config";

test("isPlanInterval accepts month/year only", () => {
  assert.equal(isPlanInterval("month"), true);
  assert.equal(isPlanInterval("year"), true);
  assert.equal(isPlanInterval("week"), false);
  assert.equal(isPlanInterval(""), false);
  assert.equal(isPlanInterval(null), false);
  assert.equal(isPlanInterval(undefined), false);
  assert.equal(isPlanInterval(3), false);
});

test("isProviderSlug accepts stripe/mp only", () => {
  assert.equal(isProviderSlug("stripe"), true);
  assert.equal(isProviderSlug("mp"), true);
  assert.equal(isProviderSlug("mercadopago"), false);
  assert.equal(isProviderSlug("paypal"), false);
  assert.equal(isProviderSlug(null), false);
});

test("oneTimePeriodEnd adds exactly the plan duration in days (UTC has no DST)", () => {
  const paidAt = new Date("2026-01-20T12:00:00.000Z"); // crosses a month boundary
  const month = oneTimePeriodEnd("month", paidAt);
  const year = oneTimePeriodEnd("year", paidAt);
  assert.equal(month.getTime() - paidAt.getTime(), PLAN_DURATION_DAYS.month * 86_400_000);
  assert.equal(year.getTime() - paidAt.getTime(), PLAN_DURATION_DAYS.year * 86_400_000);
});

test("oneTimePeriodEnd does not mutate the input date", () => {
  const paidAt = new Date("2026-01-01T00:00:00.000Z");
  const before = paidAt.getTime();
  oneTimePeriodEnd("year", paidAt);
  assert.equal(paidAt.getTime(), before);
});
