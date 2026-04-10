const Session = require("../models/Session");
const logger = require("../utils/logger");

/**
 * GET /sessions
 * Returns sessions ONLY for logged-in user
 */
async function listSessions(req, res) {
  const {
    page = 1,
    limit = 20,
    from,
    to,
    isBounce,
  } = req.query;

  // ✅ RESTORED USER FILTER
  const filter = {
    userId: req.userId,
    isDeleted: false,
  };

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
 if (to) {
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999); // ✅ include full day
  filter.createdAt.$lte = toDate;
}
  }

  if (typeof isBounce !== "undefined") {
    filter["patterns.isBounce"] = isBounce === "true" || isBounce === true;
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .select("-events")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Session.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      sessions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
  });
}

/**
 * GET /sessions/:id
 */
async function getSession(req, res) {
  const { id } = req.params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({
      success: false,
      error: "Invalid session ID",
    });
  }

  // ✅ RESTORED USER FILTER
  const session = await Session.findOne({
    _id: id,
    userId: req.userId,
    isDeleted: false,
  })
    .populate("insightId", "-__v")
    .lean();

  if (!session) {
    return res.status(404).json({
      success: false,
      error: "Session not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: { session },
  });
}

/**
 * GET /sessions/stats
 */
async function getStats(req, res) {
  const { from, to } = req.query;

  // ✅ RESTORED USER FILTER
  const matchFilter = {
    userId: req.userId,
    isDeleted: false,
  };

  if (from || to) {
    matchFilter.createdAt = {};
    if (from) matchFilter.createdAt.$gte = new Date(from);
    if (to) {
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  matchFilter.createdAt.$lte = toDate;
}
  }

  const stats = await Session.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgDuration: { $avg: "$duration" },
        avgScrollDepth: { $avg: "$maxScrollDepth" },
        bounces: { $sum: { $cond: ["$patterns.isBounce", 1, 0] } },
        lowEngagement: { $sum: { $cond: ["$patterns.isLowEngagement", 1, 0] } },
        rageClicks: { $sum: { $cond: ["$patterns.hasRageClicks", 1, 0] } },
        totalClicks: { $sum: "$totalClicks" },
      },
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        avgDurationMs: { $round: ["$avgDuration", 0] },
        avgScrollDepthPct: { $round: ["$avgScrollDepth", 1] },
        bounceRate: {
          $round: [
            {
              $multiply: [
                { $divide: ["$bounces", { $max: ["$totalSessions", 1] }] },
                100,
              ],
            },
            1,
          ],
        },
        lowEngagementRate: {
          $round: [
            {
              $multiply: [
                { $divide: ["$lowEngagement", { $max: ["$totalSessions", 1] }] },
                100,
              ],
            },
            1,
          ],
        },
        rageClickSessions: "$rageClicks",
        totalClicks: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    data: { stats: stats[0] || {} },
  });
}

/**
 * GET /sessions/:id/heatmap
 * Returns click coordinates for heatmap
 */
async function getHeatmap(req, res) {
  const { id } = req.params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({
      success: false,
      error: "Invalid session ID",
    });
  }

  const session = await Session.findOne({
    _id: id,
    userId: req.userId, // ✅ keep security
    isDeleted: false,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: "Session not found",
    });
  }

  // 🔥 Extract click points
  const clicks = (session.events || [])
    .filter(e => e.type === "click")
    .map(e => ({
      x: e.xPct,
      y: e.yPct,
    }));

  return res.status(200).json({
    success: true,
    data: clicks,
  });
}
module.exports = { listSessions, getSession, getStats, getHeatmap };