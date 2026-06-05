import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAlerts, usePageHeatmap, useStats, useSessions } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { StatCard, Skeleton, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { formatDuration } from "../utils/format";
import { sessionsApi } from "../services/api";
import Heatmap from "../components/Heatmap";

export default function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ from: "", to: "", pageUrl: "", deviceType: "" });
  const activeFilters = cleanFilters(filters);
  const { stats, loading: statsLoading, error: statsError } = useStats(activeFilters);
  const { sessions, loading: sessionsLoading } = useSessions({ ...activeFilters, limit: 5 });
  const { points, loading: heatmapLoading } = usePageHeatmap(activeFilters);
  const { alerts, loading: alertsLoading } = useAlerts(activeFilters);

  const barData = stats ? [
    { name: "Bounced", value: stats.bounceRate || 0, color: "var(--critical)" },
    { name: "Low Engage", value: stats.lowEngagementRate || 0, color: "var(--warning)" },
    { name: "Avg Scroll %", value: stats.avgScrollDepthPct || 0, color: "var(--info)" },
  ] : [];

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle="Landing page behavior, alerts, heatmaps, and exports"
        action={
          <div style={s.actions}>
            <a className="btn btn-ghost" href={sessionsApi.exportUrl({ ...activeFilters, format: "csv" })}>Sessions CSV</a>
            <a className="btn btn-ghost" href={sessionsApi.exportUrl({ ...activeFilters, format: "pdf" })}>Sessions PDF</a>
            <a className="btn btn-ghost" href={sessionsApi.exportInsightsUrl({ format: "csv" })}>Insights CSV</a>
          </div>
        }
      />

      <div style={s.filterBar}>
        <input className="form-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="form-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <input className="form-input" placeholder="Filter page URL" value={filters.pageUrl} onChange={(e) => setFilters({ ...filters, pageUrl: e.target.value })} />
        <select className="form-input" value={filters.deviceType} onChange={(e) => setFilters({ ...filters, deviceType: e.target.value })}>
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <button className="btn btn-ghost" onClick={() => setFilters({ from: "", to: "", pageUrl: "", deviceType: "" })}>Clear</button>
      </div>

      {statsError ? (
        <ErrorState message={statsError} />
      ) : (
        <div style={s.statsGrid}>
          {statsLoading ? (
            [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={110} radius={16} />)
          ) : (
            <>
              <StatCard label="Total Sessions" value={stats?.totalSessions?.toLocaleString() ?? 0} sub="matching filters" />
              <StatCard label="Bounce Rate" value={`${stats?.bounceRate ?? 0}%`} sub="< 5s sessions" color={stats?.bounceRate > 50 ? "var(--critical)" : "var(--success)"} />
              <StatCard label="Avg Duration" value={formatDuration(stats?.avgDurationMs)} sub="per session" color="var(--info)" />
              <StatCard label="Avg Scroll Depth" value={`${stats?.avgScrollDepthPct ?? 0}%`} sub="how far visitors get" color={stats?.avgScrollDepthPct < 30 ? "var(--warning)" : "var(--success)"} />
              <StatCard label="Conversions" value={stats?.totalConversions ?? 0} sub={`${stats?.conversionRate ?? 0}% conversion rate`} color="var(--success)" />
            </>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={s.cardTitle}>Alerts</h3>
        {alertsLoading ? (
          <Skeleton height={70} radius={8} />
        ) : alerts.length ? (
          <div style={s.alertGrid}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ ...s.alert, borderColor: alert.severity === "critical" ? "var(--critical)" : "var(--warning)" }}>
                <strong>{alert.title}</strong>
                <p style={s.alertText}>{alert.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={s.muted}>No bounce, rage-click, or dead-click spikes detected in the last 7 days.</p>
        )}
      </div>

      <div style={s.row}>
        <div className="card" style={{ flex: 1.2 }}>
          <h3 style={s.cardTitle}>Engagement Breakdown</h3>
          {statsLoading ? (
            <Skeleton height={200} radius={8} style={{ marginTop: 16 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={36}>
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  labelStyle={{ color: "var(--text)" }}
                  formatter={(v) => [`${v}%`, ""]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ flex: 0.8 }}>
          <h3 style={s.cardTitle}>Issues Detected</h3>
          {statsLoading ? (
            <Skeleton height={180} radius={8} style={{ marginTop: 16 }} />
          ) : (
            <div style={s.issuesList}>
              <IssueRow label="Rage Click Sessions" value={stats?.rageClickSessions ?? 0} severity={stats?.rageClickSessions > 0 ? "critical" : "ok"} />
              <IssueRow label="Dead Click Sessions" value={stats?.deadClickSessions ?? 0} severity={stats?.deadClickSessions > 0 ? "warning" : "ok"} />
              <IssueRow label="Low Engagement Rate" value={`${stats?.lowEngagementRate ?? 0}%`} severity={stats?.lowEngagementRate > 30 ? "warning" : "ok"} />
              <IssueRow label="Total Clicks Tracked" value={stats?.totalClicks?.toLocaleString() ?? 0} severity="ok" />
            </div>
          )}
        </div>
      </div>

      {heatmapLoading ? (
        <Skeleton height={360} radius={16} style={{ marginTop: 24 }} />
      ) : (
        <Heatmap points={points} title="Aggregated Page Heatmap" subtitle="Clicks grouped across matching sessions" />
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <div style={s.cardHead}>
          <h3 style={s.cardTitle}>Recent Sessions</h3>
          <Link to="/app/sessions" style={s.link}>View all</Link>
        </div>
        {sessionsLoading ? (
          <div style={s.stack}>{[1, 2, 3].map((i) => <Skeleton key={i} height={48} radius={8} />)}</div>
        ) : sessions.length === 0 ? (
          <p style={s.muted}>No sessions match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Device</th>
                  <th>Duration</th>
                  <th>Scroll</th>
                  <th>Conversions</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id}>
                    <td>
                      <Link to={`/app/sessions/${session._id}`} style={{ color: "var(--accent)" }}>
                        {session.pagePath || safePathname(session.pageUrl)}
                      </Link>
                    </td>
                    <td>{session.deviceType || "unknown"}</td>
                    <td>{formatDuration(session.duration)}</td>
                    <td>{session.maxScrollDepth}%</td>
                    <td>{session.conversions?.length || 0}</td>
                    <td>
                      <div style={s.flagRow}>
                        {session.patterns?.isBounce && <span className="badge badge-critical">bounce</span>}
                        {session.patterns?.hasRageClicks && <span className="badge badge-warning">rage</span>}
                        {session.patterns?.hasDeadClicks && <span className="badge badge-info">dead</span>}
                        {!session.patterns?.isBounce && !session.patterns?.hasRageClicks && !session.patterns?.hasDeadClicks && <span className="badge badge-success">clean</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function IssueRow({ label, value, severity }) {
  const colors = { critical: "var(--critical)", warning: "var(--warning)", ok: "var(--text-soft)" };
  return (
    <div style={s.issueRow}>
      <span style={s.issueLabel}>{label}</span>
      <span style={{ ...s.issueValue, color: colors[severity] }}>{value}</span>
    </div>
  );
}

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}

function safePathname(url) {
  try { return new URL(url).pathname || "/"; } catch { return url || "/"; }
}

const s = {
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 },
  row: { display: "flex", gap: 20, flexWrap: "wrap" },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 12 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  issuesList: { marginTop: 8 },
  issueRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" },
  issueLabel: { fontSize: "0.88rem", color: "var(--text-muted)" },
  issueValue: { fontFamily: "var(--font-display)", fontWeight: 700 },
  alertGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  alert: { border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12, color: "var(--text-soft)" },
  alertText: { margin: "6px 0 0", color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.5 },
  muted: { color: "var(--text-muted)", fontSize: "0.9rem" },
  stack: { display: "flex", flexDirection: "column", gap: 12 },
  link: { fontSize: "0.82rem", color: "var(--accent)" },
  flagRow: { display: "flex", gap: 4, flexWrap: "wrap" },
};
