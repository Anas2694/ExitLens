import React from "react";

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = "var(--accent)" }) {
  return (
    <div style={sc.card}>
      <div style={sc.label}>{label}</div>
      <div style={{ ...sc.value, color }}>{value ?? "—"}</div>
      {sub && <div style={sc.sub}>{sub}</div>}
    </div>
  );
}
const sc = {
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "22px 24px",
  },
  label: { fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 },
  value: { fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800, lineHeight: 1 },
  sub: { fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 },
};

// ── Loading Skeleton ───────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 20, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, var(--bg-card) 25%, var(--bg-hover) 50%, var(--bg-card) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "◎", title, message, action }) {
  return (
    <div style={es.wrap}>
      <div style={es.icon}>{icon}</div>
      <h3 style={es.title}>{title}</h3>
      {message && <p style={es.msg}>{message}</p>}
      {action}
    </div>
  );
}
const es = {
  wrap: { textAlign: "center", padding: "60px 24px" },
  icon: { fontSize: "2.5rem", marginBottom: 16, opacity: 0.4 },
  title: { fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--text-soft)", marginBottom: 8 },
  msg: { fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: 340, margin: "0 auto 20px" },
};

// ── Error State ───────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div style={err.wrap}>
      <div style={err.icon}>⚠</div>
      <p style={err.msg}>{message || "Something went wrong"}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry} style={{ marginTop: 12 }}>Retry</button>}
    </div>
  );
}
const err = {
  wrap: { textAlign: "center", padding: "48px 24px" },
  icon: { fontSize: "2rem", color: "var(--warning)", marginBottom: 12 },
  msg: { color: "var(--text-muted)", fontSize: "0.9rem" },
};

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={ph.wrap}>
      <div>
        <h1 style={ph.title}>{title}</h1>
        {subtitle && <p style={ph.sub}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
const ph = {
  wrap: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  title: { fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--text)", marginBottom: 4 },
  sub: { color: "var(--text-muted)", fontSize: "0.88rem" },
};

// ── Severity Badge ────────────────────────────────────────────────────────────
export function SeverityBadge({ severity }) {
  const map = {
    critical: "badge-critical",
    warning: "badge-warning",
    info: "badge-info",
  };
  return <span className={`badge ${map[severity] || "badge-info"}`}>{severity}</span>;
}

// ── Inline shimmer CSS (inject once) ─────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("el-shimmer")) {
  const style = document.createElement("style");
  style.id = "el-shimmer";
  style.textContent = `@keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }`;
  document.head.appendChild(style);
}
