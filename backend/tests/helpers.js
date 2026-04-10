/**
 * Test helpers — shared utilities for all integration tests.
 * Uses real Express app with mocked DB layer via jest.mock.
 */

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_do_not_use_in_prod_ever";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/exitlens_test";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.RATE_LIMIT_AUTH_MAX = "100";   // relax for tests
process.env.RATE_LIMIT_TRACK_MAX = "1000";
process.env.RATE_LIMIT_API_MAX = "1000";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ── Token Factories ────────────────────────────────────────────────────────────
function makeToken(userId, options = {}) {
  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: options.expiresIn || "7d" }
  );
}

function makeExpiredToken(userId) {
  return makeToken(userId, { expiresIn: "-1s" });
}

function makeObjectId() {
  return new mongoose.Types.ObjectId();
}

// ── Mock User Factory ──────────────────────────────────────────────────────────
function makeMockUser(overrides = {}) {
  const id = makeObjectId();
  return {
    _id: id,
    id: id.toString(),
    name: "Test User",
    email: "test@example.com",
    plan: "free",
    isActive: true,
    toJSON() { return { ...this, password: undefined, apiKey: undefined }; },
    ...overrides,
  };
}

// ── Mock Session Factory ───────────────────────────────────────────────────────
function makeMockSession(userId, overrides = {}) {
  return {
    _id: makeObjectId(),
    userId,
    sessionId: "550e8400-e29b-41d4-a716-446655440000",
    pageUrl: "https://example.com/landing",
    duration: 12000,
    maxScrollDepth: 60,
    totalClicks: 5,
    patterns: {
      isBounce: false,
      isLowEngagement: false,
      hasRageClicks: false,
      hasDeadClicks: false,
    },
    events: [],
    isDeleted: false,
    createdAt: new Date(),
    toJSON() { return this; },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

module.exports = {
  makeToken,
  makeExpiredToken,
  makeObjectId,
  makeMockUser,
  makeMockSession,
};
