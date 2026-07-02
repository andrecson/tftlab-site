import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { verifyMpSignature } from "./mercadopago";

const SECRET = "mp_test_secret";

function mpSig(
  dataId: string,
  requestId: string | null,
  ts: string,
  secret = SECRET,
): string {
  const manifest =
    `id:${dataId.toLowerCase()};` +
    (requestId ? `request-id:${requestId};` : "") +
    `ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

test("verifyMpSignature accepts a valid signature (with request-id)", () => {
  const sig = mpSig("12345", "req-1", "1700000000");
  assert.equal(verifyMpSignature(sig, "req-1", "12345", SECRET), true);
});

test("verifyMpSignature accepts a valid signature (alphanumeric id, no request-id)", () => {
  const sig = mpSig("abcDEF", null, "1700000000");
  assert.equal(verifyMpSignature(sig, null, "abcDEF", SECRET), true);
});

test("verifyMpSignature rejects a tampered id or wrong secret", () => {
  const sig = mpSig("12345", "req-1", "1700000000");
  assert.equal(verifyMpSignature(sig, "req-1", "99999", SECRET), false);
  assert.equal(verifyMpSignature(sig, "req-1", "12345", "other"), false);
});

test("verifyMpSignature rejects missing pieces", () => {
  assert.equal(verifyMpSignature(null, "r", "1", SECRET), false);
  assert.equal(verifyMpSignature("ts=1,v1=x", "r", null, SECRET), false);
  assert.equal(verifyMpSignature("v1=x", "r", "1", SECRET), false); // no ts
  assert.equal(verifyMpSignature("ts=1", "r", "1", SECRET), false); // no v1
});
