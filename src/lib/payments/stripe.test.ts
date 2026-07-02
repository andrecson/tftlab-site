import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import {
  parseStripeEvent,
  stripeStatusGrantsAccess,
  verifyStripeSignature,
} from "./stripe";

const SECRET = "whsec_test";

function sign(body: string, ts: number, secret = SECRET): string {
  const v1 = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${v1}`;
}

test("verifyStripeSignature accepts a valid signature within tolerance", () => {
  const body = JSON.stringify({ id: "evt_1", type: "x", data: { object: {} } });
  const ts = 1_700_000_000;
  assert.equal(verifyStripeSignature(body, sign(body, ts), SECRET, ts), true);
});

test("verifyStripeSignature rejects a tampered body", () => {
  const ts = 1_700_000_000;
  assert.equal(verifyStripeSignature("tampered", sign("original", ts), SECRET, ts), false);
});

test("verifyStripeSignature rejects a wrong secret", () => {
  const ts = 1_700_000_000;
  assert.equal(verifyStripeSignature("b", sign("b", ts, "other"), SECRET, ts), false);
});

test("verifyStripeSignature rejects a stale timestamp (>5min)", () => {
  const ts = 1_700_000_000;
  assert.equal(verifyStripeSignature("b", sign("b", ts), SECRET, ts + 600), false);
});

test("verifyStripeSignature rejects missing header / secret", () => {
  assert.equal(verifyStripeSignature("b", null, SECRET), false);
  assert.equal(verifyStripeSignature("b", "t=1,v1=deadbeef", ""), false);
});

test("parseStripeEvent parses well-formed events and rejects junk", () => {
  const ok = parseStripeEvent(
    JSON.stringify({ id: "evt", type: "t", data: { object: { a: 1 } } }),
  );
  assert.equal(ok?.id, "evt");
  assert.equal(parseStripeEvent("{bad json"), null);
  assert.equal(parseStripeEvent(JSON.stringify({ id: "evt" })), null);
});

test("stripeStatusGrantsAccess grants only live statuses", () => {
  for (const s of ["active", "trialing", "past_due"]) {
    assert.equal(stripeStatusGrantsAccess(s), true, s);
  }
  for (const s of ["canceled", "unpaid", "incomplete_expired", ""]) {
    assert.equal(stripeStatusGrantsAccess(s), false, s);
  }
});
