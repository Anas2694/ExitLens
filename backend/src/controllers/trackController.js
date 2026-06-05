const crypto = require("crypto");
const Session = require("../models/Session");
const { detectPatterns } = require("../services/patternEngine");
const logger = require("../utils/logger");

async function track(req, res) {
  try {
    const {
      sessionId,
      pageUrl,
      referrer,
      userAgent,
      screenWidth,
      screenHeight,
      viewportWidth,
      viewportHeight,
      language,
      duration,
      maxScrollDepth,
      events = [],
      isFinal,
    } = req.body;

    const pagePath = getPath(pageUrl);
    const referrerDomain = getHostname(referrer);
    const device = parseDevice(userAgent, screenWidth || viewportWidth);
    const remainingFilter = {
      sessionId,
      userId: req.userId,
      projectId: req.projectId || null,
    };

    const session = await Session.findOneAndUpdate(
      remainingFilter,
      {
        $setOnInsert: {
          sessionId,
          userId: req.userId,
          projectId: req.projectId,
          pageUrl,
          pagePath,
          referrer,
          referrerDomain,
          userAgent,
          screenWidth,
          screenHeight,
          viewportWidth,
          viewportHeight,
          language,
          deviceType: device.deviceType,
          browser: device.browser,
          os: device.os,
          ipHash: buildIpHash(req, req.project),
          events: [],
        },
      },
      { new: true, upsert: true, lean: false }
    );

    const remaining = 200 - (session.events || []).length;
    const mapped = remaining > 0
      ? events.slice(0, remaining).map(mapEvent).filter(Boolean)
      : [];

    if (mapped.length) {
      session.events.push(...mapped);
    }

    session.duration = Math.max(session.duration || 0, duration || 0);
    session.maxScrollDepth = Math.max(session.maxScrollDepth || 0, maxScrollDepth || 0);
    session.totalClicks = (session.events || []).filter((e) => e.type === "click").length;

    const exitEvent = [...events].reverse().find(
      (e) => e.type === "exit" || e.type === "page_hidden"
    );

    if (exitEvent?.exitPage) {
      session.exitPage = exitEvent.exitPage;
    }

    if (req.project?.conversionGoals?.length) {
      session.conversions = mergeConversions(
        session.conversions || [],
        req.project.conversionGoals,
        mapped
      );
    }

    if (isFinal) {
      session.patterns = detectPatterns(session);
      session.isAnalyzed = true;
    }

    await session.save();
    await pruneExpiredSessions(req.userId, req.projectId, req.project?.privacy?.retentionDays);
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error("Track error", {
      error: err.message,
      sessionId: req.body?.sessionId,
      projectId: req.projectId?.toString(),
    });

    return res.status(200).json({ success: false });
  }
}

function mapEvent(e) {
  if (!e || typeof e !== "object") return null;
  return {
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
    customName: e.customName,
    properties: e.properties,
  };
}

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

function mergeConversions(existing, goals, events) {
  const seen = new Set(existing.map((c) => `${c.goalName}:${c.value}:${c.ts}`));
  const next = [...existing];

  for (const goal of goals) {
    for (const event of events) {
      if (matchesGoal(goal, event)) {
        const ts = event.ts || Date.now();
        const key = `${goal.name}:${goal.value}:${ts}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push({
            goalName: goal.name,
            goalType: goal.type,
            value: goal.value,
            ts,
            converted: true,
          });
        }
      }
    }
  }

  return next.slice(0, 50);
}

function matchesGoal(goal, event) {
  if (goal.type === "click") {
    return event.type === "click" && String(event.element || "").includes(goal.value);
  }
  if (goal.type === "page_visit") {
    const path = getPath(event.url);
    return event.type === "page_view" && (path === goal.value || String(event.url || "").includes(goal.value));
  }
  if (goal.type === "custom_event") {
    return event.type === "custom_event" && event.customName === goal.value;
  }
  return false;
}

function getPath(value) {
  if (!value) return "/";
  try {
    return new URL(value).pathname || "/";
  } catch {
    return String(value).slice(0, 300);
  }
}

function getHostname(value) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseDevice(userAgent = "", width = 0) {
  const ua = String(userAgent);
  const lower = ua.toLowerCase();
  const deviceType = /ipad|tablet/.test(lower)
    ? "tablet"
    : /mobi|android|iphone/.test(lower) || Number(width) < 768
      ? "mobile"
      : Number(width) >= 768
        ? "desktop"
        : "unknown";
  const browser = lower.includes("edg/")
    ? "Edge"
    : lower.includes("chrome/")
      ? "Chrome"
      : lower.includes("safari/")
        ? "Safari"
        : lower.includes("firefox/")
          ? "Firefox"
          : "Other";
  const os = lower.includes("windows")
    ? "Windows"
    : lower.includes("mac os")
      ? "macOS"
      : lower.includes("android")
        ? "Android"
        : lower.includes("iphone") || lower.includes("ipad")
          ? "iOS"
          : "Other";

  return { deviceType, browser, os };
}

function buildIpHash(req, project) {
  if (!project?.privacy?.anonymizeIp) return "";
  return crypto
    .createHash("sha256")
    .update(`${req.ip || ""}:${project._id}`)
    .digest("hex");
}

async function pruneExpiredSessions(userId, projectId, retentionDays = 90) {
  const days = Math.max(7, Math.min(365, Number(retentionDays) || 90));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  await Session.deleteMany({
    userId,
    projectId,
    createdAt: { $lt: cutoff },
  });
}

module.exports = { track };
