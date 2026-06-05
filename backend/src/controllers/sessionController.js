const Session = require("../models/Session");
const Insight = require("../models/Insight");

async function listSessions(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const filter = { userId: req.userId, isDeleted: false };
  applySessionFilters(filter, req.query);

  const skip = (Number(page) - 1) * Number(limit);
  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .select("-events")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Session.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      sessions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
}

async function getSession(req, res) {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  const session = await Session.findOne({
    _id: id,
    userId: req.userId,
    isDeleted: false,
  }).populate("insightId", "-__v").lean();

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  return res.status(200).json({ success: true, data: { session } });
}

async function getStats(req, res) {
  const matchFilter = { userId: req.userId, isDeleted: false };
  applySessionFilters(matchFilter, req.query);

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
        deadClicks: { $sum: { $cond: ["$patterns.hasDeadClicks", 1, 0] } },
        totalClicks: { $sum: "$totalClicks" },
        totalConversions: { $sum: { $size: { $ifNull: ["$conversions", []] } } },
      },
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        avgDurationMs: { $round: ["$avgDuration", 0] },
        avgScrollDepthPct: { $round: ["$avgScrollDepth", 1] },
        bounceRate: percent("$bounces", "$totalSessions"),
        lowEngagementRate: percent("$lowEngagement", "$totalSessions"),
        conversionRate: percent("$totalConversions", "$totalSessions"),
        rageClickSessions: "$rageClicks",
        deadClickSessions: "$deadClicks",
        totalConversions: 1,
        totalClicks: 1,
      },
    },
  ]);

  return res.status(200).json({ success: true, data: { stats: stats[0] || {} } });
}

async function getHeatmap(req, res) {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  const session = await Session.findOne({
    _id: id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const clicks = (session.events || [])
    .filter((e) => e.type === "click")
    .map((e) => ({ x: e.xPct, y: e.yPct, xPct: e.xPct, yPct: e.yPct, count: 1 }));

  return res.status(200).json({ success: true, data: clicks });
}

async function getPageHeatmap(req, res) {
  const filter = { userId: req.userId, isDeleted: false };
  applySessionFilters(filter, req.query);

  const rows = await Session.aggregate([
    { $match: filter },
    { $unwind: "$events" },
    { $match: { "events.type": "click", "events.xPct": { $ne: null }, "events.yPct": { $ne: null } } },
    {
      $group: {
        _id: {
          x: { $round: ["$events.xPct", 0] },
          y: { $round: ["$events.yPct", 0] },
          pagePath: "$pagePath",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 500 },
  ]);

  const points = rows.map((r) => ({
    x: r._id.x,
    y: r._id.y,
    xPct: r._id.x,
    yPct: r._id.y,
    pagePath: r._id.pagePath,
    count: r.count,
  }));

  return res.status(200).json({ success: true, data: { points } });
}

async function getReplay(req, res) {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, error: "Invalid session ID" });
  }

  const session = await Session.findOne({ _id: id, userId: req.userId, isDeleted: false }).lean();
  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const startedAt = session.events?.[0]?.ts || new Date(session.createdAt).getTime();
  const events = (session.events || []).map((event) => ({
    type: event.type,
    label: buildReplayLabel(event),
    atMs: Math.max(0, (event.ts || startedAt) - startedAt),
    ts: event.ts,
    element: event.element,
    xPct: event.xPct,
    yPct: event.yPct,
    depth: event.depth,
    isInteractive: event.isInteractive,
    exitPage: event.exitPage,
    customName: event.customName,
  }));

  return res.status(200).json({ success: true, data: { events } });
}

async function getAlerts(req, res) {
  const base = { userId: req.userId, isDeleted: false };
  applySessionFilters(base, req.query);

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 14);

  const [current, previous] = await Promise.all([
    summarizeWindow({ ...base, createdAt: { $gte: currentStart, $lte: now } }),
    summarizeWindow({ ...base, createdAt: { $gte: previousStart, $lt: currentStart } }),
  ]);

  const alerts = [];
  pushSpike(alerts, "Bounce rate spike", current.bounceRate, previous.bounceRate, 20, "%");
  pushSpike(alerts, "Rage clicks increased", current.rageClickSessions, previous.rageClickSessions, 3, " sessions");
  pushSpike(alerts, "Dead clicks increased", current.deadClickSessions, previous.deadClickSessions, 5, " sessions");

  return res.status(200).json({ success: true, data: { alerts, current, previous } });
}

