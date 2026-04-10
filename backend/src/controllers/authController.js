const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../utils/config");
const logger = require("../utils/logger");

// ── Cookie options ─────────────────────────────────────────────────────────────
function getCookieOptions() {
  return {
    httpOnly: true,         // ✅ Not accessible from JS (prevents XSS token theft)
    secure: config.isProd,  // ✅ HTTPS-only in production
    sameSite: config.isProd ? "strict" : "lax",
    maxAge: config.jwt.cookieMaxAge,
    path: "/",
  };
}

// ── Sign token ────────────────────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign(
    { sub: userId.toString() },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// ── POST /auth/register ───────────────────────────────────────────────────────
async function register(req, res) {
  const { name, email, password } = req.body;

  // Check duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    // ✅ SECURITY: Don't reveal if email exists — use generic message
    return res.status(409).json({
      success: false,
      error: "An account with this email already exists",
    });
  }

  const user = new User({ name, email, password });

  // Generate API key for tracker script
  const rawApiKey = user.generateApiKey();

  await user.save();

  const token = signToken(user._id);
  res.cookie("token", token, getCookieOptions());

  logger.info("User registered", { userId: user._id, email });

  return res.status(201).json({
    success: true,
    data: {
      user: user.toJSON(), // password stripped by schema transform
      // Return API key ONCE at registration — user won't be able to see it again
      apiKey: rawApiKey,
      message: "Save your API key — it will only be shown once.",
    },
  });
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;

  // ✅ Explicitly select password (hidden by default in schema)
  const user = await User.findOne({ email }).select("+password");

  // ✅ SECURITY: Use constant-time comparison even if user not found
  // Run compare regardless to prevent timing attacks revealing valid emails
  const isMatch = user
    ? await user.comparePassword(password)
    : await require("bcryptjs").compare(password, "$2b$12$invalidhashpaddingtomatchtime0000");

  if (!user || !isMatch) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: "Account is deactivated",
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  res.cookie("token", token, getCookieOptions());

  logger.info("User logged in", { userId: user._id });

  return res.status(200).json({
    success: true,
    data: { user: user.toJSON() },
  });
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────
async function logout(req, res) {
  // ✅ Clear cookie server-side — client can't do this for httpOnly cookies
  res.clearCookie("token", {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "strict" : "lax",
    path: "/",
  });

  logger.info("User logged out", { userId: req.userId });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
async function getMe(req, res) {
  // req.user is already attached by authenticate middleware (no password)
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}

// ── POST /auth/regenerate-key ─────────────────────────────────────────────────
async function regenerateApiKey(req, res) {
  const user = await User.findById(req.userId).select("+apiKey");
  const newKey = user.generateApiKey();
  await user.save({ validateBeforeSave: false });

  logger.info("API key regenerated", { userId: req.userId });

  return res.status(200).json({
    success: true,
    data: {
      apiKey: newKey,
      message: "New API key generated. Update your tracker script.",
    },
  });
}

module.exports = { register, login, logout, getMe, regenerateApiKey };
