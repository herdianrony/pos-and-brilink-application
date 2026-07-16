import fs from "fs/promises";
import path from "path";

export type AppLogLevel = "debug" | "info" | "warn" | "error";

export interface AppLogEntry {
  ts: string;
  level: AppLogLevel;
  source: string;
  message: string;
  details?: unknown;
}

const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DETAIL_LENGTH = 3000;

function getLogDir() {
  return process.env.APP_LOG_DIR || path.join(process.cwd(), ".data", "logs");
}

export function getAppLogPath() {
  return path.join(getLogDir(), "app.log");
}

export function getNextServerLogPath() {
  return path.join(getLogDir(), "next-server.log");
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 12).join("\n"),
    };
  }
  if (typeof value === "string") {
    return value.length > MAX_DETAIL_LENGTH ? `${value.slice(0, MAX_DETAIL_LENGTH)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (depth >= 3) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    const lower = key.toLowerCase();
    if (lower.includes("password") || lower.includes("token") || lower.includes("secret") || lower.includes("pin")) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = sanitize(item, depth + 1);
  }
  return out;
}

async function rotateIfNeeded(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size <= MAX_LOG_FILE_BYTES) return;
    const rotated = `${filePath}.1`;
    await fs.rm(rotated, { force: true }).catch(() => {});
    await fs.rename(filePath, rotated).catch(() => {});
  } catch {
    // file belum ada
  }
}

export async function appendAppLog(level: AppLogLevel, source: string, message: string, details?: unknown) {
  const entry: AppLogEntry = {
    ts: new Date().toISOString(),
    level,
    source,
    message: String(message || "").slice(0, 1000),
    ...(details !== undefined ? { details: sanitize(details) } : {}),
  };

  const logPath = getAppLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 }).catch(() => {});
  await rotateIfNeeded(logPath);
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
}

async function readTailLines(filePath: string, maxLines: number) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  } catch {
    return [];
  }
}

function parseAppLogLine(line: string): AppLogEntry | null {
  try {
    const parsed = JSON.parse(line) as AppLogEntry;
    if (!parsed.ts || !parsed.level || !parsed.message) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseTextLogLine(line: string): AppLogEntry {
  const isError = /\berror\b|\[stderr\]|failed|gagal/i.test(line);
  const isWarn = /\bwarn/i.test(line);
  return {
    ts: new Date().toISOString(),
    level: isError ? "error" : isWarn ? "warn" : "info",
    source: "next-server",
    message: line.slice(0, 1000),
  };
}

export async function readLogs(options: { limit?: number; level?: string; q?: string } = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 200), 1), 1000);
  const [appLines, nextLines] = await Promise.all([
    readTailLines(getAppLogPath(), limit),
    readTailLines(getNextServerLogPath(), Math.min(limit, 300)),
  ]);

  let entries = [
    ...appLines.map(parseAppLogLine).filter(Boolean),
    ...nextLines.map(parseTextLogLine),
  ] as AppLogEntry[];

  if (options.level && options.level !== "all") {
    entries = entries.filter((entry) => entry.level === options.level);
  }
  if (options.q) {
    const q = options.q.toLowerCase();
    entries = entries.filter((entry) =>
      `${entry.source} ${entry.message} ${JSON.stringify(entry.details || "")}`.toLowerCase().includes(q),
    );
  }

  return entries
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, limit);
}

export async function clearAppLogs() {
  await fs.rm(getAppLogPath(), { force: true }).catch(() => {});
  await appendAppLog("info", "system/logs", "Log aplikasi dibersihkan oleh admin");
}
