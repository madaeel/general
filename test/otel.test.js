import test from "node:test";
import assert from "node:assert/strict";
import { generateSpanId, generateTraceId, normalizeAttributes, nowUnixNanoString } from "../src/lib/otel.js";

test("id formatting", () => {
  assert.match(generateTraceId(), /^[0-9a-f]{32}$/);
  assert.match(generateSpanId(), /^[0-9a-f]{16}$/);
});

test("timestamp generation", () => {
  const ts = nowUnixNanoString();
  assert.match(ts, /^\d+$/);
  assert.ok(BigInt(ts) > 0n);
});

test("redaction and truncation", () => {
  const attrs = normalizeAttributes({ token: "abc", note: "x".repeat(5000) }, true, 4096);
  assert.deepEqual(attrs.token, { stringValue: "[REDACTED]" });
  assert.ok(attrs.note.stringValue.endsWith("...[TRUNCATED]"));
});
