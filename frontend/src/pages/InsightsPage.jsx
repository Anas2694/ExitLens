import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useInsights } from "../hooks/useData";
import { Skeleton, EmptyState, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { timeAgo } from "../utils/format";

const SEVERITY_CONFIG = {
  critical: { color: "var(--critical)", bg: "rgba(255,92,92,0.08)", border: "rgba(255,92,92,0.25)", icon: "🔴" },
  warning:  { color: "var(--warning)",  bg: "rgba(255,179,71,0.08)", border: "rgba(255,179,71,0.25)", icon: "🟡" },
  info:     { color: "var(--info)",     bg: "rgba(79,195,247,0.08)", border: "rgba(79,195,247,0.25)", icon: "🔵" },
};

export default function InsightsPage() {
  const { insights, pagination, loading, error } = useInsights({ limit: 20 });
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="AI-powered analysis of why users leave — and what to fix"
      />

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={180} radius={16} />)}
        </div>
      ) : insights.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="◎"
            title="No insights yet"
            message="Open any session and click 'Generate Insight' to get your first AI-powered analysis."
            action={<Link to="/app/sessions" className="btn btn-primary">Browse Sessions →</Link>}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {insights.map((insight) => (
            <InsightCard
              key={insight._id}
              insight={insight}
              isExpanded={expanded === insight._id}
              onToggle={() => setExpanded(expanded === insight._id ? null : insight._id)}
            />
          ))}
          {pagination?.pages > 1 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
              Showing {insights.length} of {pagination.total} insights
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, isExpanded, onToggle }) {
  const sessionId = insight.sessionId?._id || insight.sessionId;
  const score = insight.overallScore || 5;
  const scoreColor = score >= 7 ? "var(--success)" : score >= 4 ? "var(--warning)" : "var(--critical)";
  const criticalCount = insight.findings?.filter(f => f.severity === "critical").length || 0;
  const warningCount = insight.findings?.filter(f => f.severity === "warning").length || 0;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>

      {/* Header — always visible */}
      <div style={s.cardHeader} onClick={onToggle}>
        <div style={s.headerLeft}>

          {/* Score Circle */}
          <div style={{ ...s.scoreCircle, borderColor: scoreColor, color: scoreColor }}>
            <span style={s.scoreNum}>{score}</span>
            <span style={s.scoreDen}>/10</span>
          </div>

          {/* Summary */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={s.sourceTag(insight.source)}>
                {insight.source === "ai" ? "✦ Gemini AI" : "⚙ Rule-based"}
              </span>
              {criticalCount > 0 && (
                <span className="badge badge-critical">🔴 {criticalCount} critical</span>
              )}
              {warningCount > 0 && (
                <span className="badge badge-warning">🟡 {warningCount} warning</span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                {timeAgo(insight.createdAt)}
              </span>
            </div>
            <p style={s.summary}>{insight.summary}</p>
            {insight.sessionId?.pageUrl && (
              <p style={s.pageUrl}>
                📄 {safePathname(insight.sessionId.pageUrl)}
              </p>
            )}
          </div>
        </div>

        <div style={s.expandBtn}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={s.expandedBody}>

          {/* Quick Wins — top of mind */}
          {insight.quickWins?.length > 0 && (
            <div style={s.section}>
              <h4 style={s.sectionTitle}>⚡ Quick Wins — Do These First</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insight.quickWins.map((win, i) => (
                  <div key={i} style={s.quickWin}>
                    <span style={s.quickWinNum}>{i + 1}</span>
                    <span style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>{win}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {insight.findings?.length > 0 && (
            <div style={s.section}>
              <h4 style={s.sectionTitle}>🔍 Detailed Findings</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {insight.findings.map((f, i) => {
                  const cfg = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
                  return (
                    <div key={i} style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderLeft: `3px solid ${cfg.color}`,
                      borderRadius: "var(--radius)",
                      padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span>{cfg.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>
                          {f.title}
                        </span>
                        {f.impact && (
                          <span style={{
                            marginLeft: "auto",
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: 100,
                            background: f.impact === "High" ? "rgba(255,92,92,0.15)" : "rgba(255,179,71,0.15)",
                            color: f.impact === "High" ? "var(--critical)" : "var(--warning)",
                            fontWeight: 600,
                          }}>
                            {f.impact} Impact
                          </span>
                        )}
                      </div>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.83rem", marginBottom: 10, lineHeight: 1.6 }}>
                        {f.description}
                      </p>
                      <div style={s.recommendation}>
                        <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.78rem" }}>
                          → FIX:
                        </span>
                        <span style={{ color: "var(--text-soft)", fontSize: "0.83rem" }}>
                          {f.recommendation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* What Worked */}
          {insight.whatWorked?.length > 0 && (
            <div style={s.section}>
              <h4 style={s.sectionTitle}>✅ What's Working</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {insight.whatWorked.map((item, i) => (
                  <div key={i} style={s.whatWorked}>
                    <span style={{ color: "var(--success)", marginRight: 8 }}>✓</span>
                    <span style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div style={s.cardFooter}>
            <Link
              to={`/app/sessions/${sessionId}`}
              className="btn btn-ghost"
              style={{ fontSize: "0.82rem" }}
            >
              View Full Session →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function safePathname(url) {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

const s = {
  cardHeader: {
    display: "flex", alignItems: "flex-start",
    justifyContent: "space-between", gap: 16,
    padding: "20px 24px", cursor: "pointer",
    transition: "background 0.15s",
  },
  headerLeft: { display: "flex", gap: 16, flex: 1, minWidth: 0 },
  scoreCircle: {
    width: 52, height: 52, borderRadius: "50%",
    border: "2px solid",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  scoreNum: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1 },
  scoreDen: { fontSize: "0.6rem", color: "var(--text-muted)", lineHeight: 1 },
  sourceTag: (source) => ({
    fontSize: "0.7rem",
    color: source === "ai" ? "var(--accent)" : "var(--text-muted)",
    background: source === "ai" ? "var(--accent-glow)" : "var(--bg)",
    border: `1px solid ${source === "ai" ? "rgba(91,127,255,0.3)" : "var(--border)"}`,
    padding: "2px 8px", borderRadius: 100,
    fontWeight: 600,
  }),
  summary: {
    color: "var(--text-soft)", fontSize: "0.9rem",
    lineHeight: 1.65, marginBottom: 4,
  },
  pageUrl: {
    fontSize: "0.75rem", color: "var(--text-muted)",
    fontFamily: "monospace", marginTop: 4,
  },
  expandBtn: {
    color: "var(--text-muted)", fontSize: "0.75rem",
    flexShrink: 0, paddingTop: 4,
  },
  expandedBody: {
    borderTop: "1px solid var(--border)",
    padding: "0 24px 24px",
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "0.85rem", color: "var(--text)",
    marginBottom: 12, fontWeight: 700,
  },
  quickWin: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "10px 14px",
    background: "rgba(91,127,255,0.06)",
    border: "1px solid rgba(91,127,255,0.15)",
    borderRadius: "var(--radius)",
  },
  quickWinNum: {
    width: 22, height: 22, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
  },
  recommendation: {
    display: "flex", gap: 8, alignItems: "flex-start",
    background: "rgba(91,127,255,0.06)",
    borderRadius: 6, padding: "8px 10px",
  },
  whatWorked: {
    display: "flex", alignItems: "flex-start",
    padding: "8px 12px",
    background: "rgba(74,222,128,0.05)",
    border: "1px solid rgba(74,222,128,0.15)",
    borderRadius: "var(--radius)",
  },
  cardFooter: {
    marginTop: 20, paddingTop: 16,
    borderTop: "1px solid var(--border)",
    display: "flex", justifyContent: "flex-end",
  },
};