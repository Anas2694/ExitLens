const rateLimit = require("express-rate-limit");
const config = require("../utils/config");
const logger = require("../utils/logger");

/**
 * ✅ SECURITY: Rate limiting prevents brute force, DDoS, and scraping.
 * Different limits for different endpoint sensitivity levels.
 */

// ── Generic response for rate limit hits ─────────────────────────────────────
function rateLimitResponse(req, res) {
  logger.warn("Rate limit exceeded", {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });
  return res.status(429).json({
    success: false,
    error: "Too many requests. Please try again later.",
    retryAfter: Math.ceil(res.getHeader("Retry-After") || 60),
  });
}

// ── Auth endpoints: very strict (prevent brute force) ────────────────────────
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,   // 15 minutes
  max: config.rateLimit.auth.max,             // default: 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  // ✅ Skip successful requests from the count (only count failures)
  skipSuccessfulRequests: false,
  // ✅ Key by IP + route for precision
  keyGenerator: (req) => `${req.ip}:${req.path}`,
});

// ── Tracking endpoint: higher limit (real-user traffic) ──────────────────────
const trackLimiter = rateLimit({
  windowMs: config.rateLimit.track.windowMs,  // 1 minute
  max: config.rateLimit.track.max,            // default: 200 req/min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  // Key by API key (not IP) for tracking endpoints — fairer for shared IPs
  keyGenerator: (req) => {
    const apiKey = req.headers["x-api-key"] || (req.body && req.body.apiKey) || req.ip;
    return String(apiKey).slice(0, 70); // truncate to prevent memory issues
  },
});

// ── General API: moderate limit ───────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,    // 15 minutes
  max: config.rateLimit.api.max,              // default: 100
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  keyGenerator: (req) => req.ip,
});

module.exports = { authLimiter, trackLimiter, apiLimiter };
