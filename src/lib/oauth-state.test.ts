import assert from "node:assert/strict";
import { test } from "node:test";

import { signState, verifyState } from "./oauth-state";

const SECRET = "test-secret-abc";

test("signState/verifyState round-trips the payload", () => {
  const state = { plan: "month", provider: "stripe", nonce: "n-123" };
  const token = signState(state, SECRET);
  assert.deepEqual(verifyState(token, SECRET), state);
});

test("verifyState rejects a tampered payload (kept signature)", () => {
  const token = signState({ plan: "month", provider: "stripe", nonce: "n" }, SECRET);
  const sig = token.split(".")[1];
  const forgedPayload = Buffer.from(
    JSON.stringify({ plan: "year", provider: "stripe", nonce: "n" }),
    "utf8",
  ).toString("base64url");
  assert.equal(verifyState(`${forgedPayload}.${sig}`, SECRET), null);
});

test("verifyState rejects a wrong secret", () => {
  const token = signState({ plan: "month", provider: "mp", nonce: "n" }, SECRET);
  assert.equal(verifyState(token, "other-secret"), null);
});

test("verifyState rejects malformed / empty input", () => {
  assert.equal(verifyState(null, SECRET), null);
  assert.equal(verifyState("", SECRET), null);
  assert.equal(verifyState("no-dot", SECRET), null);
  assert.equal(verifyState(".", SECRET), null);
  assert.equal(verifyState("a.b", SECRET), null);
});
