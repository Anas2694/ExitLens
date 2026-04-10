import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSession, useInsight } from "../hooks/useData";
import { Skeleton, ErrorState, SeverityBadge, PageHeader } from "../components/ui/index.jsx";
import { formatDuration, timeAgo } from "../utils/format";
import Heatmap from "../components/Heatmap";

export default function SessionDetailPage() {
  const { id } = useParams();

  const { session, loading, error } = useSession(id);
  const { insight, loading: insightLoading, generating, error: insightError, generate } = useInsight(id);

  // 🔥 HEATMAP STATE
  const [heatmap, setHeatmap] = useState([]);

  // 🔥 FETCH HEATMAP DATA
  useEffect(() => {
    if (!id) return;

    fetch(`http://localhost:4000/sessions/${id}/heatmap`, {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        console.log("🔥 Heatmap data:", data);
        if (data.success) {
          setHeatmap(data.data);
        }
      })
      .catch(err => console.error("Heatmap error:", err));
  }, [id]);

  if (loading) return (
    <div>
      <Skeleton height={40} width={300} radius={8} style={{ marginBottom: 24 }} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Skeleton height={300} style={{ flex: 1, minWidth: 280 }} radius={16} />
        <Skeleton height={300} style={{ flex: 1, minWidth: 280 }} radius={16} />
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} />;
  if (!session) return null;

  const p = session.patterns || {};

  return (
    <div>

      {/* 🔥 HEATMAP OVERLAY */}
      <Heatmap points={heatmap} />

      <PageHeader
        title="Session Detail"
        subtitle={`ID: ${session.sessionId}`}
        action={<Link to="/app/sessions" className="btn btn-ghost">← Back to Sessions</Link>}
      />

      <div style={s.grid}>

        {/* LEFT SIDE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Metrics */}
          <div className="card">
            <h3 style={s.cardTitle}>Session Metrics</h3>
            <div style={s.metricList}>
              <Metric label="Duration" value={formatDuration(session.duration)} />
              <Metric label="Scroll Depth" value={`${session.maxScrollDepth}%`} />
              <Metric label="Total Clicks" value={session.totalClicks ?? 0} />
              <Metric label="Exit Page" value={session.exitPage || "—"} mono />
              <Metric label="Recorded" value={timeAgo(session.createdAt)} />
              <Metric label="Screen" value={session.screenWidth ? `${session.screenWidth}×${session.screenHeight}` : "—"} />
            </div>
          </div>

          {/* Patterns */}
          <div className="card">
            <h3 style={s.cardTitle}>Detected Patterns</h3>
            <div style={s.patternGrid}>
              <PatternFlag label="Bounce" active={p.isBounce} severity="critical" />
              <PatternFlag label="Low Engagement" active={p.isLowEngagement} severity="warning" />
              <PatternFlag label="Rage Clicks" active={p.hasRageClicks} severity="critical" extra={p.rageClickCount > 0 ? `×${p.rageClickCount}` : null} />
              <PatternFlag label="Dead Clicks" active={p.hasDeadClicks} severity="warning" extra={p.deadClickCount > 0 ? `×${p.deadClickCount}` : null} />
            </div>
          </div>

        </div>

       {/* RIGHT SIDE (INSIGHTS UPGRADED) */}
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

  {/* 🧠 Session Diagnosis */}
  <div className="card">
    <h3 style={s.cardTitle}>🧠 Session Diagnosis</h3>

    {(() => {
      const { issues, positives } = getDiagnosis(session);
      return (
        <>
          {positives.map((p, i) => <p key={i}>✔ {p}</p>)}
          {issues.map((i, idx) => <p key={idx}>⚠ {i}</p>)}
        </>
      );
    })()}
  </div>

  {/* 📉 Funnel Analysis */}
  <div className="card">
    <h3 style={s.cardTitle}>📉 Funnel Analysis</h3>

    <p>Page Viewed: ✅</p>
    <p>Scrolled 50%: {session.maxScrollDepth >= 50 ? "✅" : "❌"}</p>
    <p>Scrolled 100%: {session.maxScrollDepth === 100 ? "✅" : "❌"}</p>
    <p>Clicks: {session.totalClicks > 0 ? "✅" : "❌"}</p>

    {session.totalClicks <= 2 && (
      <p style={{ color: "orange" }}>
        🚨 Drop-off: User didn’t interact with key elements
      </p>
    )}
  </div>

  {/* 🚀 Fix Suggestions */}
  <div className="card">
    <h3 style={s.cardTitle}>🚀 What to Fix</h3>

    {session.totalClicks <= 2 && (
      <p>👉 Add strong CTA above the fold</p>
    )}

    {session.maxScrollDepth === 100 && (
      <p>👉 Users reach end — CTA might be too late</p>
    )}

    {session.patterns?.isLowEngagement && (
      <p>👉 Improve content engagement (headings, visuals)</p>
    )}
  </div>

  {/* 🤖 AI Insight (existing but improved position) */}
  <div className="card">
    <h3 style={s.cardTitle}>🤖 AI Insight</h3>

    {insightLoading ? (
      <Skeleton height={80} />
    ) : insight ? (
      <InsightPanel insight={insight} />
    ) : (
      <button onClick={generate} className="btn btn-primary">
        Generate Insight
      </button>
    )}
  </div>

</div>

      </div>
    </div>
  );
}

/* ========================= */
/* COMPONENTS */
/* ========================= */
function getDiagnosis(session) {
  const issues = [];
  const positives = [];

  if (session.duration > 60000) positives.push("High engagement session");
  if (session.maxScrollDepth === 100) positives.push("User reached end of page");

  if (session.totalClicks <= 2) {
    issues.push("Low interaction — user didn’t click important elements");
  }

  if (!session.patterns?.isBounce && session.totalClicks <= 2) {
    issues.push("User consumed content but didn’t take action");
  }

  return { issues, positives };
}

function InsightPanel({ insight }) {
  return (
    <div>
      {/* Summary */}
      <p style={{ marginBottom: 12, fontSize: "0.95rem" }}>
        {insight.summary}
      </p>

      {/* Findings */}
      {insight.findings?.map((f, i) => (
        <div
          key={i}
          style={{
            marginTop: 12,
            padding: 12,
            borderLeft: `4px solid ${severityColor(f.severity)}`,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 6
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: 4 }}>
            {f.title}
          </div>

          <div style={{ fontSize: "0.85rem", color: "#aaa" }}>
            {f.description}
          </div>

          <div style={{ marginTop: 6, color: "#4da3ff" }}>
            💡 {f.recommendation}
          </div>
        </div>
      ))}

      {/* ✅ WHAT WORKED */}
      {insight.whatWorked?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>✅ What Worked</strong>
          {insight.whatWorked.map((w, i) => (
            <p key={i}>• {w}</p>
          ))}
        </div>
      )}

      {/* ✅ QUICK WINS */}
      {insight.quickWins?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>🚀 Quick Wins</strong>
          {insight.quickWins.map((w, i) => (
            <p key={i}>• {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PatternFlag({ label, active }) {
  return (
    <div>
      {label}: {active ? "YES" : "NO"}
    </div>
  );
}

function severityColor(s) {
  return {
    critical: "red",
    warning: "orange",
    info: "blue"
  }[s] || "blue";
}

const s = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 10
  },
  metricList: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  patternGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6
  }
};
