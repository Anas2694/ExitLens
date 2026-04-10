const jwt = require("jsonwebtoken");
const config = require("../utils/config");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Middleware: verify JWT from httpOnly cookie.
 * ✅ SECURITY: JWT is stored in httpOnly cookie, NOT localStorage.
 * This prevents XSS attacks from stealing tokens.
 */
async function authenticate(req, res, next) {
  try {
    // ✅ Read from httpOnly cookie, never from Authorization header for web clients
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      // ✅ SECURITY: distinguish expired vs invalid without leaking details
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Session expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        error: "Invalid authentication token",
      });
    }

    // ✅ Verify user still exists and is active (handles deleted accounts)
    const user = await User.findById(decoded.sub).select("-password -apiKey");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account not found or deactivated",
      });
    }

    // Attach user to request for downstream use
    req.user = user;
    req.userId = user._id; // convenience shorthand
    next();
  } catch (err) {
    logger.error("Auth middleware error", { error: err.message });
    return res.status(500).json({
      success: false,
      error: "Internal authentication error",
    });
  }
}

/**
 * Middleware: verify API key for tracker script endpoint.
 * API keys use a separate auth flow from JWTs.
 */
async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"] || (req.body && req.body.apiKey);

   if (!apiKey || typeof apiKey !== "string") {
  logger.warn("Track 401 - no apiKey in body", { body: JSON.stringify(req.body).slice(0, 200) });
  return res.status(401).json({ success: false, error: "API key required" });
}

    // Project key format: elp_...
    // User key format: el_...
    if (apiKey.startsWith("elp_")) {
      // Project-scoped key
      if (!/^elp_[a-f0-9]{64}$/.test(apiKey)) {
        return res.status(401).json({ success: false, error: "Invalid API key format" });
      }
      const Project = require("../models/Project");
      const project = await Project.findByApiKey(apiKey);
      if (!project) {
        return res.status(401).json({ success: false, error: "Invalid API key" });
      }
      req.project = project;
      req.projectId = project._id;
      req.userId = project.userId;
      return next();
    }

    // Legacy user-level key
    if (!/^el_[a-f0-9]{64}$/.test(apiKey)) {
      return res.status(401).json({ success: false, error: "Invalid API key format" });
    }
    const User = require("../models/User");
    const user = await User.findByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid API key" });
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    logger.error("API key auth error", { error: err.message });
    return res.status(500).json({ success: false, error: "Internal authentication error" });
  }
}

module.exports = { authenticate, authenticateApiKey };
