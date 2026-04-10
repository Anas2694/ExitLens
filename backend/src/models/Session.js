const mongoose = require("mongoose");

// ── Event Sub-Schema ──────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "page_view",
        "click",
        "scroll_milestone",
        "page_hidden",
        "exit",
        "custom_event",
      ],
      maxlength: 50,
    },
    ts: { type: Number, required: true },   // epoch ms
    element: { type: String, maxlength: 200 },
    x: { type: Number, min: 0, max: 10000 },
    y: { type: Number, min: 0, max: 10000 },
    xPct: { type: Number, min: 0, max: 100 },
    yPct: { type: Number, min: 0, max: 100 },
    scrollY: { type: Number, min: 0 },
    depth: { type: Number, min: 0, max: 100 }, // scroll milestone %
    url: { type: String, maxlength: 500 },
    isInteractive: Boolean,
    duration: { type: Number, min: 0 },
    exitPage: { type: String, maxlength: 200 },
    // For custom events
    properties: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

// ── Session Schema ─────────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema(
  {
    // ✅ IDOR protection: all queries MUST include userId
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    // Conversion events recorded in this session
    conversions: [
      {
        goalName: { type: String, maxlength: 100 },
        goalType: { type: String, maxlength: 50 },
        value: { type: String, maxlength: 200 },
        ts: { type: Number },
        converted: { type: Boolean, default: true },
      },
    ],
    // Funnel steps reached
    funnelSteps: [
      {
        step: { type: String, maxlength: 100 },
        ts: { type: Number },
        scrollDepth: { type: Number },
      },
    ],
    sessionId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
    },
    // The site/domain this session was tracked on
    pageUrl: { type: String, maxlength: 500 },
    referrer: { type: String, maxlength: 500 },
    exitPage: { type: String, maxlength: 200 },
    // Device info
    userAgent: { type: String, maxlength: 300 },
    screenWidth: { type: Number, min: 0, max: 10000 },
    screenHeight: { type: Number, min: 0, max: 10000 },
    // Core metrics
    duration: { type: Number, default: 0, min: 0 },        // ms
    maxScrollDepth: { type: Number, default: 0, min: 0, max: 100 }, // %
    totalClicks: { type: Number, default: 0, min: 0 },
    // Raw events (capped at 200 per session to prevent abuse)
    events: {
      type: [eventSchema],
      validate: {
        validator: (v) => v.length <= 200,
        message: "Max 200 events per session",
      },
    },
    // Pattern analysis results (populated by pattern engine)
    patterns: {
      isBounce: { type: Boolean, default: false },
      isLowEngagement: { type: Boolean, default: false },
      hasRageClicks: { type: Boolean, default: false },
      hasDeadClicks: { type: Boolean, default: false },
      rageClickCount: { type: Number, default: 0 },
      deadClickCount: { type: Number, default: 0 },
      scrollMilestones: [Number],
    },
    // AI-generated insight (populated lazily)
    insightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insight",
    },
    // Soft-delete
    isDeleted: { type: Boolean, default: false, index: true },
    // Track if this session has been processed by pattern engine
    isAnalyzed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Compound indexes for fast tenant-scoped queries ───────────────────────────
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
sessionSchema.index({ sessionId: 1 }, { unique: true });

// ── TTL: auto-delete sessions older than 90 days ──────────────────────────────
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;
