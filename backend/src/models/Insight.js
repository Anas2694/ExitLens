const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    patternInput: {
      isBounce: Boolean,
      isLowEngagement: Boolean,
      hasRageClicks: Boolean,
      hasDeadClicks: Boolean,
      duration: Number,
      maxScrollDepth: Number,
      totalClicks: Number,
      rageClickCount: Number,
      deadClickCount: Number,
      exitPage: String,
    },
    summary: { type: String, maxlength: 1000, required: true },
    overallScore: { type: Number, min: 1, max: 10, default: 5 },
    findings: [
      {
        severity: {
          type: String,
          enum: ["info", "warning", "critical"],
          default: "info",
        },
        title: { type: String, maxlength: 100 },
        description: { type: String, maxlength: 500 },
        recommendation: { type: String, maxlength: 500 },
        impact: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
      },
    ],
    // New fields
    whatWorked: [{ type: String, maxlength: 300 }],
    quickWins: [{ type: String, maxlength: 300 }],
    model: { type: String, maxlength: 100 },
    source: {
      type: String,
      enum: ["ai", "rule_based"],
      default: "rule_based",
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

insightSchema.index({ userId: 1, createdAt: -1 });
insightSchema.index({ sessionId: 1 });

const Insight = mongoose.model("Insight", insightSchema);
module.exports = Insight;
