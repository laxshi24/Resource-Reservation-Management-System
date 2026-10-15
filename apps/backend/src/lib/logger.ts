type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (process.env.NODE_ENV === "test" && !configured) return ORDER.error + 1; // silent in tests
  return ORDER[configured ?? "info"] ?? ORDER.info;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (ORDER[level] < threshold()) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...context });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Minimal structured (JSON-lines) logger. Server-side only; never sent to clients. */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
