import { createAction } from "../lib/validator.js";
import { resolveConfig } from "../lib/config.js";
import { appendRecord } from "../lib/storage.js";
import { assertSpanKind, generateSpanId, generateTraceId, isValidSpanId, isValidTraceId, normalizeAttributes, normalizeUnixNano } from "../lib/otel.js";
import { SkillError } from "../lib/errors.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1 },
    attributes: { type: "object" },
    parent: { type: "object" },
    traceId: { type: "string" },
    kind: { type: "string", enum: ["INTERNAL", "SERVER", "CLIENT", "PRODUCER", "CONSUMER"] },
    startTimeUnixNano: {},
    redactionEnabled: { type: "boolean" },
  },
};

export const startSpan = createAction({
  name: "startSpan",
  schema,
  async handler(input, context) {
    const cfg = resolveConfig(context);
    if (input.parent && (!input.parent.traceId || !input.parent.spanId)) {
      throw new SkillError({ code: "VALIDATION_ERROR", message: "parent must include traceId and spanId" });
    }

    const traceId = input.parent?.traceId ?? input.traceId ?? generateTraceId();
    if (!isValidTraceId(traceId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid traceId format" });
    const parentSpanId = input.parent?.spanId ?? null;
    if (parentSpanId && !isValidSpanId(parentSpanId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid parent spanId format" });
    if (input.parent && input.traceId && input.traceId !== input.parent.traceId) {
      throw new SkillError({ code: "VALIDATION_ERROR", message: "traceId must match parent.traceId when both are supplied" });
    }

    assertSpanKind(input.kind);
    const spanId = generateSpanId();
    const startTimeUnixNano = normalizeUnixNano(input.startTimeUnixNano);
    const redactionEnabled = input.redactionEnabled ?? cfg.redactionEnabled;

    await appendRecord(context, {
      recordType: "spanStart",
      traceId,
      spanId,
      parentSpanId,
      name: input.name,
      kind: input.kind,
      startTimeUnixNano,
      attributes: normalizeAttributes(input.attributes, redactionEnabled, cfg.maxAttributeLength),
    });

    return { traceId, spanId, parentSpanId, startTimeUnixNano };
  },
});
