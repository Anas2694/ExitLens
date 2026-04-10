const { createLogger, format, transports } = require("winston");
const path = require("path");
require("winston-daily-rotate-file");

const { combine, timestamp, errors, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV !== "production";
const logDir = process.env.LOG_DIR || "./logs";
const logLevel = process.env.LOG_LEVEL || "info";

// ── Dev console format ────────────────────────────────────────────────────────
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `${timestamp} ${level}: ${stack || message} ${metaStr}`;
  })
);

// ── Production JSON format ────────────────────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: logLevel,
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: "exitlens-api" },
  transports: [
    new transports.Console(),
  ],
  // Don't crash on uncaught exceptions in tests
  exitOnError: false,
});

// Rotate files only in production / non-test
if (process.env.NODE_ENV !== "test") {
  logger.add(
    new transports.DailyRotateFile({
      dirname: logDir,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
      level: "info",
    })
  );

  logger.add(
    new transports.DailyRotateFile({
      dirname: logDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
      level: "error",
    })
  );
}

// ── Stream for Morgan HTTP logging ────────────────────────────────────────────
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
