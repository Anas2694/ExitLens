import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSessions } from "../hooks/useData";
import { sessionsApi } from "../services/api";
import { Skeleton, EmptyState, ErrorState, PageHeader } from "../components/ui/index.jsx";
import { formatDuration, timeAgo } from "../utils/format";

export default function SessionsPage() {
  const [filters, setFilters] = useState({
    isBounce: "",
    from: "",
    to: "",
    pageUrl: "",
    deviceType: "",
    referrerDomain: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const activeFilters = { ...cleanFilters(debouncedFilters), page, limit: 20 };
  const { sessions, pagination, loading, error } = useSessions(activeFilters);
  const hasFilters = Object.values(filters).some(Boolean);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ isBounce: "", from: "", to: "", pageUrl: "", deviceType: "", referrerDomain: "" });
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 350);
    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle={`${pagination?.total ?? 0} total sessions tracked`}
        action={
          <div style={s.actions}>
            <a className="btn btn-ghost" href={sessionsApi.exportUrl({ ...cleanFilters(filters), format: "csv" })}>Export CSV</a>
            <a className="btn btn-ghost" href={sessionsApi.exportUrl({ ...cleanFilters(filters), format: "pdf" })}>Export PDF</a>
          </div>
        }
      />

      <div style={s.filterBar}>
        <select className="form-input" value={filters.isBounce} onChange={(e) => updateFilter("isBounce", e.target.value)}>
          <option value="">All sessions</option>
          <option value="true">Bounces only</option>
          <option value="false">Non-bounces</option>
        </select>
        <select className="form-input" value={filters.deviceType} onChange={(e) => updateFilter("deviceType", e.target.value)}>
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <DateFilter value={filters.from} placeholder="From DD MM YY" onChange={(value) => updateFilter("from", value)} />
        <DateFilter value={filters.to} placeholder="To DD MM YY" onChange={(value) => updateFilter("to", value)} />
        <input className="form-input" placeholder="Page URL contains" value={filters.pageUrl} onChange={(e) => updateFilter("pageUrl", e.target.value)} />
        <input className="form-input" placeholder="Referrer domain" value={filters.referrerDomain} onChange={(e) => updateFilter("referrerDomain", e.target.value)} />
        {hasFilters && <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>}
      </div>

      <div className="card">
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <div style={s.stack}>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={52} radius={8} />)}</div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon="."
            title={hasFilters ? "No sessions match these filters" : "No sessions found"}
            message={hasFilters ? "Try clearing filters to see all sessions." : "Sessions will appear once visitors interact with your tracked page."}
            action={hasFilters ? <button className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button> : null}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Page URL</th>
                    <th>Device</th>
                    <th>Referrer</th>
                    <th>Duration</th>
                    <th>Scroll</th>
                    <th>Clicks</th>
                    <th>Conversions</th>
                    <th>Flags</th>
                    <th>When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session._id}>
                      <td style={s.ellipsis}><span title={session.pageUrl}>{session.pagePath || safePathname(session.pageUrl)}</span></td>
                      <td>{session.deviceType || "unknown"}</td>
                      <td style={s.ellipsis}>{session.referrerDomain || "-"}</td>
                      <td>{formatDuration(session.duration)}</td>
                      <td>
                        <div style={s.scrollWrap}>
                          <div style={s.scrollBar}>
                            <div style={{
                              ...s.scrollFill,
                              width: `${session.maxScrollDepth}%`,
                              background: session.maxScrollDepth > 75 ? "var(--success)" : session.maxScrollDepth > 40 ? "var(--accent)" : "var(--warning)",
                            }} />
                          </div>
                          <span style={s.scrollText}>{session.maxScrollDepth}%</span>
                        </div>
                      </td>
                      <td>{session.totalClicks ?? 0}</td>
                      <td>{session.conversions?.length || 0}</td>
                      <td><Flags session={session} /></td>
                      <td style={s.when}>{timeAgo(session.createdAt)}</td>
                      <td><Link to={`/app/sessions/${session._id}`} className="btn btn-ghost" style={s.viewButton}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination?.pages > 1 && (
              <div style={s.pagination}>
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span style={s.pageText}>Page {page} of {pagination.pages}</span>
                <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Flags({ session }) {
  return (
    <div style={s.flags}>
      {session.patterns?.isBounce && <span className="badge badge-critical">bounce</span>}
      {session.patterns?.hasRageClicks && <span className="badge badge-warning">rage</span>}
      {session.patterns?.hasDeadClicks && <span className="badge badge-info">dead clicks</span>}
      {session.patterns?.isLowEngagement && !session.patterns?.isBounce && <span className="badge badge-warning">low engage</span>}
      {!session.patterns?.isBounce && !session.patterns?.hasRageClicks && !session.patterns?.hasDeadClicks && !session.patterns?.isLowEngagement && <span className="badge badge-success">clean</span>}
    </div>
  );
}

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}

function DateFilter({ value, placeholder, onChange }) {
  return (
    <input
      className="form-input"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ maxWidth: 150 }}
    />
  );
}

function safePathname(url) {
  try { return new URL(url).pathname || "/"; } catch { return url || "/"; }
}

const s = {
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  filterBar: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  stack: { display: "flex", flexDirection: "column", gap: 12 },
  ellipsis: { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-soft)" },
  scrollWrap: { display: "flex", alignItems: "center", gap: 8 },
  scrollBar: { width: 80, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" },
  scrollFill: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  scrollText: { fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 32 },
  flags: { display: "flex", gap: 4, flexWrap: "wrap" },
  when: { whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.85rem" },
  viewButton: { padding: "6px 12px", fontSize: "0.8rem" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "16px 0 0", borderTop: "1px solid var(--border)" },
  pageText: { color: "var(--text-muted)", fontSize: "0.85rem" },
};
