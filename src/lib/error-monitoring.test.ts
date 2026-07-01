import { test } from "node:test";
import assert from "node:assert/strict";

import { isErrorMonitoringEnabled, toCapturedError } from "./error-monitoring";

test("toCapturedError extracts message + stack + meta from an Error", () => {
  const captured = toCapturedError(new Error("boom"), {
    source: "error-boundary",
    digest: "abc123",
  });
  assert.equal(captured.message, "boom");
  assert.ok(captured.stack?.includes("boom"));
  assert.equal(captured.source, "error-boundary");
  assert.equal(captured.digest, "abc123");
  assert.ok(!Number.isNaN(Date.parse(captured.timestamp)));
});

test("toCapturedError handles string and non-error throws", () => {
  assert.equal(toCapturedError("just a string").message, "just a string");
  assert.equal(
    toCapturedError(42).message,
    "Erro desconhecido no cliente",
  );
  assert.equal(
    toCapturedError(null).message,
    "Erro desconhecido no cliente",
  );
});

test("error monitoring is disabled outside production", () => {
  // NODE_ENV !== "production" in tests, so reporting never activates.
  assert.equal(isErrorMonitoringEnabled(), false);
});
