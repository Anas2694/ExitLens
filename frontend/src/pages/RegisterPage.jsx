import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await register(form.name, form.email, form.password);
      setApiKey(res.data.apiKey);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ ...s.dot, margin: "0 auto 20px" }} />
          <h2 style={s.title}>🎉 Account created!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
            Save your API key below — <strong style={{ color: "var(--warning)" }}>it will only be shown once.</strong>
          </p>
          <div style={s.keyBox}>
            <code style={s.keyText}>{apiKey}</code>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 24 }}>
            Add this to your landing page tracker script:
            <br />
            <code style={{ color: "var(--accent)", fontSize: "0.8rem" }}>data-api-key="{apiKey}"</code>
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.dot} />
          <h1 style={s.logo}>ExitLens</h1>
        </div>
        <h2 style={s.title}>Create your account</h2>
        <p style={s.sub}>Start understanding why users leave your page</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Ada Lovelace"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required minLength={2} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@company.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 8 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={8} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
            {loading ? "Creating account…" : "Create Free Account"}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)", padding: 20, position: "relative", overflow: "hidden",
  },
  glow: {
    position: "absolute", width: 600, height: 600, borderRadius: "50%",
    top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(91,127,255,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "40px 36px",
    width: "100%", maxWidth: 420, position: "relative", zIndex: 1,
    boxShadow: "var(--shadow)",
  },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 28 },
  dot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)", boxShadow: "0 0 10px var(--accent)",
  },
  logo: { fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" },
  title: { fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--text)", marginBottom: 6 },
  sub: { color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  footer: { textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 24 },
  keyBox: {
    background: "var(--bg)", border: "1px solid var(--border-soft)",
    borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16,
    wordBreak: "break-all",
  },
  keyText: { color: "var(--success)", fontSize: "0.82rem", fontFamily: "monospace" },
};
