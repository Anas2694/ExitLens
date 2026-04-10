require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./src/app");
const config = require("./src/utils/config");
const logger = require("./src/utils/logger");

// ── MongoDB Connection ────────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info("MongoDB connected", { uri: config.mongo.uri.replace(/\/\/.*@/, "//***@") });
  } catch (err) {
    logger.error("MongoDB connection failed", { error: err.message });
    process.exit(1);
  }
}

// ── Start Server ──────────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`ExitLens API running`, {
      port: config.port,
      env: config.env,
      pid: process.pid,
    });
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  // Handles PM2 restarts, Render deploys, and SIGTERM from container orchestrators
  async function shutdown(signal) {
    logger.info(`${signal} received — graceful shutdown starting`);

    server.close(async () => {
      logger.info("HTTP server closed");
      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown", { error: err.message });
        process.exit(1);
      }
    });

    // Force kill after 15s if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 15000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  // ── Unhandled Promise Rejections ──────────────────────────────────────────
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    // Don't crash — log and continue (PM2 will restart if truly broken)
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    shutdown("UNCAUGHT_EXCEPTION");
  });
}

start();
