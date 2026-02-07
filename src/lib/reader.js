import fs from "node:fs/promises";
import { getFilePaths } from "./storage.js";

function eventTime(entry) {
  if (entry.recordType === "spanStart") return entry.startTimeUnixNano;
  if (entry.recordType === "spanEnd") return entry.endTimeUnixNano;
  return entry.timeUnixNano;
}

function matches(entry, filters) {
  if (filters.traceId && entry.traceId !== filters.traceId) return false;
  if (filters.spanId && entry.spanId !== filters.spanId) return false;
  if (filters.recordTypes && !filters.recordTypes.includes(entry.recordType)) return false;
  if (filters.sinceTimeUnixNano && BigInt(eventTime(entry)) < BigInt(filters.sinceTimeUnixNano)) return false;
  return true;
}

async function readLines(file) {
  try {
    const txt = await fs.readFile(file, "utf8");
    if (!txt.trim()) return [];
    return txt.trimEnd().split("\n");
  } catch {
    return [];
  }
}

export async function readRecentRecords(context, limit, filters = {}) {
  const { basePath, rotatedPaths } = getFilePaths(context);
  const files = [basePath, ...rotatedPaths];
  const out = [];

  for (const file of files) {
    const lines = await readLines(file);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const entry = JSON.parse(lines[i]);
      if (!matches(entry, filters)) continue;
      out.push(entry);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function tailRecords(context, limit, filters, follow, pollIntervalMs, maxFollowSeconds) {
  const initial = await readRecentRecords(context, limit, filters);
  if (!follow) return initial;

  const result = [...initial];
  let latest = initial.length ? eventTime(initial[0]) : "0";
  const until = Date.now() + maxFollowSeconds * 1000;

  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const next = await readRecentRecords(context, limit, { ...filters, sinceTimeUnixNano: latest });
    for (let i = next.length - 1; i >= 0; i -= 1) {
      const entry = next[i];
      const t = eventTime(entry);
      if (BigInt(t) > BigInt(latest)) {
        latest = t;
        result.push(entry);
      }
    }
  }

  return result;
}
