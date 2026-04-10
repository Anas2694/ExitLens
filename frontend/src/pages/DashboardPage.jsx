import React from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useStats, useSessions } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { StatCard, Skeleton, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { formatDuration } from "../utils/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, loading: statsLoading, error: statsError } = useStats();
  const { sessions, loading: sessionsLoading } = useSessions({ limit: 5 });

  const barData = stats ? [
    { name: "Bounced",       value: stats.bounceRate || 0,         color: "var(--critical)" },
    { name: "Low Engage",    value: stats.lowEngagementRate || 0,  color: "var(--warning)"  },
    { name: "Avg Scroll %",  value: stats.avgScrollDepthPct || 0,  color: "var(--info)"     },
  ] : [];

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(" ")[0]} ✦`}
        subtitle="Here's what your landing page visitors are doing"
      />

      {/* Stats Row */}
      {statsError ? (
        <ErrorState message={statsError} />
      ) : (
        <div style={s.statsGrid}>
          {statsLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} height={110} radius={16} />)
          ) : (
            <>
              <StatCard
                label="Total Sessions"
                value={stats?.totalSessions?.toLocaleString() ?? 0}
                sub="all time"
              />
              <StatCard
                label="Bounce Rate"
                value={`${stats?.bounceRate ?? 0}%`}
                sub="< 5s sessions"
                color={stats?.bounceRate > 50 ? "var(--critical)" : "var(--success)"}
              />
              <StatCard
                label="Avg Session Duration"
                value={formatDuration(stats?.avgDurationMs)}
                sub="across all sessions"
                color="var(--info)"
              />
              <StatCard
                label="Avg Scroll Depth"
                value={`${stats?.avgScrollDepthPct ?? 0}%`}
                sub="how far they get"
                color={stats?.avgScrollDepthPct < 30 ? "var(--warning)" : "var(--success)"}
              />
            </>
          )}
        </div>
      )}

      <div style={s.row}>
        {/* Chart */}
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
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rage clicks card */}
        <div className="card" style={{ flex: 0.8 }}>
          <h3 style={s.cardTitle}>Issues Detected</h3>
          {statsLoading ? (
            <Skeleton height={180} radius={8} style={{ marginTop: 16 }} />
          ) : (
            <div style={s.issuesList}>
              <IssueRow
                label="Rage Click Sessions"
                value={stats?.rageClickSessions ?? 0}
                severity={stats?.rageClickSessions > 0 ? "critical" : "ok"}
              />
              <IssueRow
                label="Low Engagement Sessions"
                value={`${stats?.lowEngagementRate ?? 0}%`}
                severity={stats?.lowEngagementRate > 30 ? "warning" : "ok"}
              />
              <IssueRow
                label="Total Clicks Tracked"
                value={stats?.totalClicks?.toLocaleString() ?? 0}
                severity="ok"
              />
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={s.cardTitle}>Recent Sessions</h3>
          <Link to="/app/sessions" style={{ fontSize: "0.82rem", color: "var(--accent)" }}>View all →</Link>
        </div>
        {sessionsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={48} radius={8} />)}
          </div>
        ) : sessions.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No sessions yet. Add the tracker script to your landing page to start collecting data.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Duration</th>
                  <th>Scroll</th>
                  <th>Bounce</th>
                  <th>Rage Clicks</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link to={`/app/sessions/${s._id}`} style={{ color: "var(--accent)" }}>
                        {s.pageUrl ? new URL(s.pageUrl).pathname : "/"}
                      </Link>
                    </td>
                    <td>{formatDuration(s.duration)}</td>
                    <td>{s.maxScrollDepth}%</td>
                    <td>
                      <span className={`badge ${s.patterns?.isBounce ? "badge-critical" : "badge-success"}`}>
                        {s.patterns?.isBounce ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      {s.patterns?.hasRageClicks ? (
                        <span className="badge badge-warning">⚡ Yes</span>
                      ) : "—"}
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: colors[severity] }}>{value}</span>
    </div>
  );
}

const s = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  row: { display: "flex", gap: 20, flexWrap: "wrap" },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 4 },
  issuesList: { marginTop: 8 },
};
