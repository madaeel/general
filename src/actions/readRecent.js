import { createAction } from "../lib/validator.js";
import { readRecentRecords } from "../lib/reader.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 2000 },
    sinceTimeUnixNano: { type: "string" },
    traceId: { type: "string" },
    spanId: { type: "string" },
    recordTypes: { type: "array" },
  },
};

export const readRecent = createAction({
  name: "readRecent",
  schema,
  async handler(input, context) {
    const entries = await readRecentRecords(context, input.limit ?? 100, {
      sinceTimeUnixNano: input.sinceTimeUnixNano,
      traceId: input.traceId,
      spanId: input.spanId,
      recordTypes: input.recordTypes,
    });
    return { entries };
  },
});
