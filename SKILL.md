---
{"name":"openclaw-otel-journal","version":"1.0.0","description":"OpenTelemetry-compatible append-only journaling and tracing actions for OpenClaw","actions":["startSpan","endSpan","emitEvent","readRecent","tail"]}
---

# openclaw-otel-journal

Provides append-only JSONL journaling for OpenTelemetry-aligned span lifecycle and span events.

## Storage

- Default path: `<workspace>/journal/openclaw-otel.jsonl`
- Rotation: 50 MB max file size, up to 10 rotated files.
- Files: `openclaw-otel.jsonl`, `openclaw-otel.1.jsonl`, ..., `openclaw-otel.10.jsonl`
- Records are append-only and never mutated.

## Actions

### startSpan

Inputs:
- `name` (string, required)
- `attributes` (object, optional)
- `parent` (optional `{ traceId, spanId }`)
- `traceId` (optional string)
- `kind` (optional enum: `INTERNAL|SERVER|CLIENT|PRODUCER|CONSUMER`)
- `startTimeUnixNano` (optional string|integer)
- `redactionEnabled` (optional bool, default `true`)

Outputs:
- `traceId`
- `spanId`
- `parentSpanId`
- `startTimeUnixNano`

Example:
```json
{
  "action": "startSpan",
  "input": {
    "name": "planner.execute",
    "attributes": {
      "component": "planner",
      "attempt": 1
    }
  }
}
```

### endSpan

Inputs:
- `traceId` (string, required)
- `spanId` (string, required)
- `endTimeUnixNano` (optional string|integer)
- `status` (required `{ code: "OK"|"ERROR", message?: string }`)
- `error` (optional `{ name, message, stack? }`)
- `attributes` (optional object)
- `redactionEnabled` (optional bool, default `true`)

Outputs:
- `traceId`
- `spanId`
- `endTimeUnixNano`
- `status`

### emitEvent

Inputs:
- `traceId` (string, required)
- `spanId` (string, required)
- `name` (string, required)
- `attributes` (optional object)
- `timeUnixNano` (optional string|integer)
- `redactionEnabled` (optional bool, default `true`)

Outputs:
- `traceId`
- `spanId`
- `timeUnixNano`

### readRecent

Inputs:
- `limit` (integer, default `100`, max `2000`)
- `sinceTimeUnixNano` (optional)
- `traceId` (optional)
- `spanId` (optional)
- `recordTypes` (optional array: `spanStart|spanEnd|event`)

Outputs:
- `entries` (array)
- `nextCursor` (optional)

### tail

Inputs:
- `limit` (integer, default `50`, max `500`)
- `traceId` (optional)
- `spanId` (optional)
- `recordTypes` (optional)
- `follow` (bool, default `false`)
- `pollIntervalMs` (integer, default `500`)
- `maxFollowSeconds` (integer, default `30`)

Outputs:
- `entries` (array)

## Integration

Import from `src/index.js` and register exported actions with the OpenClaw action runtime.
