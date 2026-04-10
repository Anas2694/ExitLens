/**
 * Pattern Detection Engine
 * Pure logic — no external dependencies, fully testable.
 * Analyzes a session's events and produces structured pattern flags.
 */

const THRESHOLDS = {
  BOUNCE_DURATION_MS: 5000,         // < 5s = bounce
  LOW_ENGAGEMENT_SCROLL: 25,         // < 25% scroll = low engagement
  LOW_ENGAGEMENT_DURATION_MS: 5000, // < 5s = low engagement
  RAGE_CLICK_WINDOW_MS: 2000,        // clicks within 2s window
  RAGE_CLICK_COUNT: 3,               // 3+ clicks in window = rage
  RAGE_CLICK_RADIUS_PX: 50,          // within 50px radius
};

/**
 * Detect all behavioral patterns in a session.
 * @param {Object} session - Mongoose session document (or plain object)
 * @returns {Object} patterns
 */
function detectPatterns(session) {
  const events = session.events || [];
  const duration = session.duration || 0;
  const maxScrollDepth = session.maxScrollDepth || 0;

  const clicks = events.filter((e) => e.type === "click");
  const scrollMilestones = events
    .filter((e) => e.type === "scroll_milestone")
    .map((e) => e.depth)
    .filter(Boolean);

  return {
    isBounce: detectBounce(duration, scrollMilestones),
    isLowEngagement: detectLowEngagement(duration, maxScrollDepth, clicks),
    hasRageClicks: detectRageClicks(clicks).hasRageClicks,
    rageClickCount: detectRageClicks(clicks).count,
    hasDeadClicks: detectDeadClicks(clicks).hasDeadClicks,
    deadClickCount: detectDeadClicks(clicks).count,
    scrollMilestones,
  };
}

/**
 * Bounce: session ended very quickly with minimal scroll.
 */
function detectBounce(duration, scrollMilestones) {
  const reachedMilestone = scrollMilestones.some((m) => m >= 25);
  return duration < THRESHOLDS.BOUNCE_DURATION_MS && !reachedMilestone;
}

/**
 * Low engagement: short session OR very little scroll.
 */
function detectLowEngagement(duration, maxScrollDepth, clicks) {
  const shortSession = duration < THRESHOLDS.LOW_ENGAGEMENT_DURATION_MS;
  const shallowScroll = maxScrollDepth < THRESHOLDS.LOW_ENGAGEMENT_SCROLL;
  const fewClicks = clicks.length < 2;
  return (shortSession && shallowScroll) || (shallowScroll && fewClicks);
}

/**
 * Rage clicks: 3+ clicks in the same area within 2 seconds.
 * Indicates frustration — element not responding.
 */
function detectRageClicks(clicks) {
  if (clicks.length < THRESHOLDS.RAGE_CLICK_COUNT) {
    return { hasRageClicks: false, count: 0 };
  }

  let rageGroups = 0;

  for (let i = 0; i < clicks.length; i++) {
    const window = [clicks[i]];

    for (let j = i + 1; j < clicks.length; j++) {
      const timeDiff = (clicks[j].ts || 0) - (clicks[i].ts || 0);
      if (timeDiff > THRESHOLDS.RAGE_CLICK_WINDOW_MS) break;

      const dx = (clicks[j].x || 0) - (clicks[i].x || 0);
      const dy = (clicks[j].y || 0) - (clicks[i].y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= THRESHOLDS.RAGE_CLICK_RADIUS_PX) {
        window.push(clicks[j]);
      }
    }

    if (window.length >= THRESHOLDS.RAGE_CLICK_COUNT) {
      rageGroups++;
      i += window.length - 1; // skip processed clicks
    }
  }

  return { hasRageClicks: rageGroups > 0, count: rageGroups };
}

/**
 * Dead clicks: clicks on non-interactive elements.
 * Indicates UX confusion — user thinks something is clickable.
 */
function detectDeadClicks(clicks) {
  const dead = clicks.filter(
    (c) => c.isInteractive === false
  );
  return {
    hasDeadClicks: dead.length >= 2, // 2+ dead clicks = pattern
    count: dead.length,
  };
}

/**
 * Generate human-readable structured insight from patterns.
 * Used as FALLBACK when AI is unavailable.
 */
function generateRuleBasedInsight(session) {
  const p = session.patterns || detectPatterns(session);
  const durationSec = Math.round((session.duration || 0) / 1000);
  const findings = [];

  if (p.isBounce) {
    findings.push({
      severity: "critical",
      title: "Immediate Bounce",
      description: `The user left within ${durationSec} seconds without scrolling past the first screen.`,
      recommendation:
        "Your above-the-fold content isn't compelling enough. Test a clearer headline or value proposition.",
    });
  }

  if (p.isLowEngagement && !p.isBounce) {
    findings.push({
      severity: "warning",
      title: "Low Engagement",
      description: `User spent ${durationSec}s on the page and only scrolled to ${session.maxScrollDepth}%.`,
      recommendation:
        "Consider breaking up content with visual anchors or interactive elements in the first 50% of the page.",
    });
  }

  if (p.hasRageClicks) {
    findings.push({
      severity: "critical",
      title: "Rage Clicks Detected",
      description: `User rapidly clicked ${p.rageClickCount} time(s) in the same area, indicating frustration.`,
      recommendation:
        "Inspect your page for broken CTAs, unresponsive buttons, or misleading visual cues.",
    });
  }

  if (p.hasDeadClicks) {
    findings.push({
      severity: "warning",
      title: "Dead Clicks",
      description: `User clicked on ${p.deadClickCount} non-interactive element(s).`,
      recommendation:
        "Review your layout for elements that look clickable but aren't (underlined text, colored boxes, images).",
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      title: "Normal Session",
      description: `User engaged for ${durationSec}s and scrolled to ${session.maxScrollDepth}% of the page.`,
      recommendation: "This session appears healthy. Look for patterns across multiple sessions.",
    });
  }

  const summary = findings
    .map((f) => `${f.title}: ${f.description}`)
    .join(" ");

  return { summary, findings, source: "rule_based" };
}

module.exports = { detectPatterns, generateRuleBasedInsight, THRESHOLDS };
