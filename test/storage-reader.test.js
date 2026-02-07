import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendRecord } from "../src/lib/storage.js";
import { readRecentRecords, tailRecords } from "../src/lib/reader.js";

async function mkContext(config = {}) {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-otel-"));
  return { workspaceRoot, config };
}

test("rotation behavior", async () => {
  const context = await mkContext({ maxBytes: 300, maxRotatedFiles: 2 });
  for (let i = 0; i < 10; i += 1) {
    await appendRecord(context, { recordType: "event", traceId: "a".repeat(32), spanId: "b".repeat(16), name: `evt-${i}`, timeUnixNano: String(i + 1) });
  }
  const files = await fs.readdir(path.join(context.workspaceRoot, "journal"));
  assert.ok(files.includes("openclaw-otel.jsonl"));
  assert.ok(files.includes("openclaw-otel.1.jsonl"));
});

test("readRecent and tail filtering", async () => {
  const context = await mkContext();
  await appendRecord(context, { recordType: "spanStart", traceId: "1".repeat(32), spanId: "2".repeat(16), parentSpanId: null, name: "span", startTimeUnixNano: "10" });
  await appendRecord(context, { recordType: "event", traceId: "1".repeat(32), spanId: "2".repeat(16), name: "evt", timeUnixNano: "20" });
  await appendRecord(context, { recordType: "spanEnd", traceId: "1".repeat(32), spanId: "2".repeat(16), endTimeUnixNano: "30", status: { code: "OK" } });

  const recent = await readRecentRecords(context, 2, { recordTypes: ["event", "spanEnd"] });
  assert.equal(recent.length, 2);
  assert.equal(recent[0].recordType, "spanEnd");

  const tailed = await tailRecords(context, 10, { sinceTimeUnixNano: "15" }, false, 100, 1);
  assert.equal(tailed.length, 2);
});
