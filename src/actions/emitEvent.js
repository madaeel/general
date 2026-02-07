import { createAction } from "../lib/validator.js";
import { resolveConfig } from "../lib/config.js";
import { SkillError } from "../lib/errors.js";
import { isValidSpanId, isValidTraceId, normalizeAttributes, normalizeUnixNano } from "../lib/otel.js";
import { appendRecord } from "../lib/storage.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["traceId", "spanId", "name"],
  properties: {
    traceId: { type: "string" },
    spanId: { type: "string" },
    name: { type: "string", minLength: 1 },
    attributes: { type: "object" },
    timeUnixNano: {},
    redactionEnabled: { type: "boolean" },
  },
};

export const emitEvent = createAction({
  name: "emitEvent",
  schema,
  async handler(input, context) {
    const cfg = resolveConfig(context);
    if (!isValidTraceId(input.traceId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid traceId format" });
    if (!isValidSpanId(input.spanId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid spanId format" });
    const timeUnixNano = normalizeUnixNano(input.timeUnixNano);
    const redactionEnabled = input.redactionEnabled ?? cfg.redactionEnabled;

    await appendRecord(context, {
      recordType: "event",
      traceId: input.traceId,
      spanId: input.spanId,
      name: input.name,
      timeUnixNano,
      attributes: normalizeAttributes(input.attributes, redactionEnabled, cfg.maxAttributeLength),
    });

    return { traceId: input.traceId, spanId: input.spanId, timeUnixNano };
  },
});