async function exportSessions(req, res) {
  const format = req.query.format === "pdf" ? "pdf" : "csv";
  const filter = { userId: req.userId, isDeleted: false };
  applySessionFilters(filter, req.query);

  const sessions = await Session.find(filter).select("-events").sort({ createdAt: -1 }).limit(1000).lean();

  if (format === "pdf") {
    const rows = sessions.map((s) => ({
      Date: new Date(s.createdAt).toLocaleString(),
      Page: s.pagePath || s.pageUrl || "/",
      Device: s.deviceType || "unknown",
      Duration: s.duration || 0,
      Scroll: `${s.maxScrollDepth || 0}%`,
      Clicks: s.totalClicks || 0,
      Bounce: s.patterns?.isBounce ? "Yes" : "No",
    }));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=exitlens-sessions-report.pdf");
    return res.send(renderSimplePdf("ExitLens Sessions Export", rows));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=exitlens-sessions.csv");
  return res.send(toCsv([
    ["createdAt", "pagePath", "pageUrl", "deviceType", "referrerDomain", "durationMs", "scrollDepth", "clicks", "bounce", "rageClicks", "deadClicks", "conversions"],
    ...sessions.map((s) => [
      s.createdAt,
      s.pagePath,
      s.pageUrl,
      s.deviceType,
      s.referrerDomain,
      s.duration,
      s.maxScrollDepth,
      s.totalClicks,
      !!s.patterns?.isBounce,
      !!s.patterns?.hasRageClicks,
      !!s.patterns?.hasDeadClicks,
      (s.conversions || []).length,
    ]),
  ]));
}

async function exportInsights(req, res) {
  const format = req.query.format === "pdf" ? "pdf" : "csv";
  const insights = await Insight.find({ userId: req.userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("sessionId", "pagePath pageUrl duration maxScrollDepth")
    .lean();

  if (format === "pdf") {
    const rows = insights.map((i) => ({
      Date: new Date(i.createdAt).toLocaleString(),
      Page: i.sessionId?.pagePath || i.sessionId?.pageUrl || "/",
      Score: i.overallScore,
      Source: i.source,
      Summary: i.summary,
    }));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=exitlens-insights-report.pdf");
    return res.send(renderSimplePdf("ExitLens AI Insights Export", rows));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=exitlens-insights.csv");
  return res.send(toCsv([
    ["createdAt", "page", "overallScore", "source", "summary", "quickWins"],
    ...insights.map((i) => [
      i.createdAt,
      i.sessionId?.pagePath || i.sessionId?.pageUrl || "/",
      i.overallScore,
      i.source,
      i.summary,
      (i.quickWins || []).join(" | "),
    ]),
  ]));
}

function applySessionFilters(filter, query) {
  const { from, to, projectId, pagePath, pageUrl, deviceType, referrerDomain, referrer, isBounce, minDuration, maxScrollDepth } = query;

  if (from || to) {
    filter.createdAt = filter.createdAt || {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  if (projectId) filter.projectId = projectId;
  if (pagePath) filter.pagePath = pagePath;
  if (pageUrl) filter.pageUrl = { $regex: escapeRegex(pageUrl), $options: "i" };
  if (deviceType) filter.deviceType = deviceType;
  if (referrerDomain) filter.referrerDomain = { $regex: escapeRegex(referrerDomain), $options: "i" };
  if (referrer) filter.referrer = { $regex: escapeRegex(referrer), $options: "i" };
  if (typeof isBounce !== "undefined") filter["patterns.isBounce"] = isBounce === "true" || isBounce === true;
  if (minDuration) filter.duration = { ...(filter.duration || {}), $gte: Number(minDuration) };
  if (maxScrollDepth) filter.maxScrollDepth = { ...(filter.maxScrollDepth || {}), $lte: Number(maxScrollDepth) };
}

function percent(numerator, denominator) {
  return {
    $round: [
      { $multiply: [{ $divide: [numerator, { $max: [denominator, 1] }] }, 100] },
      1,
    ],
  };
}

async function summarizeWindow(match) {
  const rows = await Session.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        bounces: { $sum: { $cond: ["$patterns.isBounce", 1, 0] } },
        rageClickSessions: { $sum: { $cond: ["$patterns.hasRageClicks", 1, 0] } },
        deadClickSessions: { $sum: { $cond: ["$patterns.hasDeadClicks", 1, 0] } },
      },
    },
  ]);
  const row = rows[0] || {};
  const total = row.totalSessions || 0;
  return {
    totalSessions: total,
    bounceRate: total ? Math.round((row.bounces / total) * 1000) / 10 : 0,
    rageClickSessions: row.rageClickSessions || 0,
    deadClickSessions: row.deadClickSessions || 0,
  };
}

function pushSpike(alerts, title, current, previous, threshold, suffix) {
  const diff = current - previous;
  if (diff >= threshold) {
    alerts.push({
      severity: diff >= threshold * 2 ? "critical" : "warning",
      title,
      message: `${title}: ${current}${suffix} vs ${previous}${suffix} in the previous period.`,
      current,
      previous,
      change: diff,
    });
  }
}

function buildReplayLabel(event) {
  if (event.type === "click") return event.isInteractive ? `Clicked ${event.element || "element"}` : `Dead click on ${event.element || "element"}`;
  if (event.type === "scroll_milestone") return `Scrolled to ${event.depth}%`;
  if (event.type === "exit" || event.type === "page_hidden") return `Exited from ${event.exitPage || "page"}`;
  if (event.type === "custom_event") return `Custom event: ${event.customName || "unnamed"}`;
  return "Page viewed";
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\n");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSimplePdf(title, rows) {
  const body = rows.length ? rows : [{ Empty: "No data" }];
  const lines = [title, `Generated: ${new Date().toLocaleString()}`, ""];

  body.slice(0, 80).forEach((row, index) => {
    lines.push(`${index + 1}. ${Object.entries(row).map(([key, value]) => `${key}: ${value ?? ""}`).join(" | ")}`.slice(0, 150));
  });

  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "/F1 18 Tf" : "/F1 9 Tf",
      `(${pdfEscape(line)}) Tj`,
      "0 -16 Td",
    ]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function pdfEscape(value) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "?");
}

module.exports = {
  listSessions,
  getSession,
  getStats,
  getHeatmap,
  getPageHeatmap,
  getReplay,
  getAlerts,
  exportSessions,
  exportInsights,
};
