/**
 * Config loader — validates ALL required env vars at startup.
 * If any are missing the process exits with a clear error.
 * This prevents "works on my machine" silent failures.
 */
const logger = require("../utils/logger");

function requireEnv(key, fallback) {
  const val = process.env[key] || fallback;
  if (!val) {
    logger.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return val;
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  baseUrl: process.env.BASE_URL || "http://localhost:4000",

  mongo: {
    uri: requireEnv("MONGODB_URI", process.env.NODE_ENV === "test"
      ? "mongodb://127.0.0.1:27017/exitlens_test"
      : null),
  },

  jwt: {
    secret: requireEnv("JWT_SECRET", process.env.NODE_ENV === "test" ? "test_secret_do_not_use_in_prod_ever" : null),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    cookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE_MS || "604800000", 10),
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
  },

  ai: {
    provider: process.env.AI_PROVIDER || "gemini",
    geminiKey: process.env.GEMINI_API_KEY || "",
    openaiKey: process.env.OPENAI_API_KEY || "",
  },

  rateLimit: {
    auth: { max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "5", 10), windowMs: 15 * 60 * 1000 },
    track: { max: parseInt(process.env.RATE_LIMIT_TRACK_MAX || "200", 10), windowMs: 60 * 1000 },
    api: { max: parseInt(process.env.RATE_LIMIT_API_MAX || "100", 10), windowMs: 15 * 60 * 1000 },
  },

  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};

module.exports = config;
