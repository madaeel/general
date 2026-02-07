import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "./config.js";
import { SkillError } from "./errors.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFilePaths(context) {
  const cfg = resolveConfig(context);
  const basePath = path.join(cfg.journalDir, cfg.baseFilename);
  const rotatedPaths = [];
  for (let i = 1; i <= cfg.maxRotatedFiles; i += 1) {
    rotatedPaths.push(path.join(cfg.journalDir, `openclaw-otel.${i}.jsonl`));
  }
  return { basePath, rotatedPaths };
}

async function withFileLock(lockPath, fn) {
  const timeoutMs = 5000;
  const start = Date.now();
  while (true) {
    try {
      const h = await fs.open(lockPath, "wx");
      try {
        await fn();
      } finally {
        await h.close();
        await fs.unlink(lockPath).catch(() => {});
      }
      return;
    } catch {
      if (Date.now() - start > timeoutMs) throw new SkillError({ code: "LOCK_TIMEOUT", message: "Unable to acquire journal lock" });
      await sleep(25);
    }
  }
}

async function rotateIfNeeded(basePath, rotatedPaths, maxBytes, incomingBytes) {
  let size = 0;
  try {
    size = (await fs.stat(basePath)).size;
  } catch {
    return;
  }
  if (size + incomingBytes <= maxBytes) return;

  await fs.unlink(rotatedPaths[rotatedPaths.length - 1]).catch(() => {});
  for (let i = rotatedPaths.length - 2; i >= 0; i -= 1) {
    await fs.rename(rotatedPaths[i], rotatedPaths[i + 1]).catch(() => {});
  }
  await fs.rename(basePath, rotatedPaths[0]).catch(() => {});
}

export async function appendRecord(context, record) {
  const cfg = resolveConfig(context);
  const { basePath, rotatedPaths } = getFilePaths(context);
  const line = `${JSON.stringify(record)}\n`;
  await fs.mkdir(cfg.journalDir, { recursive: true });

  await withFileLock(`${basePath}.lock`, async () => {
    await rotateIfNeeded(basePath, rotatedPaths, cfg.maxBytes, Buffer.byteLength(line));
    const h = await fs.open(basePath, "a");
    try {
      await h.write(line);
      await h.sync();
    } finally {
      await h.close();
    }
  });
}
