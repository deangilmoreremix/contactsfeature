type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, msg: string, meta?: any) {
  const base = `[SmartCRM][${level.toUpperCase()}] ${msg}`;
  if (meta) {
    console.log(base, meta);
  } else {
    console.log(base);
  }
}

export const logger = {
  debug: (msg: string, meta?: any) => log("debug", msg, meta),
  info: (msg: string, meta?: any) => log("info", msg, meta),
  warn: (msg: string, meta?: any) => log("warn", msg, meta),
  error: (msg: string, meta?: any) => log("error", msg, meta)
};
