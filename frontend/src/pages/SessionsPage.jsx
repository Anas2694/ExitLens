import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSessions } from "../hooks/useData";
import { Skeleton, EmptyState, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { formatDuration, timeAgo } from "../utils/format";

export default function SessionsPage() {
  const [bounce, setBounce] = useState("");
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [page, setPage]     = useState(1);

  // Build clean filter object — only include keys that have real values
  const filters = { page, limit: 20 };
  if (bounce !== "")  filters.isBounce = bounce;
  if (from !== "")    filters.from = from;
  if (to !== "")      filters.to = to;

  const { sessions, pagination, loading, error } = useSessions(filters);

  function handleBounce(e) {
    setBounce(e.target.value);
    setPage(1);
  }

  function handleFrom(e) {
    setFrom(e.target.value);
    setPage(1);
  }

  function handleTo(e) {
    setTo(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setBounce("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = bounce !== "" || from !== "" || to !== "";

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle={`${pagination?.total ?? 0} total sessions tracked`}
      />

      {/* Filters */}
      <div style={s.filterBar}>
        <select
          className="form-input"
          style={{ width: "auto", minWidth: 140 }}
          value={bounce}
          onChange={handleBounce}
        >
          <option value="">All sessions</option>
          <option value="true">Bounces only</option>
          <option value="false">Non-bounces</option>
        </select>

        <div style={s.dateGroup}>
  <label style={s.dateLabel}>From</label>
  <input
    type="date"
    style={{
      width: "auto",
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #444",
      background: "#1a1a1a",
      color: "#fff",
      cursor: "pointer",
      position: "relative",
      zIndex: 10
    }}
    value={from}
    onChange={handleFrom}
    max={to || undefined}
  />
</div>

<div style={s.dateGroup}>
  <label style={s.dateLabel}>To</label>
  <input
    type="date"
    style={{
      width: "auto",
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #444",
      background: "#1a1a1a",
      color: "#fff",
      cursor: "pointer",
      position: "relative",
      zIndex: 10
    }}
    value={to}
    onChange={handleTo}
    min={from || undefined}
  />
</div>

        {hasFilters && (
          <button
            className="btn btn-ghost"
            onClick={clearFilters}
            style={{ fontSize: "0.82rem", color: "var(--critical)" }}
          >
            ✕ Clear filters
          </button>
        )}

        {/* Active filter indicators */}
        {hasFilters && (
          <div style={s.activeFilters}>
            {bounce === "true"  && <span className="badge badge-critical">Bounces only</span>}
            {bounce === "false" && <span className="badge badge-success">Non-bounces</span>}
            {from && <span className="badge badge-info">From: {from}</span>}
            {to   && <span className="badge badge-info">To: {to}</span>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} height={52} radius={8} />)}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon="◈"
            title={hasFilters ? "No sessions match these filters" : "No sessions found"}
            message={hasFilters ? "Try clearing filters to see all sessions." : "Sessions will appear here once visitors interact with your tracked page."}
            action={hasFilters ? (
              <button className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button>
            ) : null}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Page URL</th>
                    <th>Duration</th>
                    <th>Scroll</th>
                    <th>Clicks</th>
                    <th>Flags</th>
                    <th>When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session._id}>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span title={session.pageUrl} style={{ color: "var(--text-soft)" }}>
                          {session.pageUrl ? safePathname(session.pageUrl) : "/"}
                        </span>
                      </td>
                      <td>{formatDuration(session.duration)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={s.scrollBar}>
                            <div style={{
                              ...s.scrollFill,
                              width: `${session.maxScrollDepth}%`,
                              background: session.maxScrollDepth > 75
                                ? "var(--success)"
                                : session.maxScrollDepth > 40
                                ? "var(--accent)"
                                : "var(--warning)",
                            }} />
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 32 }}>
                            {session.maxScrollDepth}%
                          </span>
                        </div>
                      </td>
                      <td>{session.totalClicks ?? 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {session.patterns?.isBounce && (
                            <span className="badge badge-critical">bounce</span>
                          )}
                          {session.patterns?.hasRageClicks && (
                            <span className="badge badge-warning">⚡ rage</span>
                          )}
                          {session.patterns?.hasDeadClicks && (
                            <span className="badge badge-info">dead clicks</span>
                          )}
                          {session.patterns?.isLowEngagement && !session.patterns?.isBounce && (
                            <span className="badge badge-warning">low engage</span>
                          )}
                          {!session.patterns?.isBounce &&
                           !session.patterns?.hasRageClicks &&
                           !session.patterns?.hasDeadClicks &&
                           !session.patterns?.isLowEngagement && (
                            <span className="badge badge-success">✓ clean</span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {timeAgo(session.createdAt)}
                      </td>
                      <td>
                        <Link
                          to={`/app/sessions/${session._id}`}
                          className="btn btn-ghost"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination?.pages > 1 && (
              <div style={s.pagination}>
                <button
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Page {page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function safePathname(url) {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

const s = {
  filterBar: {
    display: "flex", gap: 12, marginBottom: 20,
    flexWrap: "wrap", alignItems: "center",
  },
  dateGroup: {
    display: "flex", alignItems: "center", gap: 8,
  },
  dateLabel: {
    fontSize: "0.8rem", color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },
  activeFilters: {
    display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
  },
  scrollBar: {
    width: 80, height: 6, background: "var(--border)",
    borderRadius: 3, overflow: "hidden",
  },
  scrollFill: {
    height: "100%", borderRadius: 3, transition: "width 0.3s",
  },
  pagination: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 16, padding: "16px 0 0",
    borderTop: "1px solid var(--border)",
  },
};
