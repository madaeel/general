import path from "node:path";

export function resolveConfig(context) {
  return {
    journalDir: path.join(context.workspaceRoot, "journal"),
    baseFilename: "openclaw-otel.jsonl",
    maxBytes: 50 * 1024 * 1024,
    maxRotatedFiles: 10,
    redactionEnabled: true,
    maxAttributeLength: 4096,
    ...context.config,
  };
}
