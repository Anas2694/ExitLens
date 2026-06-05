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
      Date: formatDateTime(s.createdAt),
      Page: s.pagePath || s.pageUrl || "/",
      Device: s.deviceType || "unknown",
      Duration: formatDuration(s.duration),
      Scroll: `${s.maxScrollDepth || 0}%`,
      Clicks: s.totalClicks || 0,
      Bounce: s.patterns?.isBounce ? "Yes" : "No",
      Conversions: (s.conversions || []).length,
    }));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=exitlens-sessions-report.pdf");
    return res.send(renderSimplePdf("ExitLens Sessions Export", rows));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=exitlens-sessions.csv");
  return res.send(toCsv([
    ["Date", "Page Path", "Full URL", "Device", "Referrer", "Duration", "Scroll Depth", "Clicks", "Bounce", "Rage Clicks", "Dead Clicks", "Conversions"],
    ...sessions.map((s) => [
      formatDateTime(s.createdAt),
      s.pagePath,
      s.pageUrl,
      titleCase(s.deviceType || "unknown"),
      s.referrerDomain || "-",
      formatDuration(s.duration),
      `${s.maxScrollDepth || 0}%`,
      s.totalClicks,
      s.patterns?.isBounce ? "Yes" : "No",
      s.patterns?.hasRageClicks ? "Yes" : "No",
      s.patterns?.hasDeadClicks ? "Yes" : "No",
      (s.conversions || []).length,
    ]),
  ], "ExitLens Sessions Export"));
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
      Date: formatDateTime(i.createdAt),
      Page: i.sessionId?.pagePath || i.sessionId?.pageUrl || "/",
      Score: i.overallScore,
      Source: titleCase(i.source),
      Summary: i.summary,
    }));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=exitlens-insights-report.pdf");
    return res.send(renderSimplePdf("ExitLens AI Insights Export", rows));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=exitlens-insights.csv");
  return res.send(toCsv([
    ["Date", "Page", "Score", "Source", "Summary", "Quick Wins"],
    ...insights.map((i) => [
      formatDateTime(i.createdAt),
      i.sessionId?.pagePath || i.sessionId?.pageUrl || "/",
      i.overallScore,
      titleCase(i.source),
      i.summary,
      (i.quickWins || []).join(" | "),
    ]),
  ], "ExitLens AI Insights Export"));
}

function applySessionFilters(filter, query) {
  const { from, to, projectId, pagePath, pageUrl, deviceType, referrerDomain, referrer, isBounce, minDuration, maxScrollDepth } = query;

  if (from || to) {
    filter.createdAt = filter.createdAt || {};
    if (from) filter.createdAt.$gte = parseDateInput(from, false);
    if (to) {
      const toDate = parseDateInput(to, true);
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

function toCsv(rows, title) {
  const generated = [
    [title],
    [`Generated ${formatDateTime(new Date())}`],
    [],
  ];
  return [...generated, ...rows].map((row) => row.map((value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\n");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSimplePdf(title, rows) {
  const body = rows.length ? rows : [{ Empty: "No data" }];
  const lines = [title, `Generated: ${formatDateTime(new Date())}`, `Records shown: ${Math.min(body.length, 35)} of ${body.length}`, ""];

  body.slice(0, 35).forEach((row, index) => {
    lines.push(`${index + 1}. ${row.Page || row.Summary || "Record"}`);
    Object.entries(row).forEach(([key, value]) => {
      if (key === "Page") return;
      wrapText(`${key}: ${value ?? ""}`, 96).forEach((line) => lines.push(`   ${line}`));
    });
    lines.push("");
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

function wrapText(value, width) {
  const words = String(value ?? "").split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function parseDateInput(value, endOfDay) {
  if (!value) return null;
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})$/);
  let date;

  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    date = new Date(year, month, day);
  } else {
    date = new Date(text);
  }

  if (Number.isNaN(date.getTime())) return endOfDay ? new Date(8640000000000000) : new Date(0);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDuration(ms = 0) {
  const totalSeconds = Math.round(Number(ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

module.exports = {
  listSessions,
  getSession,
  getStats,
  getHeatmap,
  getReplay,
  getAlerts,
  exportSessions,
  exportInsights,
};
