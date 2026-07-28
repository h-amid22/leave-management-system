import "server-only";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  event: string;
  errorName?: string;
  errorCode?: string;
  route?: string;
}

function write(level: LogLevel, context: LogContext) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...context,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (context: LogContext) => write("info", context),
  warn: (context: LogContext) => write("warn", context),
  error: (context: LogContext) => write("error", context),
};
