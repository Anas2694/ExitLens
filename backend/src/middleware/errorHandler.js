const logger = require("../utils/logger");
const config = require("../utils/config");

/**
 * Centralized error handler.
 * ✅ SECURITY: Never leak stack traces or internal details in production.
 */
function errorHandler(err, req, res, next) {
  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      error: "Validation failed",
      details: messages,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  // JWT errors (shouldn't reach here normally, handled in auth middleware)
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  // Log unexpected errors with full context
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // ✅ SECURITY: generic message in production
  const message = config.isProd
    ? "An internal error occurred"
    : err.message;

  return res.status(err.statusCode || 500).json({
    success: false,
    error: message,
    ...(config.isProd ? {} : { stack: err.stack }),
  });
}

/**
 * 404 handler — catches unknown routes.
 */
function notFound(req, res) {
  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}

module.exports = { errorHandler, notFound };
