const Session = require("../models/Session");
const User = require("../models/User"); // 🔥 ADD THIS
const { detectPatterns } = require("../services/patternEngine");
const logger = require("../utils/logger");

/**
 * POST /track
 */
async function track(req, res) {
  try {
    // ── API Key ─────────────────────────────
   // ✅ Already authenticated in middleware
const userId = req.userId;
const projectId = req.projectId;

    const {
      sessionId,
      pageUrl,
      referrer,
      userAgent,
      screenWidth,
      screenHeight,
      duration,
      maxScrollDepth,
      events,
      isFinal,
    } = req.body;

    // ── UPSERT SESSION ─────────────────────
    let session = await Session.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          userId: req.userId,
projectId: req.projectId,
          pageUrl,
          referrer,
          userAgent,
          screenWidth,
          screenHeight,
          events: [],
        },
      },
      {
        new: true,
        upsert: true,
        lean: false,
      }
    );

    // ── Merge Events ───────────────────────
    const remaining = 200 - (session.events || []).length;

    if (remaining > 0 && events?.length) {
      const mapped = events.slice(0, remaining).map((e) => ({
        type: mapEventType(e.type),
        ts: e.ts,
        element: e.element,
        x: e.x,
        y: e.y,
        xPct: e.xPct,
        yPct: e.yPct,
        scrollY: e.scrollY,
        depth: e.depth,
        url: e.url,
        isInteractive: e.isInteractive,
        duration: e.duration,
        exitPage: e.exitPage,
      }));

      session.events.push(...mapped);
    }

    // ── Metrics ────────────────────────────
    session.duration = Math.max(session.duration || 0, duration || 0);
    session.maxScrollDepth = Math.max(session.maxScrollDepth || 0, maxScrollDepth || 0);
    session.totalClicks = (session.events || []).filter(e => e.type === "click").length;

    // ── Exit Page ──────────────────────────
    const exitEvent = [...(events || [])].reverse().find(
      (e) => e.type === "exit" || e.type === "page_hidden"
    );

    if (exitEvent?.exitPage) {
      session.exitPage = exitEvent.exitPage;
    }

    // ── Pattern Detection ──────────────────
    if (isFinal) {
      session.patterns = detectPatterns(session);
      session.isAnalyzed = true;
    }

    await session.save();

    return res.status(200).json({ success: true });

  } catch (err) {
    logger.error("Track error", {
      error: err.message,
      sessionId: req.body?.sessionId,
    });

    return res.status(200).json({ success: false });
  }
}

// ── Event Type Mapping ───────────────────
function mapEventType(type) {
  const map = {
    page_view: "page_view",
    click: "click",
    scroll_milestone: "scroll_milestone",
    page_hidden: "page_hidden",
    exit: "exit",
  };

  if (type && type.startsWith("custom_")) return "custom_event";

  return map[type] || "page_view";
}

module.exports = { track };