import { createAction } from "../lib/validator.js";
import { resolveConfig } from "../lib/config.js";
import { SkillError } from "../lib/errors.js";
import { isValidSpanId, isValidTraceId, normalizeAttributes, normalizeUnixNano } from "../lib/otel.js";
import { appendRecord } from "../lib/storage.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["traceId", "spanId", "status"],
  properties: {
    traceId: { type: "string" },
    spanId: { type: "string" },
    endTimeUnixNano: {},
    status: { type: "object" },
    error: { type: "object" },
    attributes: { type: "object" },
    redactionEnabled: { type: "boolean" },
  },
};

export const endSpan = createAction({
  name: "endSpan",
  schema,
  async handler(input, context) {
    const cfg = resolveConfig(context);
    if (!isValidTraceId(input.traceId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid traceId format" });
    if (!isValidSpanId(input.spanId)) throw new SkillError({ code: "VALIDATION_ERROR", message: "Invalid spanId format" });
    if (!input.status || !["OK", "ERROR"].includes(input.status.code)) {
      throw new SkillError({ code: "VALIDATION_ERROR", message: "status.code must be OK or ERROR" });
    }
    if (input.error && (!input.error.name || !input.error.message)) {
      throw new SkillError({ code: "VALIDATION_ERROR", message: "error requires name and message" });
    }

    const endTimeUnixNano = normalizeUnixNano(input.endTimeUnixNano);
    const redactionEnabled = input.redactionEnabled ?? cfg.redactionEnabled;
    const status = input.error ? { ...input.status, code: "ERROR" } : input.status;

    await appendRecord(context, {
      recordType: "spanEnd",
      traceId: input.traceId,
      spanId: input.spanId,
      endTimeUnixNano,
      status,
      error: input.error,
      attributes: normalizeAttributes(input.attributes, redactionEnabled, cfg.maxAttributeLength),
    });

    return { traceId: input.traceId, spanId: input.spanId, endTimeUnixNano, status };
  },
});
