const jwt = require("jsonwebtoken");
const config = require("../utils/config");
const User = require("../models/User");
const logger = require("../utils/logger");

async function authenticate(req, res, next) {
  try {
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

    const user = await User.findById(decoded.sub).select("-password -apiKey");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account not found or deactivated",
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    logger.error("Auth middleware error", { error: err.message });
    return res.status(500).json({
      success: false,
      error: "Internal authentication error",
    });
  }
}

async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"] || (req.body && req.body.apiKey);

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({
        success: false,
        error: "API key required",
      });
    }

    if (apiKey.startsWith("elp_")) {
      if (!/^elp_[a-f0-9]{64}$/.test(apiKey)) {
        return res.status(401).json({
          success: false,
          error: "Invalid API key format",
        });
      }

      const Project = require("../models/Project");
      const project = await Project.findOne({
        apiKey,
        isActive: true,
        isDeleted: false,
      });

      if (!project) {
        return res.status(401).json({
          success: false,
          error: "Invalid API key",
        });
      }

      req.project = project;
      req.projectId = project._id;
      req.userId = project.userId;
      return next();
    }

    if (!/^el_[a-f0-9]{64}$/.test(apiKey)) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key format",
      });
    }

    const user = await User.findOne({ apiKey, isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    logger.error("API key auth error", { error: err.message });
    return res.status(500).json({
      success: false,
      error: "Internal authentication error",
    });
  }
}

module.exports = { authenticate, authenticateApiKey };
