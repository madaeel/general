import { createAction } from "../lib/validator.js";
import { tailRecords } from "../lib/reader.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 500 },
    traceId: { type: "string" },
    spanId: { type: "string" },
    recordTypes: { type: "array" },
    follow: { type: "boolean" },
    pollIntervalMs: { type: "integer", minimum: 1 },
    maxFollowSeconds: { type: "integer", minimum: 1 },
  },
};

export const tail = createAction({
  name: "tail",
  schema,
  async handler(input, context) {
    const entries = await tailRecords(
      context,
      input.limit ?? 50,
      {
        traceId: input.traceId,
        spanId: input.spanId,
        recordTypes: input.recordTypes,
      },
      input.follow ?? false,
      input.pollIntervalMs ?? 500,
      input.maxFollowSeconds ?? 30,
    );

    return { entries };
  },
});
