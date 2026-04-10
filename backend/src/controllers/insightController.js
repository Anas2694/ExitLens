const Session = require("../models/Session");
const Insight = require("../models/Insight");
const { generateInsight } = require("../services/aiEngine");
const logger = require("../utils/logger");

/**
 * GET /insights
 * Returns all insights for the authenticated user.
 */
async function listInsights(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [insights, total] = await Promise.all([
    Insight.find({
      userId: req.userId, // ✅ IDOR
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("sessionId", "pageUrl duration maxScrollDepth createdAt")
      .lean(),
    Insight.countDocuments({ userId: req.userId, isDeleted: false }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      insights,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
}

/**
 * GET /insights/:sessionId
 * Returns insight for a specific session.
 */
async function getInsight(req, res) {
  const { sessionId } = req.params;

  if (!/^[a-f\d]{24}$/i.test(sessionId)) {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  // Verify session belongs to user first (IDOR check)
  const session = await Session.findOne({
    _id: sessionId,
    userId: req.userId,
    isDeleted: false,
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const insight = await Insight.findOne({
    sessionId,
    userId: req.userId, // ✅ IDOR
    isDeleted: false,
  }).lean();

  if (!insight) {
    return res.status(404).json({
      success: false,
      error: "No insight generated yet. Use POST /insights/generate.",
    });
  }

  return res.status(200).json({ success: true, data: { insight } });
}

/**
 * POST /insights/generate
 * Triggers AI insight generation for a session.
 */
async function generateInsightForSession(req, res) {
  const { sessionId } = req.body;

  if (!sessionId || !/^[a-f\d]{24}$/i.test(sessionId)) {
    return res.status(422).json({ success: false, error: "Valid sessionId is required" });
  }

  // ✅ IDOR: verify session belongs to this user
  const session = await Session.findOne({
    _id: sessionId,
    userId: req.userId,
    isDeleted: false,
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  // Check if insight already exists
  const existing = await Insight.findOne({
    sessionId,
    userId: req.userId,
    isDeleted: false,
  });

  if (existing) {
    return res.status(200).json({
      success: true,
      data: { insight: existing },
      cached: true,
    });
  }

  // Generate insight
const insightData = await generateInsight({
  duration: session.duration,
  scrollDepth: session.maxScrollDepth,
  clicks: session.totalClicks,
  patterns: session.patterns,
});

  const insight = await Insight.create({
    userId: req.userId,
    sessionId: session._id,
    patternInput: session.patterns,
    ...insightData,
  });

  // Link insight back to session
  session.insightId = insight._id;
  await session.save({ validateBeforeSave: false });

  logger.info("Insight generated", {
    userId: req.userId.toString(),
    sessionId,
    source: insightData.source,
  });

  return res.status(201).json({
    success: true,
    data: { insight },
  });
}

module.exports = { listInsights, getInsight, generateInsightForSession };
