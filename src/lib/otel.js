import crypto from "node:crypto";
import { SkillError } from "./errors.js";

const SECRET_KEY_PATTERN = /(token|secret|password|apikey|api_key|authorization|cookie)/i;
const SPAN_KINDS = ["INTERNAL", "SERVER", "CLIENT", "PRODUCER", "CONSUMER"];

export function nowUnixNanoString() {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

export function generateTraceId() {
  return crypto.randomBytes(16).toString("hex");
}

export function generateSpanId() {
  return crypto.randomBytes(8).toString("hex");
}

export function isValidTraceId(value) {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}

export function isValidSpanId(value) {
  return typeof value === "string" && /^[0-9a-f]{16}$/.test(value);
}

export function assertSpanKind(kind) {
  if (kind !== undefined && !SPAN_KINDS.includes(kind)) {
    throw new SkillError({ code: "VALIDATION_ERROR", message: `Invalid span kind: ${kind}` });
  }
}

export function normalizeUnixNano(input) {
  if (input === undefined) return nowUnixNanoString();
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0) throw new SkillError({ code: "VALIDATION_ERROR", message: "Timestamp must be non-negative integer" });
    return String(input);
  }
  if (typeof input === "bigint") return input.toString();
  if (typeof input === "string" && /^\d+$/.test(input)) return input;
  throw new SkillError({ code: "VALIDATION_ERROR", message: "Timestamp must be integer-like" });
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}...[TRUNCATED]` : value;
}

function redactIfNeeded(key, value, enabled) {
  if (enabled && SECRET_KEY_PATTERN.test(key)) return "[REDACTED]";
  return value;
}

function toAnyValue(key, value, redactionEnabled, maxAttributeLength) {
  const v = redactIfNeeded(key, value, redactionEnabled);
  if (typeof v === "string") return { stringValue: truncate(v, maxAttributeLength) };
  if (typeof v === "boolean") return { boolValue: v };
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new SkillError({ code: "VALIDATION_ERROR", message: `Attribute ${key} must be finite` });
    return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map((item) => toAnyValue(key, item, redactionEnabled, maxAttributeLength)) } };
  throw new SkillError({ code: "VALIDATION_ERROR", message: `Unsupported attribute type for ${key}` });
}

export function normalizeAttributes(input, redactionEnabled, maxAttributeLength) {
  if (input === undefined) return undefined;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new SkillError({ code: "VALIDATION_ERROR", message: "Attributes must be an object" });
  }
  const out = {};
  for (const [k, v] of Object.entries(input)) out[k] = toAnyValue(k, v, redactionEnabled, maxAttributeLength);
  return out;
}
