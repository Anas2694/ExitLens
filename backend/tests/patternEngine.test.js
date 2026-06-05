const { detectPatterns, generateRuleBasedInsight } = require("../src/services/patternEngine");

describe("patternEngine", () => {
  test("detects bounce and low engagement for short shallow sessions", () => {
    const patterns = detectPatterns({
      duration: 2500,
      maxScrollDepth: 0,
      events: [{ type: "page_view", ts: 1000 }],
    });

    expect(patterns.isBounce).toBe(true);
    expect(patterns.isLowEngagement).toBe(true);
  });

  test("detects rage clicks in the same area within the threshold window", () => {
    const patterns = detectPatterns({
      duration: 15000,
      maxScrollDepth: 40,
      events: [
        { type: "click", ts: 1000, x: 100, y: 100, isInteractive: true },
        { type: "click", ts: 1500, x: 112, y: 104, isInteractive: true },
        { type: "click", ts: 1900, x: 90, y: 96, isInteractive: true },
      ],
    });

    expect(patterns.hasRageClicks).toBe(true);
    expect(patterns.rageClickCount).toBe(1);
  });

  test("detects repeated dead clicks", () => {
    const patterns = detectPatterns({
      duration: 20000,
      maxScrollDepth: 60,
      events: [
        { type: "click", ts: 1000, x: 100, y: 100, isInteractive: false },
        { type: "click", ts: 3000, x: 240, y: 120, isInteractive: false },
      ],
    });

    expect(patterns.hasDeadClicks).toBe(true);
    expect(patterns.deadClickCount).toBe(2);
  });

  test("generates fallback insight when no AI is available", () => {
    const insight = generateRuleBasedInsight({
      duration: 1000,
      maxScrollDepth: 0,
      totalClicks: 0,
      events: [],
    });

    expect(insight.source).toBe("rule_based");
    expect(insight.findings.length).toBeGreaterThan(0);
  });
});
