const config = require("../utils/config");
const logger = require("../utils/logger");
const { generateRuleBasedInsight } = require("./patternEngine");

const SYSTEM_PROMPT = `You are a senior CRO (Conversion Rate Optimization) expert who analyzes landing page user behavior.

You will receive session data and must provide a structured analysis with THREE sections:
1. What went WRONG (problems causing drop-off)
2. What went RIGHT (positive behaviors worth noting)  
3. Top 3 SPECIFIC actions the page owner should take

STRICT RULES:
1. Only use the provided data. Never invent metrics.
2. Always explain WHY the behavior happened, not just what happened.
3. Give SPECIFIC, ACTIONABLE recommendations with exact placement details.
4. If a session is healthy (long duration + deep scroll + many clicks), say so clearly and give optimization tips instead.
5. Severity: "critical" = causing drop-off NOW, "warning" = reducing conversions, "info" = optimization opportunity.
6. Never use vague advice like "improve UX" or "make it better".

OUTPUT ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence plain English explanation of this session",
  "overallScore": <number 1-10 rating session quality>,
  "findings": [
    {
      "severity": "critical|warning|info",
      "title": "Short issue name under 8 words",
      "description": "What happened with specific numbers from the data",
      "recommendation": "Exact fix with placement (e.g. Move CTA above 400px from top)",
      "impact": "High|Medium|Low"
    }
  ],
  "whatWorked": ["positive thing 1", "positive thing 2"],
  "quickWins": ["specific action 1", "specific action 2", "specific action 3"]
}`;

function buildUserPrompt(session) {
  const p = session.patterns || {};
  const durationSec = Math.round((session.duration || 0) / 1000);
  const durationMin = (durationSec / 60).toFixed(1);
  const scrollDepth = session.maxScrollDepth || 0;
  const clicks = session.totalClicks || 0;

  // Classify session quality to help AI context
  let sessionQuality = "poor";
  if (durationSec > 60 && scrollDepth > 50 && clicks > 2) sessionQuality = "good";
  else if (durationSec > 30 && scrollDepth > 25) sessionQuality = "average";

  return `Analyze this landing page session:

SESSION OVERVIEW:
- Quality classification: ${sessionQuality.toUpperCase()}
- Duration: ${durationSec} seconds (${durationMin} minutes)
- Max scroll depth: ${scrollDepth}% of page
- Total clicks: ${clicks}
- Exit page path: ${session.exitPage || "unknown"}
- Page URL: ${session.pageUrl || "unknown"}
- Screen size: ${session.screenWidth || "unknown"}x${session.screenHeight || "unknown"}

BEHAVIORAL PATTERNS DETECTED:
- Immediate bounce (left < 5s): ${p.isBounce ? "YES - CRITICAL" : "NO"}
- Low engagement detected: ${p.isLowEngagement ? "YES" : "NO"}
- Rage clicks (repeated frustrated clicking): ${p.hasRageClicks ? `YES - ${p.rageClickCount} rage click group(s) detected` : "NO"}
- Dead clicks (clicked non-interactive elements): ${p.hasDeadClicks ? `YES - ${p.deadClickCount} dead click(s)` : "NO"}
- Scroll milestones reached: ${(p.scrollMilestones || []).length > 0 ? (p.scrollMilestones || []).map(m => m + "%").join(", ") : "none - user barely scrolled"}

CONTEXT FOR ANALYSIS:
${p.isBounce ? "- User left almost immediately - something in the first screen caused instant rejection" : ""}
${scrollDepth === 100 && durationSec > 30 ? "- User read the ENTIRE page - this is a highly engaged session" : ""}
${scrollDepth < 25 && !p.isBounce ? "- User stayed but barely scrolled - content below fold is not pulling them in" : ""}
${p.hasRageClicks ? "- Rage clicking indicates a broken or unresponsive element is actively frustrating users" : ""}
${clicks === 0 ? "- Zero clicks recorded - user had no interaction with any elements" : ""}
${clicks > 10 ? "- High click count suggests strong interest and engagement with page content" : ""}
${clicks <= 2 && scrollDepth >= 80 ? "- User read most of the page but barely clicked — likely CTA visibility or clarity issue" : ""}
${clicks > 0 && scrollDepth > 50 ? "- User showed interest but did not convert — friction in decision stage" : ""}

Provide your full analysis JSON. Be specific about what page changes would fix each issue.`;
}

async function callGemini(prompt) {
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.ai.geminiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();

  // Handle Gemini safety blocks
  if (data?.candidates?.[0]?.finishReason === "SAFETY") {
    throw new Error("Gemini safety filter triggered");
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");

  // Strip markdown code fences if present
  const clean = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed = JSON.parse(clean);
  return { ...parsed, model: "gemini-1.5-flash", source: "ai" };
}

function validateAiOutput(output) {
  if (!output || typeof output !== "object") return false;
  if (!output.summary || typeof output.summary !== "string") return false;
  if (!Array.isArray(output.findings)) return false;
  const validSeverities = ["info", "warning", "critical"];
  return output.findings.every(
    (f) => f.title && f.description && f.recommendation && validSeverities.includes(f.severity)
  );
}

async function generateInsight(session) {
  if (config.isTest) return generateRuleBasedInsight(session);

  const prompt = buildUserPrompt(session);

  try {
    let result;

    if (config.ai.geminiKey) {
      result = await callGemini(prompt);
    } else {
      logger.warn("No AI API key configured, using rule-based fallback");
      return generateRuleBasedInsight(session);
    }

    if (!validateAiOutput(result)) {
      logger.warn("AI output failed validation, using rule-based fallback");
      return generateRuleBasedInsight(session);
    }

    result.summary = String(result.summary).slice(0, 1000);
    result.findings = (result.findings || []).slice(0, 6).map((f) => ({
      severity: f.severity,
      title: String(f.title).slice(0, 100),
      description: String(f.description).slice(0, 500),
      recommendation: String(f.recommendation).slice(0, 500),
      impact: f.impact || "Medium",
    }));
    result.whatWorked = (result.whatWorked || []).slice(0, 4).map(String);
    result.quickWins = (result.quickWins || []).slice(0, 3).map(String);
    result.overallScore = Math.min(10, Math.max(1, Number(result.overallScore) || 5));

    return result;
  } catch (err) {
    logger.warn("AI insight generation failed, using rule-based fallback", {
      error: err.message,
    });
    return generateRuleBasedInsight(session);
  }
}

module.exports = { generateInsight };
