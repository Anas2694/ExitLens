import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useReplay, useSession, useInsight } from "../hooks/useData";
import { Skeleton, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { formatDuration, timeAgo } from "../utils/format";
import { sessionsApi } from "../services/api";
import Heatmap from "../components/Heatmap";

export default function SessionDetailPage() {
  const { id } = useParams();
  const { session, loading, error } = useSession(id);
  const { insight, loading: insightLoading, generating, error: insightError, generate } = useInsight(id);
  const { events: replayEvents, loading: replayLoading } = useReplay(id);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    sessionsApi.sessionHeatmap(id)
      .then((res) => { if (!cancelled) setHeatmap(res.data.data || []); })
      .catch(() => { if (!cancelled) setHeatmap([]); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div>
        <Skeleton height={40} width={300} radius={8} style={{ marginBottom: 24 }} />
        <div style={s.grid}>
          <Skeleton height={300} radius={16} />
          <Skeleton height={300} radius={16} />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!session) return null;

  const p = session.patterns || {};

  return (
    <div>
      <PageHeader
        title="Session Detail"
        subtitle={`ID: ${session.sessionId}`}
        action={<Link to="/app/sessions" className="btn btn-ghost">Back to Sessions</Link>}
      />

      <Heatmap points={heatmap} title="Session Click Heatmap" subtitle={session.pagePath || session.pageUrl || "/"} />

      <div style={s.grid}>
        <div style={s.stack}>
          <div className="card">
            <h3 style={s.cardTitle}>Session Metrics</h3>
            <div style={s.metricList}>
              <Metric label="Duration" value={formatDuration(session.duration)} />
              <Metric label="Scroll Depth" value={`${session.maxScrollDepth}%`} />
              <Metric label="Total Clicks" value={session.totalClicks ?? 0} />
              <Metric label="Conversions" value={session.conversions?.length || 0} />
              <Metric label="Device" value={session.deviceType || "unknown"} />
              <Metric label="Browser" value={session.browser || "-"} />
              <Metric label="Referrer" value={session.referrerDomain || "-"} />
              <Metric label="Exit Page" value={session.exitPage || "-"} />
              <Metric label="Recorded" value={timeAgo(session.createdAt)} />
              <Metric label="Screen" value={session.screenWidth ? `${session.screenWidth}x${session.screenHeight}` : "-"} />
            </div>
          </div>

          <div className="card">
            <h3 style={s.cardTitle}>Detected Patterns</h3>
            <div style={s.patternGrid}>
              <PatternFlag label="Bounce" active={p.isBounce} severity="critical" />
              <PatternFlag label="Low Engagement" active={p.isLowEngagement} severity="warning" />
              <PatternFlag label="Rage Clicks" active={p.hasRageClicks} severity="critical" extra={p.rageClickCount > 0 ? `x${p.rageClickCount}` : null} />
              <PatternFlag label="Dead Clicks" active={p.hasDeadClicks} severity="warning" extra={p.deadClickCount > 0 ? `x${p.deadClickCount}` : null} />
            </div>
          </div>

          <div className="card">
            <h3 style={s.cardTitle}>Conversion Events</h3>
            {session.conversions?.length ? (
              <div style={s.stackSmall}>
                {session.conversions.map((conversion, i) => (
                  <div key={i} style={s.conversion}>
                    <strong>{conversion.goalName}</strong>
                    <span>{conversion.goalType} - {conversion.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={s.muted}>No conversion goals matched this session.</p>
            )}
          </div>
        </div>

        <div style={s.stack}>
          <div className="card">
            <h3 style={s.cardTitle}>Replay Timeline</h3>
            {replayLoading ? (
              <Skeleton height={140} />
            ) : replayEvents.length ? (
              <div style={s.timeline}>
                {replayEvents.map((event, i) => (
                  <div key={`${event.ts}-${i}`} style={s.timelineItem}>
                    <span style={s.timelineTime}>{formatMs(event.atMs)}</span>
                    <div>
                      <strong style={s.timelineLabel}>{event.label}</strong>
                      <div style={s.timelineMeta}>{event.type}{event.depth ? ` - ${event.depth}%` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={s.muted}>No replay events recorded.</p>
            )}
          </div>

          <div className="card">
            <h3 style={s.cardTitle}>Session Diagnosis</h3>
            {getDiagnosis(session).positives.map((item, i) => <p key={`p-${i}`} style={s.good}>{item}</p>)}
            {getDiagnosis(session).issues.map((item, i) => <p key={`i-${i}`} style={s.warn}>{item}</p>)}
          </div>

          <div className="card">
            <h3 style={s.cardTitle}>AI Insight</h3>
            {insightLoading ? (
              <Skeleton height={80} />
            ) : insight ? (
              <InsightPanel insight={insight} />
            ) : (
              <button onClick={generate} className="btn btn-primary" disabled={generating}>
                {generating ? "Generating..." : "Generate Insight"}
              </button>
            )}
            {insightError && <p style={s.error}>{insightError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDiagnosis(session) {
  const issues = [];
  const positives = [];

  if (session.duration > 60000) positives.push("High engagement session");
  if (session.maxScrollDepth === 100) positives.push("User reached the end of the page");
  if ((session.conversions || []).length > 0) positives.push("Session matched at least one conversion goal");
  if (session.totalClicks <= 2) issues.push("Low interaction: user did not click many important elements");
  if (!session.patterns?.isBounce && session.totalClicks <= 2) issues.push("User consumed content but did not take action");
  if (session.patterns?.hasDeadClicks) issues.push("Dead clicks suggest visual elements look clickable but are not");
  if (session.patterns?.hasRageClicks) issues.push("Rage clicks suggest a broken or unclear interaction");

  return { issues, positives };
}

function InsightPanel({ insight }) {
  return (
    <div>
      <p style={s.summary}>{insight.summary}</p>
      {insight.findings?.map((finding, i) => (
        <div key={i} style={{ ...s.finding, borderLeftColor: severityColor(finding.severity) }}>
          <div style={s.findingTitle}>{finding.title}</div>
          <div style={s.findingDesc}>{finding.description}</div>
          <div style={s.recommendation}>{finding.recommendation}</div>
        </div>
      ))}
      {insight.whatWorked?.length > 0 && <List title="What Worked" items={insight.whatWorked} />}
      {insight.quickWins?.length > 0 && <List title="Quick Wins" items={insight.quickWins} />}
    </div>
  );
}

function List({ title, items }) {
  return (
    <div style={{ marginTop: 16 }}>
      <strong>{title}</strong>
      {items.map((item, i) => <p key={i} style={s.muted}>{item}</p>)}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={s.metric}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PatternFlag({ label, active, extra }) {
  return (
    <div style={s.pattern}>
      <span>{label}</span>
      <span className={`badge ${active ? "badge-warning" : "badge-success"}`}>{active ? extra || "yes" : "no"}</span>
    </div>
  );
}

function formatMs(ms) {
  const sec = Math.round((ms || 0) / 1000);
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return min ? `${min}m ${rest}s` : `${rest}s`;
}

function severityColor(severity) {
  return { critical: "var(--critical)", warning: "var(--warning)", info: "var(--info)" }[severity] || "var(--info)";
}

const s = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 },
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  stackSmall: { display: "flex", flexDirection: "column", gap: 8 },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 12 },
  metricList: { display: "flex", flexDirection: "column", gap: 6 },
  metric: { display: "flex", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: "1px solid var(--border)", color: "var(--text-soft)" },
  patternGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  pattern: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: "var(--radius)" },
  conversion: { display: "flex", justifyContent: "space-between", gap: 12, padding: 10, border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-soft)" },
  timeline: { display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflow: "auto" },
  timelineItem: { display: "grid", gridTemplateColumns: "64px 1fr", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" },
  timelineTime: { color: "var(--accent)", fontSize: "0.82rem", fontWeight: 700 },
  timelineLabel: { color: "var(--text-soft)", fontSize: "0.9rem" },
  timelineMeta: { color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 3 },
  summary: { marginBottom: 12, fontSize: "0.95rem", color: "var(--text-soft)", lineHeight: 1.6 },
  finding: { marginTop: 12, padding: 12, borderLeft: "4px solid var(--info)", background: "rgba(255,255,255,0.03)", borderRadius: 6 },
  findingTitle: { fontWeight: 700, marginBottom: 4 },
  findingDesc: { fontSize: "0.85rem", color: "var(--text-muted)" },
  recommendation: { marginTop: 6, color: "var(--accent)" },
  muted: { color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.5 },
  good: { color: "var(--success)", fontSize: "0.88rem" },
  warn: { color: "var(--warning)", fontSize: "0.88rem" },
  error: { color: "var(--critical)", fontSize: "0.85rem", marginTop: 10 },
};
