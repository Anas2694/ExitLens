import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { projectsApi } from "../services/api";
import { PageHeader, Skeleton, EmptyState, ErrorState } from "../components/ui/index.jsx";

const PROJECT_COLORS = [
  "#5b7fff", "#ff5c5c", "#4ade80", "#ffb347",
  "#a78bfa", "#38bdf8", "#fb7185", "#34d399",
];

export default function ProjectsPage() {
    console.log("NEW VERSION LOADED"); 
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [newKey, setNewKey]       = useState(null); // shown after create
  const [form, setForm]           = useState({ name: "", domain: "", description: "", color: "#5b7fff" });
  const [creating, setCreating]   = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    projectsApi.list()
      .then(res => setProjects(res.data.data.projects))
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    setCreating(true);
    setFormError("");
    try {
      const res = await projectsApi.create(form);
      setNewKey({ key: res.data.data.apiKey, project: res.data.data.project });
      setShowForm(false);
      setForm({ name: "", domain: "", description: "", color: "#5b7fff" });
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this project? All sessions will remain but unlinked.")) return;
    await projectsApi.delete(id).catch(() => {});
    load();
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Each project tracks a separate website or landing page"
        action={
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setNewKey(null); }}>
            + New Project
          </button>
        }
      />

      {/* New API key display */}
      {newKey && (
        <div style={s.keyAlert}>
          <div style={s.keyAlertTitle}>
            ✅ Project "{newKey.project.name}" created — save your API key now!
          </div>
          <div style={s.keyBox}>
            <code style={s.keyText}>{newKey.key}</code>
          </div>
          <p style={{ color: "var(--warning)", fontSize: "0.82rem", marginTop: 8 }}>
            ⚠ This key will NOT be shown again. Add it to your tracker script.
          </p>
          <div style={s.snippet}>
            <code style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>
             {`<script src="https://exitlens.onrender.com/cdn/analytics.js" data-api-key="${newKey.key}" async></script>`}
            </code>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setNewKey(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={s.cardTitle}>New Project</h3>
          <form onSubmit={handleCreate} style={s.form}>
            <div style={s.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Project Name *</label>
                <input className="form-input" placeholder="My Landing Page"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required maxLength={100} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Domain</label>
                <input className="form-input" placeholder="mysite.com"
                  value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
                  maxLength={253} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="What is this project tracking?"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                maxLength={300} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: c, border: form.color === c ? "3px solid white" : "3px solid transparent",
                      cursor: "pointer", outline: form.color === c ? `2px solid ${c}` : "none",
                    }} />
                ))}
              </div>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create Project"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects list */}
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <div style={s.grid}>
          {[1,2,3].map(i => <Skeleton key={i} height={160} radius={16} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="◈"
            title="No projects yet"
            message="Create your first project to start tracking a website."
            action={
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                + Create First Project
              </button>
            }
          />
        </div>
      ) : (
        <div style={s.grid}>
          {projects.map(project => (
            <ProjectCard key={project._id} project={project} onDelete={handleDelete} onReload={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onDelete, onReload }) {
  const [regenKey, setRegenKey] = useState(null);
  const [stats, setStats]       = useState(null);

  useEffect(() => {
    projectsApi.stats(project._id)
      .then(res => setStats(res.data.data.stats))
      .catch(() => {});
  }, [project._id]);

  async function handleRegen() {
    if (!window.confirm("Regenerate API key? Your current tracker script will stop working.")) return;
    const res = await projectsApi.regenerateKey(project._id);
    setRegenKey(res.data.data.apiKey);
  }

  return (
    <div className="card" style={{ borderTop: `3px solid ${project.color || "var(--accent)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 4 }}>
            {project.name}
          </h3>
          {project.domain && (
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {project.domain}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={handleRegen}>
            🔑 New Key
          </button>
          <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => onDelete(project._id)}>
            Delete
          </button>
        </div>
      </div>

      {project.description && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>
          {project.description}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div style={s.statsRow}>
          <StatMini label="Sessions"   value={stats.totalSessions ?? 0} />
          <StatMini label="Bounce"     value={`${stats.bounceRate ?? 0}%`} />
          <StatMini label="Converted"  value={`${stats.conversionRate ?? 0}%`} />
        </div>
      )}

      {/* Regen key display */}
      {regenKey && (
        <div style={{ marginTop: 12 }}>
          <div style={s.keyBox}>
            <code style={s.keyText}>{regenKey}</code>
          </div>
          <p style={{ color: "var(--warning)", fontSize: "0.75rem", marginTop: 4 }}>
            Save this — not shown again
          </p>
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <Link
          to={`/app/sessions?projectId=${project._id}`}
          className="btn btn-ghost"
          style={{ fontSize: "0.8rem", flex: 1, justifyContent: "center" }}>
          View Sessions →
        </Link>
      </div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

const s = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text)", marginBottom: 16 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  statsRow: {
    display: "flex", justifyContent: "space-around",
    padding: "12px 0", borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)", margin: "12px 0",
  },
  keyAlert: {
    background: "rgba(74,222,128,0.06)",
    border: "1px solid rgba(74,222,128,0.25)",
    borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 24,
  },
  keyAlertTitle: { fontWeight: 600, color: "var(--success)", marginBottom: 12, fontSize: "0.9rem" },
  keyBox: {
    background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "10px 14px", wordBreak: "break-all",
  },
  keyText: { color: "var(--success)", fontSize: "0.78rem", fontFamily: "monospace" },
  snippet: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "10px 14px",
    marginTop: 8, wordBreak: "break-all",
  },
};