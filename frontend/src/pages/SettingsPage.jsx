import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../services/api";
import { PageHeader } from "../components/ui/index.jsx";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function SettingsPage() {
  const { user } = useAuth();
  const [regen, setRegen] = useState({ loading: false, newKey: null, error: null });

  async function handleRegenKey() {
    if (!window.confirm("This will invalidate your current API key. All tracker scripts must be updated. Continue?")) return;
    setRegen({ loading: true, newKey: null, error: null });
    try {
      const res = await authApi.regenerateKey();
      setRegen({ loading: false, newKey: res.data.data.apiKey, error: null });
    } catch (err) {
      setRegen({ loading: false, newKey: null, error: err.response?.data?.error || "Failed to regenerate key" });
    }
  }

  const trackerSnippet = `<script
  src="${API_URL.replace("4000", "cdn")}/analytics.js"
  data-api-key="YOUR_API_KEY"
  async
></script>`;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and integration" />

      {/* Account Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={s.cardTitle}>Account</h3>
        <div style={s.infoGrid}>
          <Row label="Name"  value={user?.name} />
          <Row label="Email" value={user?.email} />
          <Row label="Plan"  value={<span style={{ textTransform: "capitalize" }}>{user?.plan}</span>} />
          <Row label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
        </div>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={s.cardTitle}>API Key</h3>
        <p style={s.desc}>
          Your API key authenticates your tracker script. Keep it secret — don't commit it to public repos.
        </p>

        {regen.newKey ? (
          <div>
            <div style={s.keyBox}>
              <code style={s.keyText}>{regen.newKey}</code>
            </div>
            <p style={{ color: "var(--warning)", fontSize: "0.82rem", marginTop: 8 }}>
              ⚠ Save this key now — it will not be shown again. Update your tracker scripts.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ ...s.keyBox, flex: 1 }}>
              <code style={{ ...s.keyText, color: "var(--text-muted)" }}>el_••••••••••••••••••••••••••••••••</code>
            </div>
            <button className="btn btn-danger" onClick={handleRegenKey} disabled={regen.loading}>
              {regen.loading ? "Regenerating…" : "Regenerate Key"}
            </button>
          </div>
        )}
        {regen.error && <p style={{ color: "var(--critical)", fontSize: "0.82rem", marginTop: 8 }}>{regen.error}</p>}
      </div>

      {/* Tracker Snippet */}
      <div className="card">
        <h3 style={s.cardTitle}>Tracker Script</h3>
        <p style={s.desc}>
          Paste this snippet into the <code style={s.code}>&lt;head&gt;</code> of your landing page. Replace <code style={s.code}>YOUR_API_KEY</code> with your actual API key.
        </p>
        <div style={s.snippetBox}>
          <pre style={s.snippet}>{trackerSnippet}</pre>
          <button
            className="btn btn-ghost"
            style={{ position: "absolute", top: 10, right: 10, fontSize: "0.78rem", padding: "4px 10px" }}
            onClick={() => navigator.clipboard?.writeText(trackerSnippet)}
          >
            Copy
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: 10 }}>Custom events (optional)</h4>
          <pre style={{ ...s.snippet, fontSize: "0.78rem" }}>{`// Track a custom conversion event
ExitLens.track('cta_clicked', { button: 'hero_cta' });
ExitLens.track('form_started');`}</pre>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: "0.88rem", color: "var(--text-soft)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const s = {
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 16 },
  desc: { color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16, lineHeight: 1.6 },
  infoGrid: { display: "flex", flexDirection: "column" },
  keyBox: {
    background: "var(--bg)", border: "1px solid var(--border-soft)",
    borderRadius: "var(--radius)", padding: "12px 14px",
    wordBreak: "break-all", minWidth: 0,
  },
  keyText: { color: "var(--success)", fontSize: "0.82rem", fontFamily: "monospace" },
  snippetBox: {
    background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
    position: "relative",
  },
  snippet: {
    color: "var(--text-soft)", fontSize: "0.82rem",
    fontFamily: "monospace", whiteSpace: "pre-wrap",
    lineHeight: 1.7, margin: 0,
  },
  code: { fontFamily: "monospace", color: "var(--accent)", fontSize: "0.9em" },
};
