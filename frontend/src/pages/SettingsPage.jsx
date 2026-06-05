import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authApi, projectsApi } from "../services/api";
import { PageHeader, Skeleton } from "../components/ui/index.jsx";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function SettingsPage() {
  const { user } = useAuth();
  const [regen, setRegen] = useState({ loading: false, newKey: null, error: null });
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    projectsApi.list().then((res) => {
      const list = res.data.data.projects || [];
      setProjects(list);
      setSelectedId(list[0]?._id || "");
    }).catch(() => setProjects([]));
  }, []);

  const selectedProject = projects.find((project) => project._id === selectedId);
  const privacy = selectedProject?.privacy || {};
  const alerts = selectedProject?.alertSettings || {};

  async function handleRegenKey() {
    if (!window.confirm("This will invalidate your current user API key. Continue?")) return;
    setRegen({ loading: true, newKey: null, error: null });
    try {
      const res = await authApi.regenerateKey();
      setRegen({ loading: false, newKey: res.data.data.apiKey, error: null });
    } catch (err) {
      setRegen({ loading: false, newKey: null, error: err.response?.data?.error || "Failed to regenerate key" });
    }
  }

  async function updateProjectSettings(patch) {
    if (!selectedProject) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await projectsApi.update(selectedProject._id, patch);
      const updated = res.data.data.project;
      setProjects((current) => current.map((project) => project._id === updated._id ? updated : project));
      setMessage("Settings saved");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const trackerSnippet = `<script
  src="${API_URL}/cdn/analytics.js"
  data-api-key="YOUR_PROJECT_API_KEY"${privacy.consentMode === "required" ? '\n  data-consent="required"' : ""}
  async
></script>`;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage account, privacy, alerts, and tracker integration" />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={s.cardTitle}>Account</h3>
        <div style={s.infoGrid}>
          <Row label="Name" value={user?.name} />
          <Row label="Email" value={user?.email} />
          <Row label="Plan" value={<span style={{ textTransform: "capitalize" }}>{user?.plan}</span>} />
          <Row label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={s.cardTitle}>Project Settings</h3>
        {projects.length === 0 ? (
          <Skeleton height={48} />
        ) : (
          <select className="form-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ marginBottom: 16 }}>
            {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>
        )}

        {selectedProject && (
          <div style={s.settingsGrid}>
            <div>
              <h4 style={s.sectionTitle}>Privacy Controls</h4>
              <Toggle label="Anonymize IP" checked={privacy.anonymizeIp !== false} onChange={(value) => updateProjectSettings({ privacy: { anonymizeIp: value } })} />
              <Toggle label="Require consent before tracking" checked={privacy.consentMode === "required"} onChange={(value) => updateProjectSettings({ privacy: { consentMode: value ? "required" : "off" } })} />
              <Toggle label="Collect element text" checked={privacy.collectElementText !== false} onChange={(value) => updateProjectSettings({ privacy: { collectElementText: value } })} />
              <NumberSetting label="Retention days" value={privacy.retentionDays || 90} min={7} max={365} onSave={(value) => updateProjectSettings({ privacy: { retentionDays: value } })} />
            </div>
            <div>
              <h4 style={s.sectionTitle}>Alert Thresholds</h4>
              <Toggle label="Enable alerts" checked={alerts.enabled !== false} onChange={(value) => updateProjectSettings({ alertSettings: { enabled: value } })} />
              <NumberSetting label="Bounce rate spike %" value={alerts.bounceRateThreshold || 60} min={0} max={100} onSave={(value) => updateProjectSettings({ alertSettings: { bounceRateThreshold: value } })} />
              <NumberSetting label="Rage click sessions" value={alerts.rageClickThreshold || 5} min={0} max={1000} onSave={(value) => updateProjectSettings({ alertSettings: { rageClickThreshold: value } })} />
              <NumberSetting label="Dead click sessions" value={alerts.deadClickThreshold || 10} min={0} max={1000} onSave={(value) => updateProjectSettings({ alertSettings: { deadClickThreshold: value } })} />
            </div>
          </div>
        )}
        {saving && <p style={s.muted}>Saving...</p>}
        {message && <p style={s.muted}>{message}</p>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={s.cardTitle}>User API Key</h3>
        <p style={s.desc}>This legacy user key authenticates tracker scripts created before project keys existed. Prefer project keys for new installs.</p>
        {regen.newKey ? (
          <div>
            <div style={s.keyBox}><code style={s.keyText}>{regen.newKey}</code></div>
            <p style={s.warning}>Save this key now. It will not be shown again.</p>
          </div>
        ) : (
          <div style={s.keyRow}>
            <div style={{ ...s.keyBox, flex: 1 }}><code style={{ ...s.keyText, color: "var(--text-muted)" }}>el_********************************</code></div>
            <button className="btn btn-danger" onClick={handleRegenKey} disabled={regen.loading}>{regen.loading ? "Regenerating..." : "Regenerate Key"}</button>
          </div>
        )}
        {regen.error && <p style={s.error}>{regen.error}</p>}
      </div>

      <div className="card">
        <h3 style={s.cardTitle}>Tracker Script</h3>
        <p style={s.desc}>Paste this snippet into the head of your landing page. Use the project API key shown when you create or regenerate a project key.</p>
        <div style={s.snippetBox}>
          <pre style={s.snippet}>{trackerSnippet}</pre>
          <button className="btn btn-ghost" style={s.copyButton} onClick={() => navigator.clipboard?.writeText(trackerSnippet)}>Copy</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <h4 style={s.sectionTitle}>Conversion events</h4>
          <pre style={{ ...s.snippet, fontSize: "0.78rem" }}>{`ExitLens.track('cta_clicked', { button: 'hero_cta' });
ExitLens.track('signup_completed');`}</pre>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={s.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function NumberSetting({ label, value, min, max, onSave }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div style={s.numberRow}>
      <label style={s.rowLabel}>{label}</label>
      <input className="form-input" type="number" min={min} max={max} value={local} onChange={(e) => setLocal(e.target.value)} style={{ width: 110 }} />
      <button className="btn btn-ghost" onClick={() => onSave(Number(local))}>Save</button>
    </div>
  );
}

const s = {
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 16 },
  sectionTitle: { fontSize: "0.88rem", color: "var(--text-soft)", marginBottom: 10 },
  desc: { color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16, lineHeight: 1.6 },
  infoGrid: { display: "flex", flexDirection: "column" },
  settingsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 },
  row: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" },
  rowLabel: { fontSize: "0.82rem", color: "var(--text-muted)" },
  rowValue: { fontSize: "0.88rem", color: "var(--text-soft)", fontWeight: 500 },
  toggle: { display: "flex", gap: 10, alignItems: "center", padding: "8px 0", color: "var(--text-soft)", fontSize: "0.88rem" },
  numberRow: { display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  keyRow: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  keyBox: { background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", padding: "12px 14px", wordBreak: "break-all", minWidth: 0 },
  keyText: { color: "var(--success)", fontSize: "0.82rem", fontFamily: "monospace" },
  snippetBox: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, position: "relative" },
  snippet: { color: "var(--text-soft)", fontSize: "0.82rem", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 },
  copyButton: { position: "absolute", top: 10, right: 10, fontSize: "0.78rem", padding: "4px 10px" },
  muted: { color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 10 },
  warning: { color: "var(--warning)", fontSize: "0.82rem", marginTop: 8 },
  error: { color: "var(--critical)", fontSize: "0.82rem", marginTop: 8 },
};
